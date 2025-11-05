/**
 * File Operations Module
 *
 * High-performance file operations for AI agent tools with security controls,
 * batch processing, and efficient I/O.
 */

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;

/// File read result
#[derive(Debug, Serialize, Deserialize)]
pub struct FileReadResult {
    pub content: String,
    pub lines: usize,
    pub size: usize,
    pub encoding: String,
}

/// File write result
#[derive(Debug, Serialize, Deserialize)]
pub struct FileWriteResult {
    pub success: bool,
    pub bytes_written: usize,
    pub path: String,
}

/// File search result
#[derive(Debug, Serialize, Deserialize)]
pub struct FileSearchResult {
    pub path: String,
    pub matches: usize,
    pub line_numbers: Vec<usize>,
}

/// File edit operation
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum EditOperation {
    Replace {
        search: String,
        replace: String,
        all: Option<bool>,
    },
    Insert {
        line: usize,
        content: String,
    },
    Delete {
        start_line: usize,
        end_line: usize,
    },
}

/// File edit result
#[derive(Debug, Serialize, Deserialize)]
pub struct FileEditResult {
    pub success: bool,
    pub diff: String,
    pub applied_operations: usize,
}

/// Batch read request
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchReadRequest {
    pub files: Vec<String>,
    pub start_line: Option<usize>,
    pub end_line: Option<usize>,
}

/// Batch read result
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchReadResult {
    pub files: Vec<FileReadResult>,
    pub errors: Vec<String>,
}

/// Validate workspace path (security check)
fn validate_workspace_path(workspace_root: &str, path: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(workspace_root);
    let full_path = root.join(path);

    // Canonicalize to resolve symlinks and relative paths
    let canonical_path = full_path
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;

    let canonical_root = root
        .canonicalize()
        .map_err(|e| format!("Invalid workspace root: {}", e))?;

    // Ensure path is within workspace
    if !canonical_path.starts_with(&canonical_root) {
        return Err("Path is outside workspace".to_string());
    }

    // Block traversal attempts
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    Ok(canonical_path)
}

