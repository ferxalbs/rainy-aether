//! Git History Operations
//!
//! Native libgit2 implementation for log, diff, and commit history.

use super::error::GitError;
use super::types::{CommitInfo, FileDiff};
use git2::{DiffOptions, Repository, Time};

/// Format git time to ISO 8601 format
fn format_time(time: Time) -> String {
    use chrono::{FixedOffset, Offset, TimeZone, Utc};

    let offset_minutes = time.offset_minutes();
    let offset = FixedOffset::east_opt(offset_minutes * 60).unwrap_or(Utc.fix());
    let dt = offset
        .timestamp_opt(time.seconds(), 0)
        .single()
        .unwrap_or_else(|| Utc::now().with_timezone(&offset));

    dt.format("%Y-%m-%dT%H:%M:%S%:z").to_string()
}

/// Get commit history
#[tauri::command]
pub fn git_log(path: String, max_count: Option<u32>) -> Result<Vec<CommitInfo>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let mut revwalk = repo.revwalk().map_err(|e| GitError::from(e))?;

    revwalk.push_head().map_err(|e| GitError::from(e))?;

    let limit = max_count.unwrap_or(100) as usize;
    let mut commits = Vec::with_capacity(limit);

    for (i, oid) in revwalk.enumerate() {
        if i >= limit {
            break;
        }

        let oid = oid.map_err(|e| GitError::from(e))?;
        let commit = repo.find_commit(oid).map_err(|e| GitError::from(e))?;
        let author = commit.author();

        commits.push(CommitInfo {
            hash: oid.to_string(),
            author: author.name().unwrap_or("").to_string(),
            email: author.email().unwrap_or("").to_string(),
            date: format_time(author.when()),
            message: commit
                .message()
                .unwrap_or("")
                .lines()
                .next()
                .unwrap_or("")
                .to_string(),
        });
    }

    Ok(commits)
}

/// Sync status for status bar - returns ahead/behind counts
#[derive(serde::Serialize)]
pub struct SyncStatus {
    pub ahead: u32,
    pub behind: u32,
    pub has_remote: bool,
    pub branch: Option<String>,
    pub remote: Option<String>,
}

/// Get sync status (ahead/behind remote)
#[tauri::command]
pub fn git_sync_status(path: String) -> Result<SyncStatus, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Get HEAD
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => {
            return Ok(SyncStatus {
                ahead: 0,
                behind: 0,
                has_remote: false,
                branch: None,
                remote: None,
            });
        }
    };

    let branch_name = head.shorthand().map(|s| s.to_string());

    // Check if we have a remote
    let remotes = repo.remotes().map_err(|e| GitError::from(e))?;
    if remotes.is_empty() {
        return Ok(SyncStatus {
            ahead: 0,
            behind: 0,
            has_remote: false,
            branch: branch_name,
            remote: None,
        });
    }

    // Get branch name for upstream lookup
    let branch = match &branch_name {
        Some(b) => b,
        None => {
            return Ok(SyncStatus {
                ahead: 0,
                behind: 0,
                has_remote: !remotes.is_empty(),
                branch: None,
                remote: None,
            });
        }
    };

    // Try to find upstream
    let upstream_name = format!("refs/remotes/origin/{}", branch);
    let upstream = match repo.find_reference(&upstream_name) {
        Ok(r) => r,
        Err(_) => {
            return Ok(SyncStatus {
                ahead: 0,
                behind: 0,
                has_remote: true,
                branch: branch_name,
                remote: Some("origin".to_string()),
            });
        }
    };

    let head_oid = match head.target() {
        Some(oid) => oid,
        None => {
            return Ok(SyncStatus {
                ahead: 0,
                behind: 0,
                has_remote: true,
                branch: branch_name,
                remote: Some("origin".to_string()),
            });
        }
    };

    let upstream_oid = match upstream.target() {
        Some(oid) => oid,
        None => {
            return Ok(SyncStatus {
                ahead: 0,
                behind: 0,
                has_remote: true,
                branch: branch_name,
                remote: Some("origin".to_string()),
            });
        }
    };

    // Get ahead/behind using graph_ahead_behind
    let (ahead, behind) = repo
        .graph_ahead_behind(head_oid, upstream_oid)
        .unwrap_or((0, 0));

    Ok(SyncStatus {
        ahead: ahead as u32,
        behind: behind as u32,
        has_remote: true,
        branch: branch_name,
        remote: Some("origin".to_string()),
    })
}

