//! Git Stash Operations
//!
//! Native libgit2 implementation for stash management.

use super::error::GitError;
use super::types::StashEntry;
use git2::Repository;

/// List stashes
#[tauri::command]
pub fn git_stash_list(path: String) -> Result<Vec<StashEntry>, String> {
    let mut repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let mut stashes = Vec::new();

    repo.stash_foreach(|index, message, oid| {
        stashes.push(StashEntry {
            index,
            message: message.to_string(),
            hash: oid.to_string(),
        });
        true
    })
    .map_err(|e| GitError::from(e))?;

    Ok(stashes)
}

/// Create a stash
#[tauri::command]
pub fn git_stash_push(path: String, message: Option<String>) -> Result<String, String> {
    let mut repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let sig = repo.signature().map_err(|e| GitError::from(e))?;

    let msg = message.as_deref();

    let oid = repo
        .stash_save(&sig, msg.unwrap_or("WIP"), None)
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Created stash: {}", oid))
}

/// Apply and remove a stash
#[tauri::command]
pub fn git_stash_pop(path: String, index: Option<usize>) -> Result<String, String> {
    let mut repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let idx = index.unwrap_or(0);

    // Apply the stash
    let mut opts = git2::StashApplyOptions::new();
    repo.stash_apply(idx, Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    // Drop the stash
    repo.stash_drop(idx).map_err(|e| GitError::from(e))?;

    Ok(format!("Applied and dropped stash@{{{}}}", idx))
}
