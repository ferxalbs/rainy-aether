//! Filesystem operation tools
//!
//! Tools for reading, writing, editing, and searching files

use crate::agents::executor::Tool;
use async_trait::async_trait;
use serde::Deserialize;
use std::time::Duration;

/// Read file tool
pub struct ReadFileTool;

#[async_trait]
impl Tool for ReadFileTool {
    fn name(&self) -> &str {
        "read_file"
    }

    fn description(&self) -> &str {
        "Read the contents of a file from the filesystem"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to read"
                }
            },
            "required": ["path"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: ReadFileArgs = serde_json::from_value(params)?;
        let content = tokio::fs::read_to_string(&args.path).await?;

        Ok(serde_json::json!({
            "path": args.path,
            "content": content,
            "size": content.len()
        }))
    }

    fn is_cacheable(&self) -> bool {
        true
    }

    fn cache_ttl(&self) -> Duration {
        Duration::from_secs(30)
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(10))
    }
}

#[derive(Deserialize)]
struct ReadFileArgs {
    path: String,
}

/// Write file tool
pub struct WriteFileTool;

#[async_trait]
impl Tool for WriteFileTool {
    fn name(&self) -> &str {
        "write_file"
    }

    fn description(&self) -> &str {
        "Write content to a file, creating or overwriting it"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to write"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                }
            },
            "required": ["path", "content"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: WriteFileArgs = serde_json::from_value(params)?;
        tokio::fs::write(&args.path, &args.content).await?;

        Ok(serde_json::json!({
            "path": args.path,
            "bytes_written": args.content.len(),
            "success": true
        }))
    }

    fn is_cacheable(&self) -> bool {
        false
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(10))
    }
}

#[derive(Deserialize)]
struct WriteFileArgs {
    path: String,
    content: String,
}

/// List directory tool
pub struct ListDirectoryTool;

#[async_trait]
impl Tool for ListDirectoryTool {
    fn name(&self) -> &str {
        "list_directory"
    }

    fn description(&self) -> &str {
        "List contents of a directory"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the directory to list"
                }
            },
            "required": ["path"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: ListDirectoryArgs = serde_json::from_value(params)?;
        let mut entries = tokio::fs::read_dir(&args.path).await?;
        let mut files = Vec::new();

        while let Some(entry) = entries.next_entry().await? {
            let metadata = entry.metadata().await?;
            files.push(serde_json::json!({
                "name": entry.file_name().to_string_lossy(),
                "is_dir": metadata.is_dir(),
                "is_file": metadata.is_file(),
                "size": metadata.len()
            }));
        }

        Ok(serde_json::json!({
            "path": args.path,
            "entries": files
        }))
    }

    fn is_cacheable(&self) -> bool {
        true
    }

    fn cache_ttl(&self) -> Duration {
        Duration::from_secs(10)
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(5))
    }
}

#[derive(Deserialize)]
struct ListDirectoryArgs {
    path: String,
}
