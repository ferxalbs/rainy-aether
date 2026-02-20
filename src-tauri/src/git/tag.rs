//! Git Tag Operations
//!
//! Native libgit2 implementation for listing, creating, deleting, and pushing tags.

use super::auth::AuthCallbacks;
use super::error::GitError;
use super::types::TagInfo;
use chrono::{FixedOffset, Offset, TimeZone, Utc};
use git2::Repository;

fn format_tag_time(time: git2::Time) -> String {
    let offset_minutes = time.offset_minutes();
    let offset = FixedOffset::east_opt(offset_minutes * 60).unwrap_or(Utc.fix());
    let dt = offset
        .timestamp_opt(time.seconds(), 0)
        .single()
        .unwrap_or_else(|| Utc::now().with_timezone(&offset));
    dt.format("%Y-%m-%dT%H:%M:%S%:z").to_string()
}

#[tauri::command]
pub fn git_list_tags(path: String) -> Result<Vec<TagInfo>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let tag_names = repo.tag_names(None).map_err(|e| GitError::from(e))?;

    let mut tags = Vec::new();

    for name in tag_names.iter().flatten() {
        let ref_name = format!("refs/tags/{}", name);
        let reference = repo.find_reference(&ref_name).map_err(|e| GitError::from(e))?;
        let tag_oid = reference
            .target()
            .ok_or_else(|| "Tag reference has no target".to_string())?;

        let mut message = None;
        let mut tagger = None;
        let mut date = None;

        let commit_oid = if let Ok(tag_obj) = repo.find_tag(tag_oid) {
            message = tag_obj.message().map(|s| s.to_string());
            if let Some(sig) = tag_obj.tagger() {
                tagger = sig.name().map(|s| s.to_string());
                date = Some(format_tag_time(sig.when()));
            }
            tag_obj.target_id()
        } else {
            let commit = repo
                .find_object(tag_oid, None)
                .and_then(|obj| obj.peel_to_commit())
                .map_err(|e| GitError::from(e))?;
            commit.id()
        };

        tags.push(TagInfo {
            name: name.to_string(),
            commit: commit_oid.to_string(),
            message,
            tagger,
            date,
        });
    }

    Ok(tags)
}

#[tauri::command]
pub fn git_create_tag(
    path: String,
    name: String,
    message: Option<String>,
    commit: Option<String>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let target_commit = match commit {
        Some(hash) => {
            let oid = git2::Oid::from_str(&hash).map_err(|e| GitError::from(e))?;
            repo.find_commit(oid).map_err(|e| GitError::from(e))?
        }
        None => repo
            .head()
            .map_err(|e| GitError::from(e))?
            .peel_to_commit()
            .map_err(|e| GitError::from(e))?,
    };

    if let Some(msg) = message {
        let sig = repo.signature().map_err(|e| GitError::from(e))?;
        let oid = repo
            .tag(&name, target_commit.as_object(), &sig, &msg, false)
            .map_err(|e| GitError::from(e))?;
        Ok(format!("Created annotated tag {} ({})", name, oid))
    } else {
        let oid = repo
            .tag_lightweight(&name, target_commit.as_object(), false)
            .map_err(|e| GitError::from(e))?;
        Ok(format!("Created lightweight tag {} ({})", name, oid))
    }
}

#[tauri::command]
pub fn git_delete_tag(path: String, name: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    repo.tag_delete(&name).map_err(|e| GitError::from(e))?;
    Ok(format!("Deleted tag {}", name))
}

#[tauri::command]
pub fn git_push_tag(path: String, name: String, remote: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let remote_name = remote.as_deref().unwrap_or("origin");
    let mut repo_remote = repo.find_remote(remote_name).map_err(|e| GitError::from(e))?;
    let refspec = format!("refs/tags/{0}:refs/tags/{0}", name);
    let mut push_opts = AuthCallbacks::push_options();
    repo_remote
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| GitError::from(e))?;
    Ok(format!("Pushed tag {} to {}", name, remote_name))
}

#[tauri::command]
pub fn git_push_all_tags(path: String, remote: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let remote_name = remote.as_deref().unwrap_or("origin");
    let mut repo_remote = repo.find_remote(remote_name).map_err(|e| GitError::from(e))?;
    let mut push_opts = AuthCallbacks::push_options();
    repo_remote
        .push(&["refs/tags/*:refs/tags/*"], Some(&mut push_opts))
        .map_err(|e| GitError::from(e))?;
    Ok(format!("Pushed all tags to {}", remote_name))
}
