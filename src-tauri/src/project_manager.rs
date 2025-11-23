use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use rayon::prelude::*;
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
    // Load only 1 level deep initially for maximum performance
    // Frontend can request more levels on-demand by expanding folders
    read_directory_shallow(&dir_path, 1, 0)
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
    use std::io::Read;

    let file_path = PathBuf::from(&path);
    let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;

    // If file is larger than 5MB, load only the first 100KB as a preview
    if metadata.len() > 5 * 1024 * 1024 {
        let file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
        let reader = std::io::BufReader::new(file);
        let mut buffer = String::new();

        // Read up to 100KB
        reader
            .take(100 * 1024)
            .read_to_string(&mut buffer)
            .map_err(|e| e.to_string())?;

        // Add visual marker for the user
        buffer.push_str("\n\n/* ========================================\n");
        buffer.push_str(&format!("   CONTENT TRUNCATED - FILE SIZE: {:.2} MB\n", metadata.len() as f64 / (1024.0 * 1024.0)));
        buffer.push_str("   Only the first 100 KB are shown above.\n");
        buffer.push_str("   ======================================== */");

        return Ok(buffer);
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

/// Search result for a single match
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

/// Search result for a file
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileSearchResult {
    pub path: String,
    pub name: String,
    pub matches: Vec<SearchMatch>,
}

/// Search options
#[derive(Deserialize, Debug)]
pub struct SearchOptions {
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub use_regex: bool,
    pub include_pattern: Option<String>,
    pub exclude_pattern: Option<String>,
    pub max_results: Option<usize>,
}

/// Check if file should be searched based on include/exclude patterns
fn should_search_file(path: &Path, include: &Option<String>, exclude: &Option<String>) -> bool {
    let path_str = path.to_string_lossy().to_string();
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    // Check exclude patterns first
    if let Some(exclude_pat) = exclude {
        for pattern in exclude_pat.split(',').map(|s| s.trim()) {
            if !pattern.is_empty() {
                // Simple glob matching
                if pattern.starts_with('*') {
                    let suffix = &pattern[1..];
                    if name.ends_with(suffix) || path_str.ends_with(suffix) {
                        return false;
                    }
                } else if pattern.ends_with('*') {
                    let prefix = &pattern[..pattern.len()-1];
                    if name.starts_with(prefix) || path_str.contains(prefix) {
                        return false;
                    }
                } else if name == pattern || path_str.contains(pattern) {
                    return false;
                }
            }
        }
    }

    // Check include patterns
    if let Some(include_pat) = include {
        let patterns: Vec<&str> = include_pat.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        if !patterns.is_empty() {
            for pattern in patterns {
                // Simple glob matching
                if pattern.starts_with('*') {
                    let suffix = &pattern[1..];
                    if name.ends_with(suffix) {
                        return true;
                    }
                } else if pattern.ends_with('*') {
                    let prefix = &pattern[..pattern.len()-1];
                    if name.starts_with(prefix) {
                        return true;
                    }
                } else if name == pattern {
                    return true;
                }
            }
            return false;
        }
    }

    true
}

/// Check if file is likely binary
fn is_binary_file(path: &Path) -> bool {
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "ico" | "webp" | "svg" |
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" |
        "zip" | "tar" | "gz" | "rar" | "7z" |
        "exe" | "dll" | "so" | "dylib" |
        "woff" | "woff2" | "ttf" | "otf" | "eot" |
        "mp3" | "mp4" | "avi" | "mov" | "mkv" | "wav" | "flac" |
        "sqlite" | "db" | "lock"
    )
}

