// TODO: figure out a better way to minify shit
use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
};

use minifier::{css, js};
use walkdir::WalkDir;

const CSS: &str = include_str!("../assets/css/style.css");
const JS: &str = include_str!("../assets/scripts/countdown.js");

const OUTPUT_PATH: &str = "assets-minified";
const CSS_OUTPUT_PATH: &str = "assets-minified/css/style.css";
const JS_OUTPUT_PATH: &str = "assets-minified/scripts/countdown.js";

#[must_use]
pub fn minify_js_and_css() -> Result<(), Box<dyn Error>> {
    let css_minified = css::minify(CSS)?.to_string();
    let js_minified = js::minify(JS).to_string();
    let output_path = Path::new(OUTPUT_PATH);

    fs::create_dir_all(output_path.join("css"))?;
    fs::create_dir_all(output_path.join("scripts"))?;
    fs::write(JS_OUTPUT_PATH, js_minified)?;
    fs::write(CSS_OUTPUT_PATH, css_minified)?;

    WalkDir::new("assets")
        .into_iter()
        .filter_map(|entry| entry.ok())
        .try_for_each(|p| -> Result<(), Box<dyn Error>> {
            let path = p.path();
            if let Some(e) = path.extension() {
                if let Some(ext) = e.to_str() {
                    if ext != "css" && ext != "js" {
                        let new_path =
                            output_path.join(PathBuf::from_iter(path.components().skip(1)));
                        fs::create_dir_all(new_path.parent().ok_or("File has no parent")?)?;
                        fs::File::create(&new_path)?;
                        fs::copy(path, new_path)?;
                    }
                }
            }
            Ok(())
        })?;
    Ok(())
}