/// Get list of unpushed commits
#[tauri::command]
pub fn git_unpushed(path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    // Get HEAD
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(vec![]),
    };

    // Get upstream reference
    let branch = match head.shorthand() {
        Some(b) => b.to_string(),
        None => return Ok(vec![]),
    };

    let upstream_name = format!("refs/remotes/origin/{}", branch);
    let upstream = match repo.find_reference(&upstream_name) {
        Ok(r) => r,
        Err(_) => return Ok(vec![]), // No upstream, so nothing is considered "unpushed"
    };

    let head_oid = head
        .target()
        .ok_or_else(|| "HEAD has no target".to_string())?;
    let upstream_oid = upstream
        .target()
        .ok_or_else(|| "Upstream has no target".to_string())?;

    // Find commits between upstream and HEAD
    let mut revwalk = repo.revwalk().map_err(|e| GitError::from(e))?;
    revwalk.push(head_oid).map_err(|e| GitError::from(e))?;
    revwalk.hide(upstream_oid).map_err(|e| GitError::from(e))?;

    let unpushed: Vec<String> = revwalk
        .filter_map(|oid| oid.ok())
        .map(|oid| oid.to_string())
        .collect();

    Ok(unpushed)
}

/// Show files changed in a commit
#[tauri::command]
pub fn git_show_files(path: String, commit_hash: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit_hash).map_err(|e| GitError::from(e))?;
    let commit = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    let tree = commit.tree().map_err(|e| GitError::from(e))?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| GitError::from(e))?
                .tree()
                .map_err(|e| GitError::from(e))?,
        )
    } else {
        None
    };

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(|e| GitError::from(e))?;

    let mut files = Vec::new();
    diff.foreach(
        &mut |delta, _| {
            if let Some(path) = delta.new_file().path() {
                files.push(path.to_string_lossy().to_string());
            }
            true
        },
        None,
        None,
        None,
    )
    .map_err(|e| GitError::from(e))?;

    Ok(files)
}

/// Get diff for a commit
#[tauri::command]
pub fn git_diff(
    path: String,
    commit_hash: String,
    file_path: Option<String>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit_hash).map_err(|e| GitError::from(e))?;
    let commit = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    let tree = commit.tree().map_err(|e| GitError::from(e))?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| GitError::from(e))?
                .tree()
                .map_err(|e| GitError::from(e))?,
        )
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    if let Some(ref fp) = file_path {
        opts.pathspec(fp);
    }

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    let mut diff_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        if origin == '+' || origin == '-' || origin == ' ' {
            diff_text.push(origin);
        }
        diff_text.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| GitError::from(e))?;

    Ok(diff_text)
}

/// Get diff for a specific file (working tree or staged)
#[tauri::command]
pub fn git_diff_file(
    path: String,
    file_path: String,
    staged: Option<bool>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;

    let mut opts = DiffOptions::new();
    opts.pathspec(&file_path);

    let diff = if staged.unwrap_or(false) {
        // Staged: compare HEAD to index
        let head = repo.head().map_err(|e| GitError::from(e))?;
        let head_tree = head.peel_to_tree().map_err(|e| GitError::from(e))?;
        repo.diff_tree_to_index(Some(&head_tree), None, Some(&mut opts))
            .map_err(|e| GitError::from(e))?
    } else {
        // Unstaged: compare index to workdir
        repo.diff_index_to_workdir(None, Some(&mut opts))
            .map_err(|e| GitError::from(e))?
    };

    let mut diff_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        if origin == '+' || origin == '-' || origin == ' ' {
            diff_text.push(origin);
        }
        diff_text.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| GitError::from(e))?;

    Ok(diff_text)
}

