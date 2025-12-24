//! Git Remote Operations
//!
//! Native libgit2 implementation for push, pull, fetch, and clone with proper authentication.

use super::auth::AuthCallbacks;
use super::error::GitError;
use super::types::{CloneProgress, RemoteInfo};
use git2::{AutotagOption, Repository};

/// Push to remote repository
#[tauri::command]
pub fn git_push(
    path: String,
    remote_name: Option<String>,
    branch_name: Option<String>,
    force: Option<bool>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let remote_name = remote_name.as_deref().unwrap_or("origin");
    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| GitError::from(e))?;

    // Get branch name or use current
    let branch = match &branch_name {
        Some(b) => b.clone(),
        None => {
            let head = repo.head().map_err(|e| GitError::from(e))?;
            head.shorthand().unwrap_or("HEAD").to_string()
        }
    };

    let refspec = if force.unwrap_or(false) {
        format!("+refs/heads/{}:refs/heads/{}", branch, branch)
    } else {
        format!("refs/heads/{}:refs/heads/{}", branch, branch)
    };

    let mut push_opts = AuthCallbacks::push_options();

    remote
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Pushed {} to {}", branch, remote_name))
}

/// Pull from remote repository (fetch + merge)
#[tauri::command]
pub fn git_pull(
    path: String,
    remote_name: Option<String>,
    branch_name: Option<String>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let remote_name = remote_name.as_deref().unwrap_or("origin");
    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| GitError::from(e))?;

    // Get the branch to pull
    let branch = match &branch_name {
        Some(b) => b.clone(),
        None => {
            let head = repo.head().map_err(|e| GitError::from(e))?;
            head.shorthand().unwrap_or("HEAD").to_string()
        }
    };

    // Fetch
    let mut fetch_opts = AuthCallbacks::fetch_options();
    let refspec = format!(
        "refs/heads/{}:refs/remotes/{}/{}",
        branch, remote_name, branch
    );
    remote
        .fetch(&[&refspec], Some(&mut fetch_opts), None)
        .map_err(|e| GitError::from(e))?;

    // Get fetch head
    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| GitError::from(e))?;
    let fetch_commit = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| GitError::from(e))?;

    // Perform merge analysis
    let (analysis, _) = repo
        .merge_analysis(&[&fetch_commit])
        .map_err(|e| GitError::from(e))?;

    if analysis.is_up_to_date() {
        return Ok("Already up to date".to_string());
    }

    if analysis.is_fast_forward() {
        // Fast-forward merge
        let refname = format!("refs/heads/{}", branch);
        let mut reference = repo
            .find_reference(&refname)
            .map_err(|e| GitError::from(e))?;
        reference
            .set_target(fetch_commit.id(), "Fast-forward")
            .map_err(|e| GitError::from(e))?;

        // Checkout
        let mut checkout = git2::build::CheckoutBuilder::new();
        checkout.force();
        repo.checkout_head(Some(&mut checkout))
            .map_err(|e| GitError::from(e))?;

        return Ok("Fast-forward merge completed".to_string());
    }

    if analysis.is_normal() {
        // Regular merge
        let head = repo.head().map_err(|e| GitError::from(e))?;
        let head_commit = head.peel_to_commit().map_err(|e| GitError::from(e))?;
        let fetch_commit_obj = repo
            .find_commit(fetch_commit.id())
            .map_err(|e| GitError::from(e))?;

        let mut index = repo
            .merge_commits(&head_commit, &fetch_commit_obj, None)
            .map_err(|e| GitError::from(e))?;

        if index.has_conflicts() {
            // Write the merge state
            repo.merge(&[&fetch_commit], None, None)
                .map_err(|e| GitError::from(e))?;
            return Err("Merge conflicts detected. Resolve conflicts and commit.".to_string());
        }

        // No conflicts, complete merge
        let sig = repo.signature().map_err(|e| GitError::from(e))?;
        let tree_id = index.write_tree_to(&repo).map_err(|e| GitError::from(e))?;
        let tree = repo.find_tree(tree_id).map_err(|e| GitError::from(e))?;

        let message = format!(
            "Merge branch '{}' of {} into {}",
            branch, remote_name, branch
        );

        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[&head_commit, &fetch_commit_obj],
        )
        .map_err(|e| GitError::from(e))?;

        // Cleanup
        repo.cleanup_state().map_err(|e| GitError::from(e))?;

        return Ok("Merge completed".to_string());
    }

    Err("Cannot perform pull: unhandled merge scenario".to_string())
}

