//! Git Branch Operations
//!
//! Native libgit2 implementation for branch management.

use super::error::GitError;
use super::types::BranchInfo;
use git2::{BranchType, Repository};

/// List all branches
#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let branches = repo.branches(None).map_err(|e| GitError::from(e))?;

    let head = repo.head().ok();
    let current_name = head
        .as_ref()
        .and_then(|h| h.shorthand())
        .map(|s| s.to_string());

    let mut result = Vec::new();

    for branch in branches {
        let (branch, branch_type) = branch.map_err(|e| GitError::from(e))?;
        let name = branch
            .name()
            .map_err(|e| GitError::from(e))?
            .unwrap_or("")
            .to_string();

        // Skip remote tracking branches
        if branch_type == BranchType::Remote {
            continue;
        }

        let is_current = current_name.as_ref().map_or(false, |n| n == &name);

        let upstream = branch
            .upstream()
            .ok()
            .and_then(|b| b.name().ok().flatten().map(|s| s.to_string()));

        result.push(BranchInfo {
            name,
            current: is_current,
            remote: upstream,
        });
    }

    Ok(result)
}

/// Get current branch name
#[tauri::command]
pub fn git_get_current_branch(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let head = repo.head().map_err(|e| GitError::from(e))?;

    let name = head
        .shorthand()
        .map(|s| s.to_string())
        .unwrap_or_else(|| "HEAD".to_string());

    Ok(name)
}

/// Create a new branch
#[tauri::command]
pub fn git_create_branch(path: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let head = repo.head().map_err(|e| GitError::from(e))?;
    let commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;

    repo.branch(&branch_name, &commit, false)
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Created branch: {}", branch_name))
}

/// Delete a branch
#[tauri::command]
pub fn git_delete_branch(
    path: String,
    branch_name: String,
    _force: Option<bool>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut branch = repo
        .find_branch(&branch_name, BranchType::Local)
        .map_err(|e| GitError::from(e))?;

    if branch.is_head() {
        return Err("Cannot delete the current branch".to_string());
    }

    branch.delete().map_err(|e| GitError::from(e))?;

    Ok(format!("Deleted branch: {}", branch_name))
}

/// Checkout/switch to a branch
#[tauri::command]
pub fn git_checkout_branch(path: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let branch = repo
        .find_branch(&branch_name, BranchType::Local)
        .map_err(|e| GitError::from(e))?;

    let reference = branch.into_reference();
    let tree = reference.peel_to_tree().map_err(|e| GitError::from(e))?;

    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.safe();

    repo.checkout_tree(tree.as_object(), Some(&mut checkout_opts))
        .map_err(|e| GitError::from(e))?;

    let refname = format!("refs/heads/{}", branch_name);
    repo.set_head(&refname).map_err(|e| GitError::from(e))?;

    Ok(format!("Switched to branch: {}", branch_name))
}

/// Rename a branch
#[tauri::command]
pub fn git_rename_branch(
    path: String,
    old_name: String,
    new_name: String,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut branch = repo
        .find_branch(&old_name, BranchType::Local)
        .map_err(|e| GitError::from(e))?;

    branch
        .rename(&new_name, false)
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Renamed branch {} to {}", old_name, new_name))
}
