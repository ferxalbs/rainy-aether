//! Workspace analysis tools
//!
//! Tools for analyzing project structure and finding code

use crate::agents::executor::Tool;
use async_trait::async_trait;
use serde::Deserialize;
use std::time::Duration;
use walkdir::WalkDir;

/// Workspace structure tool
pub struct WorkspaceStructureTool;

#[async_trait]
impl Tool for WorkspaceStructureTool {
    fn name(&self) -> &str {
        "workspace_structure"
    }

    fn description(&self) -> &str {
        "Get the structure of the workspace/project directory"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the workspace root"
                },
                "max_depth": {
                    "type": "number",
                    "description": "Maximum depth to traverse",
                    "default": 3
                }
            },
            "required": ["path"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: WorkspaceStructureArgs = serde_json::from_value(params)?;
        let max_depth = args.max_depth.unwrap_or(3);

        let mut structure = Vec::new();

        for entry in WalkDir::new(&args.path)
            .max_depth(max_depth)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            let metadata = entry.metadata()?;

            // Skip hidden files and common ignore patterns
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if name_str.starts_with('.') || name_str == "node_modules" || name_str == "target" {
                    continue;
                }
            }

            structure.push(serde_json::json!({
                "path": path.to_string_lossy(),
                "is_dir": metadata.is_dir(),
                "is_file": metadata.is_file(),
                "depth": entry.depth()
            }));
        }

        Ok(serde_json::json!({
            "workspace_path": args.path,
            "structure": structure
        }))
    }

    fn is_cacheable(&self) -> bool {
        true
    }

    fn cache_ttl(&self) -> Duration {
        Duration::from_secs(300) // 5 minutes
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(15))
    }
}

#[derive(Deserialize)]
struct WorkspaceStructureArgs {
    path: String,
    max_depth: Option<usize>,
}

/// Search files tool
pub struct SearchFilesTool;

#[async_trait]
impl Tool for SearchFilesTool {
    fn name(&self) -> &str {
        "search_files"
    }

    fn description(&self) -> &str {
        "Search for files matching a pattern in the workspace"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to search in"
                },
                "pattern": {
                    "type": "string",
                    "description": "File name pattern to match (glob)"
                }
            },
            "required": ["path", "pattern"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: SearchFilesArgs = serde_json::from_value(params)?;

        let mut matches = Vec::new();

        for entry in WalkDir::new(&args.path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();

            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();

                // Simple pattern matching (could use glob crate for more sophisticated matching)
                if name_str.contains(&args.pattern) {
                    matches.push(serde_json::json!({
                        "path": path.to_string_lossy(),
                        "name": name_str
                    }));
                }
            }
        }

        Ok(serde_json::json!({
            "search_path": args.path,
            "pattern": args.pattern,
            "matches": matches,
            "count": matches.len()
        }))
    }

    fn is_cacheable(&self) -> bool {
        true
    }

    fn cache_ttl(&self) -> Duration {
        Duration::from_secs(60)
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(20))
    }
}

#[derive(Deserialize)]
struct SearchFilesArgs {
    path: String,
    pattern: String,
}
