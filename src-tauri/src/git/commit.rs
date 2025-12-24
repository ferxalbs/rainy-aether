//! Git Commit Operations
//!
//! Native libgit2 implementation for commit, amend, reset, and revert.

use super::error::GitError;
use git2::{Repository, Signature};

/// Create a commit
#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Get the signature from git config
    let sig = repo.signature().map_err(|e| GitError::from(e))?;

    // Get the tree from index
    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    let tree_id = index.write_tree().map_err(|e| GitError::from(e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| GitError::from(e))?;

    // Get parent commit (if any)
    let parent = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| GitError::from(e))?),
        Err(_) => None,
    };

    let parents: Vec<&git2::Commit> = parent.iter().collect();

    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| GitError::from(e))?;

    Ok(commit_id.to_string())
}

/// Amend the last commit
#[tauri::command]
pub fn git_amend_commit(path: String, message: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;

    let sig = repo.signature().map_err(|e| GitError::from(e))?;

    // Get the new tree from index
    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    let tree_id = index.write_tree().map_err(|e| GitError::from(e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| GitError::from(e))?;

    // Use provided message or keep original
    let commit_message = message.unwrap_or_else(|| head_commit.message().unwrap_or("").to_string());

    let commit_id = head_commit
        .amend(
            Some("HEAD"),
            Some(&sig),
            Some(&sig),
            None,
            Some(&commit_message),
            Some(&tree),
        )
        .map_err(|e| GitError::from(e))?;

    Ok(commit_id.to_string())
}

/// Reset to a commit
#[tauri::command]
pub fn git_reset(path: String, commit: String, mode: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit).map_err(|e| GitError::from(e))?;
    let commit_obj = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    let reset_type = match mode.to_lowercase().as_str() {
        "soft" => git2::ResetType::Soft,
        "mixed" => git2::ResetType::Mixed,
        "hard" => git2::ResetType::Hard,
        _ => {
            return Err(format!(
                "Invalid reset mode: {}. Use soft, mixed, or hard.",
                mode
            ))
        }
    };

    repo.reset(commit_obj.as_object(), reset_type, None)
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Reset to {} ({})", commit, mode))
}

/// Revert a commit
#[tauri::command]
pub fn git_revert(path: String, commit: String, no_commit: Option<bool>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit).map_err(|e| GitError::from(e))?;
    let commit_obj = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    // Get parent
    let parent = commit_obj.parent(0).map_err(|e| GitError::from(e))?;

    // Perform the revert by cherrypicking in reverse
    let mut opts = git2::CherrypickOptions::new();
    opts.mainline(0);

    repo.cherrypick(&commit_obj, Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    if no_commit.unwrap_or(false) {
        Ok(format!("Reverted {} (staged, not committed)", commit))
    } else {
        // Create revert commit
        let sig = repo.signature().map_err(|e| GitError::from(e))?;
        let mut index = repo.index().map_err(|e| GitError::from(e))?;
        let tree_id = index.write_tree().map_err(|e| GitError::from(e))?;
        let tree = repo.find_tree(tree_id).map_err(|e| GitError::from(e))?;

        let head = repo.head().map_err(|e| GitError::from(e))?;
        let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;

        let message = format!(
            "Revert \"{}\"\n\nThis reverts commit {}",
            commit_obj
                .message()
                .unwrap_or("")
                .lines()
                .next()
                .unwrap_or(""),
            commit
        );

        repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&head_commit])
            .map_err(|e| GitError::from(e))?;

        Ok(format!("Reverted {}", commit))
    }
}

/// Cherry-pick a commit
#[tauri::command]
pub fn git_cherry_pick(
    path: String,
    commit: String,
    no_commit: Option<bool>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit).map_err(|e| GitError::from(e))?;
    let commit_obj = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    let mut opts = git2::CherrypickOptions::new();
    repo.cherrypick(&commit_obj, Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    if no_commit.unwrap_or(false) {
        Ok(format!("Cherry-picked {} (staged, not committed)", commit))
    } else {
        // Create commit with original message
        let sig = repo.signature().map_err(|e| GitError::from(e))?;
        let mut index = repo.index().map_err(|e| GitError::from(e))?;
        let tree_id = index.write_tree().map_err(|e| GitError::from(e))?;
        let tree = repo.find_tree(tree_id).map_err(|e| GitError::from(e))?;

        let head = repo.head().map_err(|e| GitError::from(e))?;
        let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;

        let message = commit_obj.message().unwrap_or("Cherry-pick");

        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&head_commit])
            .map_err(|e| GitError::from(e))?;

        // Cleanup cherrypick state
        let _ = repo.cleanup_state();

        Ok(format!("Cherry-picked {}", commit))
    }
}
