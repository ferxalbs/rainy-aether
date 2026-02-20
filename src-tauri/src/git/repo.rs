//! Git Repository Info and Config Operations

use super::error::GitError;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct RepoInfo {
    pub is_repo: bool,
    pub root: Option<String>,
    pub git_dir: Option<String>,
    pub branch: Option<String>,
}

#[tauri::command]
pub fn git_get_repo_info(path: String) -> Result<RepoInfo, String> {
    let repo = match git2::Repository::open(&path) {
        Ok(repo) => repo,
        Err(_) => {
            return Ok(RepoInfo {
                is_repo: false,
                root: None,
                git_dir: None,
                branch: None,
            })
        }
    };

    let root = repo.workdir().map(|p| p.to_string_lossy().to_string());
    let git_dir = Some(repo.path().to_string_lossy().to_string());
    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));

    Ok(RepoInfo {
        is_repo: true,
        root,
        git_dir,
        branch,
    })
}

#[tauri::command]
pub fn git_get_config(path: String, key: String) -> Result<String, String> {
    let repo = git2::Repository::open(&path).map_err(|e| GitError::from(e))?;
    let config = repo.config().map_err(|e| GitError::from(e))?;
    config
        .get_string(&key)
        .map_err(|e| GitError::from(e).into())
}

#[tauri::command]
pub fn git_set_config(path: String, key: String, value: String) -> Result<String, String> {
    let repo = git2::Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut config = repo.config().map_err(|e| GitError::from(e))?;
    config
        .set_str(&key, &value)
        .map_err(|e| GitError::from(e))?;
    Ok(format!("Set {}={}", key, value))
}

#[tauri::command]
pub fn git_stage(path: String, files: Vec<String>) -> Result<String, String> {
    let repo = git2::Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    for file in &files {
        if Path::new(file).as_os_str().is_empty() {
            continue;
        }
        index
            .add_path(Path::new(file))
            .map_err(|e| GitError::from(e))?;
    }
    index.write().map_err(|e| GitError::from(e))?;
    Ok(format!("Staged {} files", files.len()))
}
