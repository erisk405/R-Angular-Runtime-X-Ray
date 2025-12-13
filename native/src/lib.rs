#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;

pub mod comparison;
mod file_locator;
pub mod flame_graph;
mod parser;
pub mod storage;

use file_locator::FileLocator;
use parser::TypeScriptParser;

#[napi(object)]
pub struct FileLocation {
    pub file_path: String,
    pub found: bool,
}

#[napi(object)]
pub struct MethodLocation {
    pub line: u32,
    pub found: bool,
}

/// Locates a TypeScript file containing the specified class
///
/// # Arguments
/// * `class_name` - The name of the class to search for
/// * `workspace_path` - The root workspace path to search in
///
/// # Returns
/// FileLocation with the path and whether it was found
#[napi]
pub fn locate_file(class_name: String, workspace_path: String) -> Result<FileLocation> {
    let locator = FileLocator::new(workspace_path);

    match locator.find_class(&class_name) {
        Ok(Some(path)) => Ok(FileLocation {
            file_path: path,
            found: true,
        }),
        Ok(None) => Ok(FileLocation {
            file_path: String::new(),
            found: false,
        }),
        Err(e) => Err(Error::from_reason(format!("Failed to locate file: {}", e))),
    }
}

/// Parses TypeScript file content to find the line number of a method
///
/// # Arguments
/// * `file_content` - The content of the TypeScript file
/// * `method_name` - The name of the method to locate
///
/// # Returns
/// MethodLocation with the line number and whether it was found
#[napi]
pub fn parse_method(file_content: String, method_name: String) -> Result<MethodLocation> {
    let parser = TypeScriptParser::new();

    match parser.find_method_line(&file_content, &method_name) {
        Ok(Some(line)) => Ok(MethodLocation { line, found: true }),
        Ok(None) => Ok(MethodLocation {
            line: 0,
            found: false,
        }),
        Err(e) => Err(Error::from_reason(format!("Failed to parse method: {}", e))),
    }
}

// Wrapper functions to properly export NAPI functions from modules
#[napi]
pub fn build_flame_graph_data(call_stack_json: String) -> Result<String> {
    flame_graph::build_flame_graph_data(call_stack_json)
}

#[napi]
pub fn compress_snapshot_data(snapshot_json: String) -> Result<Buffer> {
    storage::compress_snapshot_data(snapshot_json)
}

#[napi]
pub fn decompress_snapshot_data(compressed_data: Buffer) -> Result<String> {
    storage::decompress_snapshot_data(compressed_data)
}

#[napi]
pub fn compare_performance_snapshots(
    baseline_json: String,
    current_json: String,
    regression_threshold: f64,
) -> Result<String> {
    comparison::compare_performance_snapshots(baseline_json, current_json, regression_threshold)
}