/// Fetch from remote repository
#[tauri::command]
pub fn git_fetch(path: String, remote_name: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let remote_name = remote_name.as_deref().unwrap_or("origin");
    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| GitError::from(e))?;

    let mut fetch_opts = AuthCallbacks::fetch_options();
    fetch_opts.download_tags(AutotagOption::All);

    remote
        .fetch::<&str>(&[], Some(&mut fetch_opts), None)
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Fetched from {}", remote_name))
}

/// Clone a repository
#[tauri::command]
pub fn git_clone(
    window: tauri::Window,
    url: String,
    destination: String,
    branch: Option<String>,
    _depth: Option<u32>,
) -> Result<String, String> {
    use tauri::Emitter;

    let mut builder = git2::build::RepoBuilder::new();

    // Set up fetch options with auth
    let mut fetch_opts = AuthCallbacks::fetch_options();

    // Set up progress callback
    let window_clone = window.clone();
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.transfer_progress(move |progress| {
        let percent = if progress.total_objects() > 0 {
            ((progress.received_objects() as f64 / progress.total_objects() as f64) * 100.0) as u32
        } else {
            0
        };

        let _ = window_clone.emit(
            "git:clone-progress",
            CloneProgress {
                phase: "Downloading".to_string(),
                received_objects: progress.received_objects(),
                total_objects: progress.total_objects(),
                indexed_objects: progress.indexed_objects(),
                received_bytes: progress.received_bytes(),
                percent,
            },
        );

        true
    });

    fetch_opts.remote_callbacks(callbacks);
    builder.fetch_options(fetch_opts);

    // Set branch if specified
    if let Some(ref b) = branch {
        builder.branch(b);
    }

    // Clone
    builder
        .clone(&url, std::path::Path::new(&destination))
        .map_err(|e| GitError::from(e))?;

    Ok(format!("Cloned {} to {}", url, destination))
}

/// List remotes
#[tauri::command]
pub fn git_list_remotes(path: String) -> Result<Vec<RemoteInfo>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let remote_names = repo.remotes().map_err(|e| GitError::from(e))?;

    let mut remotes = Vec::new();

    for name in remote_names.iter() {
        if let Some(name) = name {
            if let Ok(remote) = repo.find_remote(name) {
                remotes.push(RemoteInfo {
                    name: name.to_string(),
                    fetch_url: remote.url().unwrap_or("").to_string(),
                    push_url: remote
                        .pushurl()
                        .unwrap_or(remote.url().unwrap_or(""))
                        .to_string(),
                });
            }
        }
    }

    Ok(remotes)
}

/// Add a remote
#[tauri::command]
pub fn git_add_remote(path: String, name: String, url: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    repo.remote(&name, &url).map_err(|e| GitError::from(e))?;
    Ok(format!("Added remote: {} -> {}", name, url))
}

/// Remove a remote
#[tauri::command]
pub fn git_remove_remote(path: String, name: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    repo.remote_delete(&name).map_err(|e| GitError::from(e))?;
    Ok(format!("Removed remote: {}", name))
}

/// Set remote URL
#[tauri::command]
pub fn git_set_remote_url(path: String, name: String, url: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    repo.remote_set_url(&name, &url)
        .map_err(|e| GitError::from(e))?;
    Ok(format!("Updated remote {} URL to {}", name, url))
}
