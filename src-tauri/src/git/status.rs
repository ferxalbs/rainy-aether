//! Git Status Operations
//!
//! Native libgit2 implementation for status, staging, and discard operations.

use super::error::GitError;
use super::types::StatusEntry;
use git2::{Repository, Status, StatusOptions};

/// Check if a path is a git repository
#[tauri::command]
pub fn git_is_repo(path: String) -> Result<bool, String> {
    match Repository::open(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Initialize a new Git repository
#[tauri::command]
pub fn git_init(path: String) -> Result<String, String> {
    Repository::init(&path).map_err(|e| GitError::from(e))?;
    Ok(format!("Initialized empty Git repository in {}", path))
}

/// Get git status using native libgit2
#[tauri::command]
pub fn git_status(path: String) -> Result<Vec<StatusEntry>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    let entries: Vec<StatusEntry> = statuses
        .iter()
        .map(|entry| {
            let path = entry.path().unwrap_or("").to_string();
            let code = status_to_porcelain_code(entry.status());
            StatusEntry { path, code }
        })
        .collect();

    Ok(entries)
}

/// Convert git2::Status to two-letter porcelain code (e.g., "M ", " M", "A ", "??")
fn status_to_porcelain_code(status: Status) -> String {
    let index_char = if status.contains(Status::INDEX_NEW) {
        'A'
    } else if status.contains(Status::INDEX_MODIFIED) {
        'M'
    } else if status.contains(Status::INDEX_DELETED) {
        'D'
    } else if status.contains(Status::INDEX_RENAMED) {
        'R'
    } else if status.contains(Status::INDEX_TYPECHANGE) {
        'T'
    } else {
        ' '
    };

    let worktree_char = if status.contains(Status::WT_NEW) {
        '?'
    } else if status.contains(Status::WT_MODIFIED) {
        'M'
    } else if status.contains(Status::WT_DELETED) {
        'D'
    } else if status.contains(Status::WT_RENAMED) {
        'R'
    } else if status.contains(Status::WT_TYPECHANGE) {
        'T'
    } else if status.contains(Status::CONFLICTED) {
        'U'
    } else {
        ' '
    };

    // Special case for untracked files
    if status.contains(Status::WT_NEW) && !status.contains(Status::INDEX_NEW) {
        return "??".to_string();
    }

    format!("{}{}", index_char, worktree_char)
}

/// Stage a single file
#[tauri::command]
pub fn git_stage_file(path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut index = repo.index().map_err(|e| GitError::from(e))?;

    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| GitError::from(e))?;
    index.write().map_err(|e| GitError::from(e))?;

    Ok(format!("Staged: {}", file_path))
}

/// Stage all changes
#[tauri::command]
pub fn git_stage_all(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut index = repo.index().map_err(|e| GitError::from(e))?;

    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| GitError::from(e))?;
    index.write().map_err(|e| GitError::from(e))?;

    Ok("Staged all changes".to_string())
}

/// Unstage a single file
#[tauri::command]
pub fn git_unstage_file(path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Get HEAD commit
    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;
    let _head_tree = head_commit.tree().map_err(|e| GitError::from(e))?;

    // Reset the file in the index to match HEAD
    repo.reset_default(Some(&head_commit.as_object()), [file_path.as_str()])
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Unstaged: {}", file_path))
}

/// Unstage all changes
#[tauri::command]
pub fn git_unstage_all(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;

    // Reset index to HEAD
    repo.reset(&head_commit.as_object(), git2::ResetType::Mixed, None)
        .map_err(|e| GitError::from(e))?;

    Ok("Unstaged all changes".to_string())
}

/// Discard changes to a file (restore to HEAD)
#[tauri::command]
pub fn git_discard_changes(path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Check if file is untracked (new file)
    let mut opts = StatusOptions::new();
    opts.pathspec(&file_path);
    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    if let Some(entry) = statuses.get(0) {
        if entry.status().contains(Status::WT_NEW) {
            // For untracked files, we need to delete the file
            let full_path = std::path::Path::new(&path).join(&file_path);
            if full_path.exists() {
                std::fs::remove_file(&full_path)
                    .map_err(|e| format!("Failed to remove untracked file: {}", e))?;
            }
            return Ok(format!("Deleted untracked file: {}", file_path));
        }
    }

    // For tracked files, checkout from HEAD
    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;
    let tree = head_commit.tree().map_err(|e| GitError::from(e))?;

    // Use checkout to restore the file
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();
    checkout_opts.path(&file_path);

    repo.checkout_tree(tree.as_object(), Some(&mut checkout_opts))
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Discarded changes: {}", file_path))
}

/// Discard changes to multiple files
#[tauri::command]
pub fn git_discard_files(path: String, file_paths: Vec<String>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;
    let tree = head_commit.tree().map_err(|e| GitError::from(e))?;

    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();

    for file_path in &file_paths {
        // Check if untracked
        let mut opts = StatusOptions::new();
        opts.pathspec(file_path);
        let statuses = repo
            .statuses(Some(&mut opts))
            .map_err(|e| GitError::from(e))?;

        if let Some(entry) = statuses.get(0) {
            if entry.status().contains(Status::WT_NEW) {
                // Delete untracked file
                let full_path = std::path::Path::new(&path).join(file_path);
                if full_path.exists() {
                    let _ = std::fs::remove_file(&full_path);
                }
                continue;
            }
        }

        checkout_opts.path(file_path);
    }

    repo.checkout_tree(tree.as_object(), Some(&mut checkout_opts))
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Discarded changes to {} files", file_paths.len()))
}
