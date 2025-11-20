use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct FileLocator {
    workspace_path: PathBuf,
}

impl FileLocator {
    pub fn new<P: AsRef<Path>>(workspace_path: P) -> Self {
        Self {
            workspace_path: workspace_path.as_ref().to_path_buf(),
        }
    }

    /// Find a TypeScript file containing the specified class
    /// Uses a two-phase approach:
    /// 1. If file path is provided in the search, use it directly
    /// 2. Otherwise, search the workspace for a class matching the class name
    pub fn find_class(&self, class_name: &str) -> Result<Option<String>, std::io::Error> {
        // Search the workspace for files containing the class
        for entry in WalkDir::new(&self.workspace_path)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| self.should_include_entry(e))
        {
            let entry = entry?;
            let path = entry.path();

            // Only process TypeScript files
            if !self.is_typescript_file(path) {
                continue;
            }

            // Read file content and search for class definition
            if let Ok(content) = fs::read_to_string(path) {
                if self.contains_class(&content, class_name) {
                    return Ok(Some(path.to_string_lossy().to_string()));
                }
            }
        }

        Ok(None)
    }

    /// Check if the file is a TypeScript file
    fn is_typescript_file(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == "ts" || ext == "tsx")
            .unwrap_or(false)
    }

    /// Check if a file entry should be included in the search
    fn should_include_entry(&self, entry: &walkdir::DirEntry) -> bool {
        let path = entry.path();
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

        // Skip common directories that should be ignored
        let skip_dirs = [
            "node_modules",
            "dist",
            "out",
            "build",
            ".git",
            ".vscode",
            "target",
            "coverage",
        ];

        for skip_dir in &skip_dirs {
            if path.components().any(|c| c.as_os_str() == *skip_dir) {
                return false;
            }
        }

        // Skip hidden files and directories
        if file_name.starts_with('.') && file_name != "." {
            return false;
        }

        true
    }

    /// Check if file content contains a class definition
    /// Uses simple regex-like pattern matching for performance
    fn contains_class(&self, content: &str, class_name: &str) -> bool {
        // Look for class declarations, exports, and decorators
        let patterns = [
            format!("class {}", class_name),
            format!("class {} ", class_name),
            format!("class {}\n", class_name),
            format!("class {} {{", class_name),
            format!("export class {}", class_name),
            format!("export default class {}", class_name),
        ];

        patterns.iter().any(|pattern| content.contains(pattern))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contains_class() {
        let locator = FileLocator::new(".");

        let content = "export class MyComponent { }";
        assert!(locator.contains_class(content, "MyComponent"));

        let content = "class MyService implements IService { }";
        assert!(locator.contains_class(content, "MyService"));

        let content = "export default class MyClass { }";
        assert!(locator.contains_class(content, "MyClass"));

        let content = "const MyClass = () => { }";
        assert!(!locator.contains_class(content, "MyClass"));
    }
}
