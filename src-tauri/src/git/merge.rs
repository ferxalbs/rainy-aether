//! Git Merge Operations
//!
//! Native libgit2 implementation for merge and conflict resolution.

use super::error::GitError;
use super::types::ConflictContent;
use git2::{MergeOptions, Repository};

/// Merge a branch into current branch
#[tauri::command]
pub fn git_merge(path: String, branch: String, no_ff: Option<bool>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Find the branch to merge
    let branch_ref = repo
        .find_branch(&branch, git2::BranchType::Local)
        .map_err(|e| GitError::from(e))?;
    let annotated = repo
        .reference_to_annotated_commit(branch_ref.get())
        .map_err(|e| GitError::from(e))?;

    // Perform merge analysis
    let (analysis, _preference) = repo
        .merge_analysis(&[&annotated])
        .map_err(|e| GitError::from(e))?;

    if analysis.is_up_to_date() {
        return Ok("Already up to date".to_string());
    }

    if analysis.is_fast_forward() && !no_ff.unwrap_or(false) {
        // Fast-forward
        let head = repo.head().map_err(|e| GitError::from(e))?;
        let name = head.shorthand().unwrap_or("HEAD");
        let refname = format!("refs/heads/{}", name);

        let mut reference = repo
            .find_reference(&refname)
            .map_err(|e| GitError::from(e))?;
        reference
            .set_target(annotated.id(), &format!("Fast-forward to {}", branch))
            .map_err(|e| GitError::from(e))?;

        // Checkout
        let mut checkout = git2::build::CheckoutBuilder::new();
        checkout.force();
        repo.checkout_head(Some(&mut checkout))
            .map_err(|e| GitError::from(e))?;

        return Ok(format!("Fast-forward merged {}", branch));
    }

    // Normal merge
    let mut merge_opts = MergeOptions::new();
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.safe();

    repo.merge(
        &[&annotated],
        Some(&mut merge_opts),
        Some(&mut checkout_opts),
    )
    .map_err(|e| GitError::from(e))?;

    // Check for conflicts
    let index = repo.index().map_err(|e| GitError::from(e))?;
    if index.has_conflicts() {
        return Err(format!(
            "Merge conflicts detected. Resolve and commit manually."
        ));
    }

    // Create merge commit
    let sig = repo.signature().map_err(|e| GitError::from(e))?;
    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;
    let merge_commit = repo
        .find_commit(annotated.id())
        .map_err(|e| GitError::from(e))?;

    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    let tree_id = index.write_tree().map_err(|e| GitError::from(e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| GitError::from(e))?;

    let message = format!("Merge branch '{}'", branch);

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &[&head_commit, &merge_commit],
    )
    .map_err(|e| GitError::from(e))?;

    // Cleanup
    repo.cleanup_state().map_err(|e| GitError::from(e))?;

    Ok(format!("Merged branch '{}'", branch))
}

/// Abort a merge in progress
#[tauri::command]
pub fn git_merge_abort(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Reset to HEAD
    let head = repo.head().map_err(|e| GitError::from(e))?;
    let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;

    repo.reset(head_commit.as_object(), git2::ResetType::Hard, None)
        .map_err(|e| GitError::from(e))?;

    // Cleanup merge state
    repo.cleanup_state().map_err(|e| GitError::from(e))?;

    Ok("Merge aborted".to_string())
}

/// List conflicted files
#[tauri::command]
pub fn git_list_conflicts(path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let index = repo.index().map_err(|e| GitError::from(e))?;

    let conflicts: Vec<String> = index
        .conflicts()
        .map_err(|e| GitError::from(e))?
        .filter_map(|c| c.ok())
        .filter_map(|c| {
            c.our
                .or(c.their)
                .or(c.ancestor)
                .and_then(|e| std::str::from_utf8(&e.path).ok().map(|s| s.to_string()))
        })
        .collect();

    Ok(conflicts)
}

/// Get conflict content for a file
#[tauri::command]
pub fn git_get_conflict_content(
    path: String,
    file_path: String,
) -> Result<ConflictContent, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let index = repo.index().map_err(|e| GitError::from(e))?;

    // Find the conflict entry
    let conflict = index
        .conflicts()
        .map_err(|e| GitError::from(e))?
        .filter_map(|c| c.ok())
        .find(|c| {
            let path_match = |entry: &Option<git2::IndexEntry>| {
                entry
                    .as_ref()
                    .and_then(|e| std::str::from_utf8(&e.path).ok())
                    .map(|p| p == file_path)
                    .unwrap_or(false)
            };
            path_match(&c.our) || path_match(&c.their) || path_match(&c.ancestor)
        })
        .ok_or_else(|| format!("No conflict found for {}", file_path))?;

    // Get content from blobs
    let get_blob_content = |entry: &Option<git2::IndexEntry>| -> String {
        entry
            .as_ref()
            .and_then(|e| repo.find_blob(e.id).ok())
            .and_then(|b| std::str::from_utf8(b.content()).ok().map(|s| s.to_string()))
            .unwrap_or_default()
    };

    Ok(ConflictContent {
        path: file_path,
        ours: get_blob_content(&conflict.our),
        theirs: get_blob_content(&conflict.their),
        base: get_blob_content(&conflict.ancestor),
    })
}

/// Resolve conflict with given content
#[tauri::command]
pub fn git_resolve_conflict(
    path: String,
    file_path: String,
    resolution: String,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Write the resolved content
    let full_path = std::path::Path::new(&path).join(&file_path);
    std::fs::write(&full_path, resolution)
        .map_err(|e| format!("Failed to write resolved file: {}", e))?;

    // Stage the resolved file
    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| GitError::from(e))?;
    index.write().map_err(|e| GitError::from(e))?;

    Ok(format!("Resolved conflict: {}", file_path))
}

/// Accept our version of a conflicted file
#[tauri::command]
pub fn git_accept_ours(path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Checkout our version
    let head = repo.head().map_err(|e| GitError::from(e))?;
    let tree = head.peel_to_tree().map_err(|e| GitError::from(e))?;

    let mut checkout = git2::build::CheckoutBuilder::new();
    checkout.force();
    checkout.path(&file_path);

    repo.checkout_tree(tree.as_object(), Some(&mut checkout))
        .map_err(|e| GitError::from(e))?;

    // Stage the file
    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| GitError::from(e))?;
    index.write().map_err(|e| GitError::from(e))?;

    Ok(format!("Accepted ours: {}", file_path))
}

/// Accept their version of a conflicted file
#[tauri::command]
pub fn git_accept_theirs(path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Get MERGE_HEAD (the commit being merged in)
    let merge_head = repo
        .find_reference("MERGE_HEAD")
        .map_err(|_| "No merge in progress".to_string())?;
    let merge_commit = merge_head.peel_to_commit().map_err(|e| GitError::from(e))?;
    let tree = merge_commit.tree().map_err(|e| GitError::from(e))?;

    let mut checkout = git2::build::CheckoutBuilder::new();
    checkout.force();
    checkout.path(&file_path);

    repo.checkout_tree(tree.as_object(), Some(&mut checkout))
        .map_err(|e| GitError::from(e))?;

    // Stage the file
    let mut index = repo.index().map_err(|e| GitError::from(e))?;
    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| GitError::from(e))?;
    index.write().map_err(|e| GitError::from(e))?;

    Ok(format!("Accepted theirs: {}", file_path))
}
