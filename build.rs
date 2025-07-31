use std::{fs, path::Path, process::Command};

const OUTPUT_PATH: &str = "./minified";
const INPUT_PATHS: &[&str] = &["assets", "templates"];

fn main() {
    println!("cargo::rerun-if-changed=build.rs");

    // Check if 'minify' exists.
    if Command::new("minify").arg("--version").output().is_err() {
        panic!("\x1b[1;31m'minify' not installed (https://github.com/tdewolff/minify)\x1b[0m");
    }

    let output_path = Path::new(OUTPUT_PATH);
    // Delete previous `OUTPUT_PATH` directory to avoid overwriting issues (probably).
    if output_path.is_dir() {
        fs::remove_dir_all(output_path).unwrap();
    }

    for input_path in INPUT_PATHS {
        println!("cargo::rerun-if-changed={}", input_path);

        let input_path = Path::new(input_path);
        if !input_path.is_dir() {
            panic!(
                "\x1b[1;31mInput path should be a directory: {}\x1b[0m",
                input_path.to_str().unwrap()
            );
        }

        Command::new("minify")
            .arg("--sync")
            .arg("--recursive")
            .arg(input_path.to_str().unwrap())
            .arg("--output")
            .arg(output_path.to_str().unwrap())
            .output()
            .unwrap();
    }
}