/// Search for text in files recursively
fn search_in_directory(
    dir: &Path,
    query: &str,
    options: &SearchOptions,
    results: &Arc<Mutex<Vec<FileSearchResult>>>,
    current_count: &Arc<Mutex<usize>>,
    max_results: usize,
) -> Result<(), String> {
    // Check if we've reached the max results limit
    {
        let count = current_count.lock().unwrap();
        if *count >= max_results {
            return Ok(());
        }
    }

    // Collect all entries first
    let entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect();

    // Parallel processing of entries
    entries.par_iter().try_for_each(|entry| {
        // Check limit again
        {
            let count = current_count.lock().unwrap();
            if *count >= max_results {
                return Ok(());
            }
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip ignored directories
        if should_ignore(&name) {
            return Ok(());
        }

        if path.is_dir() {
            // Recurse into subdirectory (this will also use parallel processing)
            search_in_directory(&path, query, options, results, current_count, max_results)?;
        } else if path.is_file() {
            // Check if we should search this file
            if !should_search_file(&path, &options.include_pattern, &options.exclude_pattern) {
                return Ok(());
            }

            // Skip binary files
            if is_binary_file(&path) {
                return Ok(());
            }

            // Skip files larger than 1MB
            if let Ok(metadata) = fs::metadata(&path) {
                if metadata.len() > 1024 * 1024 {
                    return Ok(());
                }
            }

            // Search in file
            if let Ok(content) = fs::read_to_string(&path) {
                let matches = search_in_content(&content, query, options);

                if !matches.is_empty() {
                    // Acquire locks and update shared state
                    let mut results_guard = results.lock().unwrap();
                    let mut count_guard = current_count.lock().unwrap();

                    // Double-check we haven't exceeded limit while waiting for lock
                    if *count_guard < max_results {
                        *count_guard += matches.len();

                        results_guard.push(FileSearchResult {
                            path: path.to_string_lossy().to_string(),
                            name,
                            matches,
                        });
                    }
                }
            }
        }

        Ok(())
    })
}

/// Search for matches in file content
fn search_in_content(content: &str, query: &str, options: &SearchOptions) -> Vec<SearchMatch> {
    let mut matches = Vec::new();

    if options.use_regex {
        // Regex search
        let pattern = if options.case_sensitive {
            regex::Regex::new(query)
        } else {
            regex::RegexBuilder::new(query)
                .case_insensitive(true)
                .build()
        };

        if let Ok(re) = pattern {
            for (line_num, line) in content.lines().enumerate() {
                for mat in re.find_iter(line) {
                    matches.push(SearchMatch {
                        line_number: line_num + 1,
                        line_content: line.to_string(),
                        match_start: mat.start(),
                        match_end: mat.end(),
                    });
                }
            }
        }
    } else {
        // Plain text search
        let search_query = if options.case_sensitive {
            query.to_string()
        } else {
            query.to_lowercase()
        };

        for (line_num, line) in content.lines().enumerate() {
            let search_line = if options.case_sensitive {
                line.to_string()
            } else {
                line.to_lowercase()
            };

            let mut start = 0;
            while let Some(pos) = search_line[start..].find(&search_query) {
                let match_start = start + pos;
                let match_end = match_start + query.len();

                // Check whole word if needed
                if options.whole_word {
                    let before_ok = match_start == 0 ||
                        !line.chars().nth(match_start - 1).map(|c| c.is_alphanumeric() || c == '_').unwrap_or(false);
                    let after_ok = match_end >= line.len() ||
                        !line.chars().nth(match_end).map(|c| c.is_alphanumeric() || c == '_').unwrap_or(false);

                    if !before_ok || !after_ok {
                        start = match_start + 1;
                        continue;
                    }
                }

                matches.push(SearchMatch {
                    line_number: line_num + 1,
                    line_content: line.to_string(),
                    match_start,
                    match_end,
                });

                start = match_end;
            }
        }
    }

    matches
}

/// List directory contents (for LSP/WorkspaceFS)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DirectoryEntry {
    pub name: String,
    pub is_directory: bool,
    pub path: String,
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    let dir_path = PathBuf::from(&path);

    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries: Vec<DirectoryEntry> = fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .map(|entry| {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_directory = path.is_dir();

            DirectoryEntry {
                name,
                is_directory,
                path: path.to_string_lossy().to_string(),
            }
        })
        .collect();

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Search for text across all files in a workspace
#[tauri::command]
pub async fn search_in_workspace(
    path: String,
    query: String,
    options: SearchOptions,
) -> Result<Vec<FileSearchResult>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let dir_path = PathBuf::from(&path);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err("Invalid workspace path".to_string());
    }

    let max_results = options.max_results.unwrap_or(1000);

    // Wrap results and count in Arc<Mutex<>> for thread-safe parallel processing
    let results_shared = Arc::new(Mutex::new(Vec::new()));
    let count_shared = Arc::new(Mutex::new(0usize));

    search_in_directory(&dir_path, &query, &options, &results_shared, &count_shared, max_results)?;

    // Extract results from Arc<Mutex<>> and sort
    let results = Arc::try_unwrap(results_shared)
        .map(|mutex| mutex.into_inner().unwrap())
        .unwrap_or_else(|arc| arc.lock().unwrap().clone());

    let mut sorted_results = results;
    sorted_results.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(sorted_results)
}

/// Replace text in a single file
#[tauri::command]
pub async fn replace_in_file(
    path: String,
    search: String,
    replace: String,
    options: SearchOptions,
) -> Result<usize, String> {
    let file_path = PathBuf::from(&path);
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;

    let (new_content, count) = if options.use_regex {
        let pattern = if options.case_sensitive {
            regex::Regex::new(&search)
        } else {
            regex::RegexBuilder::new(&search)
                .case_insensitive(true)
                .build()
        };

        match pattern {
            Ok(re) => {
                let count = re.find_iter(&content).count();
                let new_content = re.replace_all(&content, replace.as_str()).to_string();
                (new_content, count)
            }
            Err(e) => return Err(format!("Invalid regex: {}", e)),
        }
    } else {
        let mut new_content = content.clone();
        let mut count = 0;

        if options.case_sensitive {
            while new_content.contains(&search) {
                new_content = new_content.replacen(&search, &replace, 1);
                count += 1;
            }
        } else {
            let search_lower = search.to_lowercase();
            let mut result = String::new();
            let mut remaining = new_content.as_str();

            while let Some(pos) = remaining.to_lowercase().find(&search_lower) {
                result.push_str(&remaining[..pos]);
                result.push_str(&replace);
                remaining = &remaining[pos + search.len()..];
                count += 1;
            }
            result.push_str(remaining);
            new_content = result;
        }

        (new_content, count)
    };

    fs::write(&file_path, new_content).map_err(|e| e.to_string())?;

    Ok(count)
}
