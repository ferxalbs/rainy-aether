use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri::State;
use tokio::fs as async_fs;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileNode {
    name: String,
    path: String,
    is_directory: bool,
    children: Option<Vec<FileNode>>,
    size: Option<u64>,
    modified: Option<u64>,
    // New field to indicate if children are loaded
    children_loaded: bool,
}

// Directories and files to ignore during scanning
fn should_ignore(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | ".git"
            | "target"
            | "dist"
            | "build"
            | ".next"
            | ".cache"
            | "coverage"
            | ".vscode"
            | ".idea"
            | "__pycache__"
            | ".pytest_cache"
            | ".mypy_cache"
            | "vendor"
            | "tmp"
            | "temp"
            | ".DS_Store"
            | "Thumbs.db"
            | ".turbo"
            | ".vercel"
            | ".nuxt"
    )
}

// Read directory with depth limit and ignore patterns (NON-RECURSIVE for top level)
fn read_directory_shallow(
    path: &Path,
    max_depth: usize,
    current_depth: usize,
) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    // Check if this directory should be ignored
    if should_ignore(&name) && current_depth > 0 {
        return Err("Ignored directory".to_string());
    }

    let modified_time = metadata
        .modified()
        .ok()
        .and_then(|st| st.duration_since(std::time::SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());

    if metadata.is_dir() {
        // For directories, only load immediate children if within depth limit
        let children = if current_depth < max_depth {
            let mut child_nodes: Vec<FileNode> = fs::read_dir(path)
                .map_err(|e| e.to_string())?
                .filter_map(|entry| entry.ok())
                .filter_map(|entry| {
                    let entry_name = entry.file_name().to_string_lossy().to_string();
                    // Skip ignored directories at this level
                    if should_ignore(&entry_name) {
                        return None;
                    }
                    read_directory_shallow(&entry.path(), max_depth, current_depth + 1).ok()
                })
                .collect();

            // Sort: directories first, then alphabetically
            child_nodes.sort_by(|a, b| match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            });

            Some(child_nodes)
        } else {
            None
        };

        Ok(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: true,
            children,
            size: Some(metadata.len()),
            modified: modified_time,
            children_loaded: current_depth < max_depth,
        })
    } else {
        Ok(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: false,
            children: None,
            size: Some(metadata.len()),
            modified: modified_time,
            children_loaded: false,
        })
    }
}

pub struct WatcherState {
    pub watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

#[tauri::command]
pub fn get_cwd() -> Result<String, String> {
    match std::env::current_dir() {
        Ok(cwd) => Ok(cwd.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get current working directory: {}", e)),
    }
}

#[tauri::command]
pub fn open_project_dialog() {
    // This is handled by the frontend.
}

#[tauri::command]
pub async fn load_project_structure(path: String) -> Result<FileNode, String> {
    let dir_path = PathBuf::from(&path);
    // Load only 2 levels deep initially for performance
    // Frontend can request more levels on-demand
    read_directory_shallow(&dir_path, 2, 0)
}

// New command to load children of a specific directory on-demand
#[tauri::command]
pub async fn load_directory_children(path: String) -> Result<Vec<FileNode>, String> {
    let dir_path = PathBuf::from(&path);
    let metadata = fs::metadata(&dir_path).map_err(|e| e.to_string())?;

    if !metadata.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut children: Vec<FileNode> = fs::read_dir(&dir_path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let entry_name = entry.file_name().to_string_lossy().to_string();
            if should_ignore(&entry_name) {
                return None;
            }
            // Load only immediate children (depth 1)
            read_directory_shallow(&entry.path(), 1, 0).ok()
        })
        .collect();

    // Sort: directories first, then alphabetically
    children.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(children)
}

#[tauri::command]
pub async fn get_file_content(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;
    if metadata.len() > 5 * 1024 * 1024 {
        // 5MB limit
        return Err("File is larger than 5MB.".to_string());
    }

    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_file_content(path: String, content: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    // Asegurar que el directorio padre exista
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&p, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), String> {
    // Create an empty file, error if parent does not exist
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            return Err("Parent directory does not exist".to_string());
        }
    }
    async_fs::write(&p, "").await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_folder(path: String) -> Result<(), String> {
    async_fs::create_dir_all(&path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    async_fs::rename(&old_path, &new_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let md = async_fs::metadata(&p).await.map_err(|e| e.to_string())?;
    if md.is_dir() {
        async_fs::remove_dir_all(&p)
            .await
            .map_err(|e| e.to_string())
    } else {
        async_fs::remove_file(&p).await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn watch_project_changes(
    window: tauri::Window,
    path: String,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|e| format!("Failed to acquire watcher lock: {}", e))?;

    if watcher_guard.is_some() {
        // We are already watching a directory. Stop the previous watcher.
        *watcher_guard = None;
    }

    let window = window.clone();
    let mut watcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            match res {
                Ok(event) => {
                    // Filter out temporary files, git internals, and non-relevant events
                    let relevant_paths: Vec<_> = event
                        .paths
                        .iter()
                        .filter(|path| {
                            let path_str = path.to_string_lossy();
                            // Skip temporary files, backup files, git internals, and common editor artifacts
                            !path_str.contains(".tmp")
                                && !path_str.contains(".bak")
                                && !path_str.contains("~")
                                && !path_str.contains(".swp")
                                && !path_str.contains(".lock")
                                && !path_str.contains("\\.git\\")  // Windows path
                                && !path_str.contains("/.git/")    // Unix path
                                && !path_str.ends_with("\\.git")   // Windows path
                                && !path_str.ends_with("/.git") // Unix path
                        })
                        .collect();

                    if !relevant_paths.is_empty() {
                        if let Err(e) = window.emit("file-change", &relevant_paths) {
                            eprintln!("Failed to emit file-change event: {:?}", e);
                        }
                    }
                }
                Err(e) => println!("watch error: {:?}", e),
            }
        })
        .map_err(|e| e.to_string())?;

    watcher
        .watch(path.as_ref(), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *watcher_guard = Some(watcher);

    Ok(())
}

/// Get system temporary directory
#[tauri::command]
pub fn get_temp_dir() -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    temp_dir
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to get temp directory".to_string())
}
