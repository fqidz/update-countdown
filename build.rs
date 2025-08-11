use std::{fs, path::Path, process::Command};

const ESBUILD_PATHS: &[&str] = &["assets/scripts", "assets/css"];
const MINIFY_PATHS: &[&str] = &["templates"];
const FAVICONS_PATH: &str = "assets/favicons";

/// Build script that uses 'esbuild' and 'minify' to compile & minify js, css, html, etc. Chose
/// 'esbuild' so that it can compile js modules into one file, and 'minify' to minify the html
/// templates.
fn main() {
    let output_path = std::env::var("OUTPUT_PATH").unwrap_or_else(|_| "dist".to_string());
    println!("cargo::rerun-if-changed=build.rs");
    println!("cargo::rerun-if-changed={}", output_path);

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

    let output_path = Path::new(&output_path);
    // Delete previous `OUTPUT_PATH` directory to avoid overwriting issues (probably).
    if output_path.is_dir() {
        fs::remove_dir_all(output_path).unwrap();
    }

    Command::new("esbuild")
        .args(ESBUILD_PATHS.iter().map(|p| format!("{}/*", p)))
        .arg("--bundle")
        .arg("--minify")
        .arg("--target=es2020")
        .arg(format!("--outdir={}", &output_path.join("assets").to_str().unwrap()))
        .status()
        .unwrap();

    Command::new("minify")
        .arg("--sync")
        .arg("--recursive")
        .args(MINIFY_PATHS)
        .arg("--output")
        .arg(output_path.to_str().unwrap())
        .status()
        .unwrap();

    // TODO: use walkdir
    Command::new("cp")
        .arg("-r")
        .arg("-t")
        .arg(output_path.join("assets").to_str().unwrap())
        .arg(FAVICONS_PATH)
        .status()
        .unwrap();
}
