use std::{fs, path::Path, process::Command};

const OUTPUT_PATH: &str = "./dist";
const ESBUILD_PATHS: &[&str] = &["assets/scripts", "assets/css", "assets/favicons"];
const MINIFY_PATHS: &[&str] = &["templates"];

/// Build script that uses 'esbuild' and 'minify' to compile & minify js, css, html, etc. Chose
/// 'esbuild' so that it can compile js modules into one file, and 'minify' to minify the html
/// templates.
fn main() {
    println!("cargo::rerun-if-changed=build.rs");

    let _ = vec!["assets", "templates"]
        .iter()
        .map(|p| println!("cargo::rerun-if-changed={}", p))
        .collect::<Vec<_>>();

    // Check if programs exists
    if Command::new("esbuild").arg("--version").output().is_err() {
        panic!("\x1b[1;31m'esbuild' not installed (https://esbuild.github.io/)\x1b[0m");
    }
    if Command::new("minify").arg("--version").output().is_err() {
        panic!("\x1b[1;31m'minify' not installed (https://github.com/tdewolff/minify)\x1b[0m");
    }

    let output_path = Path::new(OUTPUT_PATH);
    // Delete previous `OUTPUT_PATH` directory to avoid overwriting issues (probably).
    if output_path.is_dir() {
        fs::remove_dir_all(output_path).unwrap();
    }

    Command::new("esbuild")
        .args(ESBUILD_PATHS.iter().map(|p| format!("{}/*", p)))
        .arg("--bundle")
        .arg("--minify")
        .arg("--target=es2020")
        .arg("--loader:.png=file")
        .arg("--loader:.ico=file")
        .arg("--loader:.svg=text")
        .arg("--loader:.webmanifest=text")
        .arg(format!("--outdir={}/assets", OUTPUT_PATH))
        .output()
        .unwrap();

    Command::new("minify")
        .arg("--recursive")
        .args(MINIFY_PATHS)
        .arg("--output")
        .arg(output_path.to_str().unwrap())
        .output()
        .unwrap();
}
