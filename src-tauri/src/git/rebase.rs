//! Git Rebase Operations
//!
//! Native libgit2 implementation for rebase lifecycle commands.

use super::error::GitError;
use git2::{BranchType, RebaseOptions, Repository};

#[tauri::command]
pub fn git_rebase(path: String, branch: String, _interactive: Option<bool>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let upstream_branch = repo
        .find_branch(&branch, BranchType::Local)
        .map_err(|e| GitError::from(e))?;
    let upstream = repo
        .reference_to_annotated_commit(upstream_branch.get())
        .map_err(|e| GitError::from(e))?;

    let mut opts = RebaseOptions::new();
    let mut rebase = repo
        .rebase(None, Some(&upstream), None, Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    let sig = repo.signature().map_err(|e| GitError::from(e))?;
    loop {
        let next = rebase.next();
        match next {
            Some(Ok(_)) => {
                let index = repo.index().map_err(|e| GitError::from(e))?;
                if index.has_conflicts() {
                    return Err("Rebase conflicts detected. Resolve and continue, skip, or abort.".to_string());
                }
                drop(index);

                // Commit this rebased operation.
                rebase
                    .commit(None, &sig, None)
                    .map_err(|e| GitError::from(e))?;
            }
            Some(Err(e)) => return Err(GitError::from(e).into()),
            None => break,
        }
    }

    rebase.finish(Some(&sig)).map_err(|e| GitError::from(e))?;
    Ok(format!("Rebased onto {}", branch))
}

#[tauri::command]
pub fn git_rebase_abort(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut rebase = repo.open_rebase(None).map_err(|e| GitError::from(e))?;
    rebase.abort().map_err(|e| GitError::from(e))?;
    Ok("Rebase aborted".to_string())
}

#[tauri::command]
pub fn git_rebase_continue(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut rebase = repo.open_rebase(None).map_err(|e| GitError::from(e))?;
    let sig = repo.signature().map_err(|e| GitError::from(e))?;

    // Commit current operation after conflicts are resolved.
    rebase
        .commit(None, &sig, None)
        .map_err(|e| GitError::from(e))?;

    loop {
        let next = rebase.next();
        match next {
            Some(Ok(_)) => {
                let index = repo.index().map_err(|e| GitError::from(e))?;
                if index.has_conflicts() {
                    return Err("Rebase conflicts detected. Resolve and continue, skip, or abort.".to_string());
                }
                drop(index);
                rebase
                    .commit(None, &sig, None)
                    .map_err(|e| GitError::from(e))?;
            }
            Some(Err(e)) => return Err(GitError::from(e).into()),
            None => break,
        }
    }

    rebase.finish(Some(&sig)).map_err(|e| GitError::from(e))?;
    Ok("Rebase completed".to_string())
}

#[tauri::command]
pub fn git_rebase_skip(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut rebase = repo.open_rebase(None).map_err(|e| GitError::from(e))?;
    let sig = repo.signature().map_err(|e| GitError::from(e))?;

    // Skip current conflicted operation by advancing without committing it.
    let _ = rebase.next();

    loop {
        let next = rebase.next();
        match next {
            Some(Ok(_)) => {
                let index = repo.index().map_err(|e| GitError::from(e))?;
                if index.has_conflicts() {
                    return Err("Rebase conflicts detected. Resolve and continue, skip, or abort.".to_string());
                }
                drop(index);
                rebase
                    .commit(None, &sig, None)
                    .map_err(|e| GitError::from(e))?;
            }
            Some(Err(e)) => return Err(GitError::from(e).into()),
            None => break,
        }
    }

    rebase.finish(Some(&sig)).map_err(|e| GitError::from(e))?;
    Ok("Rebase skip applied".to_string())
}
