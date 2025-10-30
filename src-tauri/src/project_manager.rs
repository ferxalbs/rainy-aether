use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Emitter};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::{Mutex, Arc};
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
}

fn read_directory_recursively(path: &Path) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let modified_time = metadata
        .modified()
        .ok()
        .and_then(|st| st.duration_since(std::time::SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());

    if metadata.is_dir() {
        let children: Vec<FileNode> = fs::read_dir(path)
            .map_err(|e| e.to_string())?
            .filter_map(|entry| entry.ok())
            .map(|entry| read_directory_recursively(&entry.path()))
            .filter_map(|result| result.ok()) // Ignore entries we can't read
            .collect();

        Ok(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: true,
            children: Some(children),
            size: Some(metadata.len()),
            modified: modified_time,
        })
    } else {
        Ok(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: false,
            children: None,
            size: Some(metadata.len()),
            modified: modified_time,
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
    read_directory_recursively(&dir_path)
}

#[tauri::command]
pub async fn get_file_content(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;
    if metadata.len() > 5 * 1024 * 1024 { // 5MB limit
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
    async_fs::create_dir_all(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    async_fs::rename(&old_path, &new_path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let md = async_fs::metadata(&p).await.map_err(|e| e.to_string())?;
    if md.is_dir() {
        async_fs::remove_dir_all(&p).await.map_err(|e| e.to_string())
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
    let mut watcher_guard = state.watcher.lock().unwrap();

    if watcher_guard.is_some() {
        // We are already watching a directory. Stop the previous watcher.
        *watcher_guard = None;
    }

    let window = window.clone();
    let mut watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        match res {
            Ok(event) => {
                // Filter out temporary files and non-relevant events
                let relevant_paths: Vec<_> = event.paths.iter()
                    .filter(|path| {
                        let path_str = path.to_string_lossy();
                        // Skip temporary files, backup files, and common editor artifacts
                        !path_str.contains(".tmp") &&
                        !path_str.contains(".bak") &&
                        !path_str.contains("~") &&
                        !path_str.contains(".swp") &&
                        !path_str.contains(".lock")
                    })
                    .collect();

                if !relevant_paths.is_empty() {
                    println!("File change detected: {:?}", event);
                    window.emit("file-change", &relevant_paths).unwrap();
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
