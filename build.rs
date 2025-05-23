use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use walkdir::WalkDir;

const INPUT_OUTPUT_PATHS: &'static [(&'static str, &'static str)] = &[
    ("assets", "minified/assets"),
    ("templates", "minified/templates"),
];
// const INPUT_PATH: &'static str = "assets";
// const OUTPUT_PATH: &'static str = "minified/assets";

// `minify --list`
const MINIFY_FILE_TYPES: &'static [&'static str] = &[
    "css",         // text/css
    "html",        // text/html
    "js",          // application/javascript
    "svg",         // image/svg+xml
    "webmanifest", // /manifest+json
];

// Run using `cargo build -vv` to see `eprintln(...)` outputs.
fn main() {
    println!("cargo::rerun-if-changed=build.rs");
    for (input_path, _) in INPUT_OUTPUT_PATHS {
        let entries = WalkDir::new(input_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .collect::<Vec<_>>();

        for entry in entries.iter() {
            let path = entry.path();
            if path.is_file() {
                println!("cargo::rerun-if-changed={}", entry.path().display());
            }
        }
    }

    for (input_path, output_path) in INPUT_OUTPUT_PATHS {
        let entries = WalkDir::new(input_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .collect::<Vec<_>>();

        // Check if 'minify' program exists.
        match Command::new("minify").arg("--version").output() {
            Ok(_) => { /* no-op */ }
            Err(_) => {
                panic!("\x1b[1;31m'minify' not installed (https://github.com/tdewolff/minify)\x1b[0m");
            }
        }

        let output_path = Path::new(output_path);
        // Delete previous `OUTPUT_PATH` directory to avoid overwriting issues (I would assume).
        if output_path.is_dir() {
            fs::remove_dir_all(output_path).unwrap();
        }

        // Either create directory, minify file, or copy file to `OUTPUT_PATH`. Follows the exact file
        // structure of the `INPUT_PATH` directory.
        for entry in entries {
            let original_path = entry.path().to_owned();
            let new_path =
                output_path.join(PathBuf::from_iter(original_path.components().skip(1)));

            if original_path.is_dir() {
                fs::create_dir_all(&new_path).unwrap();
                eprintln!("created dir at '{}'", new_path.display());
            } else if original_path.is_file() {
                if let Some(ext) = original_path.extension() {
                    let ext = ext.to_str().unwrap();
                    if MINIFY_FILE_TYPES.contains(&ext) {
                        Command::new("minify")
                            .arg(original_path.to_str().unwrap())
                            .arg("-o")
                            .arg(new_path.to_str().unwrap())
                            .output()
                            .unwrap();
                        eprintln!(
                            "minified '{}' to '{}'",
                            original_path.display(),
                            new_path.display()
                        );
                    } else {
                        fs::File::create(&new_path).unwrap();
                        fs::copy(&original_path, &new_path).unwrap();
                        eprintln!(
                            "copied '{}' to '{}'",
                            original_path.display(),
                            new_path.display()
                        );
                    }
                }
            }
        }
    }
}