/// Read file with optional line range
#[tauri::command]
pub async fn tool_read_file(
    workspace_root: String,
    path: String,
    start_line: Option<usize>,
    end_line: Option<usize>,
) -> Result<FileReadResult, String> {
    // Validate path
    let full_path = validate_workspace_path(&workspace_root, &path)?;

    // Check if file exists
    if !full_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Check if path is a file
    if !full_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    // Read file
    let content = fs::read_to_string(&full_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Get metadata
    let metadata = fs::metadata(&full_path)
        .await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    // Apply line filtering if needed
    let filtered_content = match (start_line, end_line) {
        (Some(start), Some(end)) => {
            let lines: Vec<&str> = content.lines().collect();
            let start_idx = start.saturating_sub(1);
            let end_idx = end.min(lines.len());

            if start_idx >= lines.len() {
                return Err("Start line exceeds file length".to_string());
            }

            lines[start_idx..end_idx].join("\n")
        }
        (Some(start), None) => {
            let lines: Vec<&str> = content.lines().collect();
            let start_idx = start.saturating_sub(1);

            if start_idx >= lines.len() {
                return Err("Start line exceeds file length".to_string());
            }

            lines[start_idx..].join("\n")
        }
        (None, Some(end)) => {
            let lines: Vec<&str> = content.lines().collect();
            let end_idx = end.min(lines.len());
            lines[0..end_idx].join("\n")
        }
        (None, None) => content.clone(),
    };

    Ok(FileReadResult {
        lines: content.lines().count(),
        size: metadata.len() as usize,
        content: filtered_content,
        encoding: "utf-8".to_string(),
    })
}

/// Write file with optional directory creation
#[tauri::command]
pub async fn tool_write_file(
    workspace_root: String,
    path: String,
    content: String,
    create_dirs: Option<bool>,
) -> Result<FileWriteResult, String> {
    let full_path = validate_workspace_path(&workspace_root, &path)?;

    // Create parent directories if needed
    if create_dirs.unwrap_or(false) {
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create directories: {}", e))?;
        }
    }

    // Write file
    let mut file = fs::File::create(&full_path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(FileWriteResult {
        success: true,
        bytes_written: content.len(),
        path: path.clone(),
    })
}

/// Edit file with multiple operations
#[tauri::command]
pub async fn tool_edit_file(
    workspace_root: String,
    path: String,
    operations: Vec<EditOperation>,
) -> Result<FileEditResult, String> {
    let full_path = validate_workspace_path(&workspace_root, &path)?;

    // Read current content
    let original_content = fs::read_to_string(&full_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let mut content = original_content.clone();
    let mut applied = 0;

    // Apply operations
    for operation in operations {
        match operation {
            EditOperation::Replace { search, replace, all } => {
                if all.unwrap_or(false) {
                    content = content.replace(&search, &replace);
                } else {
                    content = content.replacen(&search, &replace, 1);
                }
                applied += 1;
            }
            EditOperation::Insert { line, content: insert_content } => {
                let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
                let insert_idx = (line as usize).saturating_sub(1).min(lines.len());
                lines.insert(insert_idx, insert_content);
                content = lines.join("\n");
                applied += 1;
            }
            EditOperation::Delete { start_line, end_line } => {
                let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
                let start_idx = (start_line as usize).saturating_sub(1);
                let end_idx = (end_line as usize).min(lines.len());

                if start_idx < lines.len() {
                    lines.drain(start_idx..end_idx);
                    content = lines.join("\n");
                    applied += 1;
                }
            }
        }
    }

    // Generate diff (simple unified diff)
    let diff = generate_diff(&original_content, &content);

    // Write updated content
    fs::write(&full_path, content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(FileEditResult {
        success: true,
        diff,
        applied_operations: applied,
    })
}

/// Delete file or directory
#[tauri::command]
pub async fn tool_delete_file(
    workspace_root: String,
    path: String,
    recursive: Option<bool>,
) -> Result<usize, String> {
    let full_path = validate_workspace_path(&workspace_root, &path)?;

    if !full_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let deleted_items: usize;

    if full_path.is_dir() {
        if recursive.unwrap_or(false) {
            // Count items before deletion
            let mut count = 0;
            for entry in walkdir::WalkDir::new(&full_path) {
                if entry.is_ok() {
                    count += 1;
                }
            }

            fs::remove_dir_all(&full_path)
                .await
                .map_err(|e| format!("Failed to delete directory: {}", e))?;

            deleted_items = count;
        } else {
            fs::remove_dir(&full_path)
                .await
                .map_err(|e| format!("Failed to delete directory (use recursive=true for non-empty): {}", e))?;
            deleted_items = 1;
        }
    } else {
        fs::remove_file(&full_path)
            .await
            .map_err(|e| format!("Failed to delete file: {}", e))?;
        deleted_items = 1;
    }

    Ok(deleted_items)
}

/// Rename file or directory
#[tauri::command]
pub async fn tool_rename_file(
    workspace_root: String,
    old_path: String,
    new_path: String,
) -> Result<String, String> {
    let old_full_path = validate_workspace_path(&workspace_root, &old_path)?;
    let new_full_path = validate_workspace_path(&workspace_root, &new_path)?;

    if !old_full_path.exists() {
        return Err(format!("Source path does not exist: {}", old_path));
    }

    if new_full_path.exists() {
        return Err(format!("Destination path already exists: {}", new_path));
    }

    fs::rename(&old_full_path, &new_full_path)
        .await
        .map_err(|e| format!("Failed to rename: {}", e))?;

    Ok(new_path)
}

/// Copy file or directory
#[tauri::command]
pub async fn tool_copy_file(
    workspace_root: String,
    source_path: String,
    dest_path: String,
    overwrite: Option<bool>,
) -> Result<usize, String> {
    let source_full_path = validate_workspace_path(&workspace_root, &source_path)?;
    let dest_full_path = validate_workspace_path(&workspace_root, &dest_path)?;

    if !source_full_path.exists() {
        return Err(format!("Source path does not exist: {}", source_path));
    }

    if dest_full_path.exists() && !overwrite.unwrap_or(false) {
        return Err(format!("Destination path already exists: {}", dest_path));
    }

    let mut copied_items = 0;

    if source_full_path.is_dir() {
        // Copy directory recursively
        copy_dir_recursive(&source_full_path, &dest_full_path).await?;
        // Count items
        for entry in walkdir::WalkDir::new(&dest_full_path) {
            if entry.is_ok() {
                copied_items += 1;
            }
        }
    } else {
        // Copy single file
        fs::copy(&source_full_path, &dest_full_path)
            .await
            .map_err(|e| format!("Failed to copy file: {}", e))?;
        copied_items = 1;
    }

    Ok(copied_items)
}

/// Batch read multiple files
#[tauri::command]
pub async fn tool_batch_read_files(
    workspace_root: String,
    request: BatchReadRequest,
) -> Result<BatchReadResult, String> {
    let mut results = Vec::new();
    let mut errors = Vec::new();

    // Limit concurrent reads
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(10));

    let tasks: Vec<_> = request
        .files
        .into_iter()
        .map(|path| {
            let workspace = workspace_root.clone();
            let sem = semaphore.clone();
            let start = request.start_line;
            let end = request.end_line;

            tokio::spawn(async move {
                let _permit = sem.acquire().await;
                tool_read_file(workspace, path, start, end).await
            })
        })
        .collect();

    for task in tasks {
        match task.await {
            Ok(Ok(result)) => results.push(result),
            Ok(Err(e)) => errors.push(e),
            Err(e) => errors.push(format!("Task failed: {}", e)),
        }
    }

    Ok(BatchReadResult { files: results, errors })
}

/// Helper: Copy directory recursively
fn copy_dir_recursive<'a>(
    src: &'a Path,
    dest: &'a Path,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send + 'a>> {
    Box::pin(async move {
        fs::create_dir_all(dest)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;

        let mut entries = fs::read_dir(src)
            .await
            .map_err(|e| format!("Failed to read directory: {}", e))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| format!("Failed to read entry: {}", e))?
        {
            let file_type = entry
                .file_type()
                .await
                .map_err(|e| format!("Failed to get file type: {}", e))?;

            let src_path = entry.path();
            let dest_path = dest.join(entry.file_name());

            if file_type.is_dir() {
                copy_dir_recursive(&src_path, &dest_path).await?;
            } else {
                fs::copy(&src_path, &dest_path)
                    .await
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }

        Ok(())
    })
}

/// Helper: Generate simple diff
fn generate_diff(original: &str, modified: &str) -> String {
    let original_lines: Vec<&str> = original.lines().collect();
    let modified_lines: Vec<&str> = modified.lines().collect();

    let mut diff = String::new();
    diff.push_str("--- original\n");
    diff.push_str("+++ modified\n");

    for (i, (orig, modi)) in original_lines.iter().zip(modified_lines.iter()).enumerate() {
        if orig != modi {
            diff.push_str(&format!("-{}: {}\n", i + 1, orig));
            diff.push_str(&format!("+{}: {}\n", i + 1, modi));
        }
    }

    // Handle length differences
    if original_lines.len() != modified_lines.len() {
        diff.push_str(&format!(
            "Length changed: {} -> {} lines\n",
            original_lines.len(),
            modified_lines.len()
        ));
    }

    diff
}