/// Get diff for all files in a commit (with optional metadata-only mode)
#[tauri::command]
pub fn git_diff_commit(
    path: String,
    commit: String,
    metadata_only: Option<bool>,
    max_lines_per_file: Option<usize>,
) -> Result<Vec<FileDiff>, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit).map_err(|e| GitError::from(e))?;
    let commit_obj = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    let tree = commit_obj.tree().map_err(|e| GitError::from(e))?;
    let parent_tree = if commit_obj.parent_count() > 0 {
        Some(
            commit_obj
                .parent(0)
                .map_err(|e| GitError::from(e))?
                .tree()
                .map_err(|e| GitError::from(e))?,
        )
    } else {
        None
    };

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(|e| GitError::from(e))?;

    let _stats = diff.stats().map_err(|e| GitError::from(e))?;
    let metadata_only = metadata_only.unwrap_or(false);
    let max_lines = max_lines_per_file.unwrap_or(500);

    let mut file_diffs = Vec::new();

    for i in 0..diff.deltas().len() {
        let delta = diff
            .get_delta(i)
            .ok_or_else(|| "Delta not found".to_string())?;
        let new_file = delta.new_file();
        let old_file = delta.old_file();

        let file_path = new_file
            .path()
            .or_else(|| old_file.path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let old_path = if delta.status() == git2::Delta::Renamed {
            old_file.path().map(|p| p.to_string_lossy().to_string())
        } else {
            None
        };

        let status = match delta.status() {
            git2::Delta::Added => "A",
            git2::Delta::Deleted => "D",
            git2::Delta::Modified => "M",
            git2::Delta::Renamed => "R",
            git2::Delta::Copied => "C",
            _ => "?",
        }
        .to_string();

        let diff_content = if metadata_only {
            String::new()
        } else {
            // Get diff for this specific file
            let mut opts = DiffOptions::new();
            opts.pathspec(&file_path);

            let single_diff = repo
                .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
                .map_err(|e| GitError::from(e))?;

            let mut text = String::new();
            let mut line_count = 0;

            single_diff
                .print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
                    if line_count < max_lines {
                        let origin = line.origin();
                        if origin == '+' || origin == '-' || origin == ' ' {
                            text.push(origin);
                        }
                        text.push_str(&String::from_utf8_lossy(line.content()));
                        line_count += 1;
                    }
                    true
                })
                .ok();

            text
        };

        file_diffs.push(FileDiff {
            path: file_path,
            old_path,
            status,
            additions: 0, // Would need per-file stats
            deletions: 0,
            diff: diff_content,
        });
    }

    Ok(file_diffs)
}

/// Get diff for a specific file in a commit (lazy loading)
#[tauri::command]
pub fn git_diff_commit_file(
    path: String,
    commit: String,
    file_path: String,
    max_lines: Option<usize>,
) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| GitError::from(e))?;
    let oid = git2::Oid::from_str(&commit).map_err(|e| GitError::from(e))?;
    let commit_obj = repo.find_commit(oid).map_err(|e| GitError::from(e))?;

    let tree = commit_obj.tree().map_err(|e| GitError::from(e))?;
    let parent_tree = if commit_obj.parent_count() > 0 {
        Some(
            commit_obj
                .parent(0)
                .map_err(|e| GitError::from(e))?
                .tree()
                .map_err(|e| GitError::from(e))?,
        )
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    opts.pathspec(&file_path);

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
        .map_err(|e| GitError::from(e))?;

    let max = max_lines.unwrap_or(500);
    let mut diff_text = String::new();
    let mut line_count = 0;

    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        if line_count < max {
            let origin = line.origin();
            if origin == '+' || origin == '-' || origin == ' ' {
                diff_text.push(origin);
            }
            diff_text.push_str(&String::from_utf8_lossy(line.content()));
            line_count += 1;
        }
        true
    })
    .map_err(|e| GitError::from(e))?;

    Ok(diff_text)
}
