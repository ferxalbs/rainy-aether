use serde::Serialize;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Debug, Clone)]
pub struct GitStatus {
    pub branch: Option<String>,
    pub ahead: Option<u32>,
    pub behind: Option<u32>,
    pub staged: u32,
    pub modified: u32,
    pub untracked: u32,
    pub conflicts: u32,
    pub clean: bool,
    pub commit: Option<String>,
    pub remote: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct Commit {
    pub hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

fn run_git(args: &[&str], cwd: &str) -> Result<String, String> {
    // CREATE_NO_WINDOW = 0x08000000
    // This flag prevents the creation of a console window on Windows
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    #[cfg(target_os = "windows")]
    let output = Command::new("git")
        .args(["-C", cwd])
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("git")
        .args(["-C", cwd])
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn git_is_repo(path: String) -> Result<bool, String> {
    match run_git(&["rev-parse", "--is-inside-work-tree"], &path) {
        Ok(s) => Ok(s.trim() == "true"),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn git_log(path: String, max_count: Option<u32>) -> Result<Vec<Commit>, String> {
    let count = max_count.unwrap_or(50).to_string();
    let fmt = "%H%x1f%an%x1f%ae%x1f%ad%x1f%s"; // unit separator \x1f
                                               // FIX: '--pretty' must include the format in the same arg
    let pretty_arg = format!("--pretty=format:{}", fmt);
    let count_arg = count;
    let args_vec = vec![
        "log",
        "--date=iso-strict",
        pretty_arg.as_str(),
        "--max-count",
        count_arg.as_str(),
    ];

    let output = run_git(&args_vec, &path)?;
    let mut commits = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split('\u{001F}').collect();
        if parts.len() >= 5 {
            commits.push(Commit {
                hash: parts[0].to_string(),
                author: parts[1].to_string(),
                email: parts[2].to_string(),
                date: parts[3].to_string(),
                message: parts[4].to_string(),
            });
        }
    }
    Ok(commits)
}

#[tauri::command]
pub fn git_show_files(path: String, commit_hash: String) -> Result<Vec<String>, String> {
    // List files changed in a commit
    let args = ["show", "--pretty=", "--name-only", &commit_hash];
    let output = run_git(&args, &path)?;
    let files: Vec<String> = output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(files)
}

#[tauri::command]
pub fn git_diff(
    path: String,
    commit_hash: String,
    file_path: Option<String>,
) -> Result<String, String> {
    // Show diff for a commit, optionally filtered by file
    let mut args = vec!["show", "--pretty=medium", "--patch", &commit_hash];
    if let Some(fp) = file_path.as_ref() {
        args.push("--");
        args.push(fp);
    }
    run_git(&args, &path)
}

#[derive(Serialize, Debug, Clone)]
pub struct StatusEntry {
    pub path: String,
    pub code: String, // two-letter porcelain code (XY)
}

#[tauri::command]
pub fn git_status(path: String) -> Result<Vec<StatusEntry>, String> {
    // Use porcelain format for machine parsing
    let output = run_git(&["status", "--porcelain"], &path)?;
    let mut entries = Vec::new();
    for line in output.lines() {
        // Format: XY <path> [-> <path2>]
        if line.len() < 3 {
            continue;
        }
        let code = &line[0..2];
        let rest = line[3..].trim();
        // Handle renames: "R  a -> b"
        let path = if let Some(idx) = rest.find(" -> ") {
            rest[idx + 4..].to_string()
        } else {
            rest.to_string()
        };
        entries.push(StatusEntry {
            path,
            code: code.to_string(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn git_commit(
    path: String,
    message: String,
    stage_all: Option<bool>,
) -> Result<String, String> {
    // Optionally stage all
    if stage_all.unwrap_or(false) {
        let _ = run_git(&["add", "-A"], &path)?;
    }
    // Commit
    let _ = run_git(&["commit", "-m", &message], &path)?;
    // Return new HEAD hash
    let hash = run_git(&["rev-parse", "HEAD"], &path)?;
    Ok(hash.trim().to_string())
}

#[tauri::command]
pub fn git_unpushed(path: String) -> Result<Vec<String>, String> {
    // Try to get upstream ref. If none, return empty set.
    match run_git(&["rev-parse", "--abbrev-ref", "@{u}"], &path) {
        Ok(upstream_ref) => {
            let up = upstream_ref.trim();
            if up.is_empty() {
                return Ok(vec![]);
            }
            let spec = format!("{}..HEAD", up);
            let output = run_git(&["rev-list", &spec], &path)?;
            let hashes: Vec<String> = output
                .lines()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            Ok(hashes)
        }
        Err(_) => Ok(vec![]),
    }
}

#[derive(Serialize, Debug, Clone)]
pub struct Branch {
    pub name: String,
    pub current: bool,
    pub remote: Option<String>,
}

#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<Branch>, String> {
    let output = run_git(
        &[
            "branch",
            "-a",
            "--format=%(refname:short)%00%(HEAD)%00%(upstream:track)",
        ],
        &path,
    )?;
    let mut branches = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split('\u{00}').collect();
        if parts.len() >= 2 {
            let name = parts[0].trim().to_string();
            let is_current = parts[1].trim() == "*";
            let remote = if parts.len() > 2 && !parts[2].trim().is_empty() {
                Some(parts[2].trim().to_string())
            } else {
                None
            };

            // Filter out remote branches for now (they start with "remotes/")
            if !name.starts_with("remotes/") && !name.is_empty() {
                branches.push(Branch {
                    name,
                    current: is_current,
                    remote,
                });
            }
        }
    }
    Ok(branches)
}

#[tauri::command]
pub fn git_checkout_branch(path: String, branch_name: String) -> Result<String, String> {
    run_git(&["checkout", &branch_name], &path)
}

#[tauri::command]
pub fn git_create_branch(path: String, branch_name: String) -> Result<String, String> {
    run_git(&["checkout", "-b", &branch_name], &path)
}

#[tauri::command]
pub fn git_stage_file(path: String, file_path: String) -> Result<String, String> {
    run_git(&["add", &file_path], &path)
}

#[tauri::command]
pub fn git_unstage_file(path: String, file_path: String) -> Result<String, String> {
    run_git(&["reset", "HEAD", &file_path], &path)
}

#[tauri::command]
pub fn git_discard_changes(path: String, file_path: String) -> Result<String, String> {
    run_git(&["checkout", "--", &file_path], &path)
}

#[tauri::command]
pub fn git_diff_file(
    path: String,
    file_path: String,
    staged: Option<bool>,
) -> Result<String, String> {
    let args = if staged.unwrap_or(false) {
        vec!["diff", "--staged", "--", &file_path]
    } else {
        vec!["diff", "--", &file_path]
    };
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_push(
    path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let remote_name = remote.as_deref().unwrap_or("origin");
    let branch_name = branch.as_deref().unwrap_or("HEAD");
    run_git(&["push", remote_name, branch_name], &path)
}

#[tauri::command]
pub fn git_pull(
    path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let remote_name = remote.as_deref().unwrap_or("origin");
    let branch_name = branch.as_deref().unwrap_or("");
    let args = if branch_name.is_empty() {
        vec!["pull", remote_name]
    } else {
        vec!["pull", remote_name, branch_name]
    };
    run_git(&args, &path)
}

#[derive(Serialize, Debug, Clone)]
pub struct StashEntry {
    pub stash: String,
    pub message: String,
}

#[tauri::command]
pub fn git_stash_list(path: String) -> Result<Vec<StashEntry>, String> {
    let output = run_git(&["stash", "list", "--format=%gd%x00%gs"], &path)?;
    let mut stashes = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split('\u{00}').collect();
        if parts.len() >= 2 {
            stashes.push(StashEntry {
                stash: parts[0].trim().to_string(),
                message: parts[1].trim().to_string(),
            });
        }
    }
    Ok(stashes)
}

#[tauri::command]
pub fn git_stash_push(path: String, message: Option<String>) -> Result<String, String> {
    let args = if let Some(msg) = &message {
        vec!["stash", "push", "-m", msg.as_str()]
    } else {
        vec!["stash", "push"]
    };
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_stash_pop(path: String, stash: Option<String>) -> Result<String, String> {
    let args = if let Some(stash_ref) = &stash {
        vec!["stash", "pop", stash_ref.as_str()]
    } else {
        vec!["stash", "pop"]
    };
    run_git(&args, &path)
}

// Additional commands for status bar integration
#[tauri::command]
pub fn git_get_status(path: String) -> Result<GitStatus, String> {
    // Get current branch
    let branch = match run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &path) {
        Ok(b) => Some(b.trim().to_string()),
        Err(_) => None,
    };

    // Get status
    let status_entries = git_status(path.clone()).unwrap_or_default();

    // Count different types of changes
    let mut staged = 0;
    let mut modified = 0;
    let mut untracked = 0;
    let mut conflicts = 0;

    for entry in &status_entries {
        let code = &entry.code;
        if code.len() >= 2 {
            // Safe unwrap: we checked len >= 2
            if let Some(first_char) = code.chars().next() {
                match first_char {
                    'A' | 'M' | 'D' | 'R' | 'C' => staged += 1,
                    'U' => conflicts += 1,
                    _ => {}
                }
            }
            if let Some(second_char) = code.chars().nth(1) {
                match second_char {
                    'M' | 'D' => modified += 1,
                    'U' => conflicts += 1,
                    '?' => untracked += 1,
                    _ => {}
                }
            }
        }
    }

    // Get ahead/behind info
    let (ahead, behind) = match run_git(
        &["rev-list", "--count", "--left-right", "@{upstream}...HEAD"],
        &path,
    ) {
        Ok(output) => {
            let parts: Vec<&str> = output.trim().split('\t').collect();
            let behind_count = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
            let ahead_count = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
            (Some(ahead_count), Some(behind_count))
        }
        Err(_) => (None, None),
    };

    // Get current commit
    let commit = match run_git(&["rev-parse", "HEAD"], &path) {
        Ok(c) => Some(c.trim().to_string()),
        Err(_) => None,
    };

    // Get remote
    let remote = match run_git(&["config", "--get", "branch.main.remote"], &path) {
        Ok(r) => Some(r.trim().to_string()),
        Err(_) => match run_git(&["config", "--get", "branch.master.remote"], &path) {
            Ok(r) => Some(r.trim().to_string()),
            Err(_) => None,
        },
    };

    let clean = staged == 0 && modified == 0 && untracked == 0 && conflicts == 0;

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        modified,
        untracked,
        conflicts,
        clean,
        commit,
        remote,
    })
}

#[tauri::command]
pub fn git_get_current_branch(path: String) -> Result<String, String> {
    run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &path)
}

#[tauri::command]
pub fn git_get_commit_info(path: String) -> Result<CommitInfo, String> {
    let output = run_git(
        &["log", "-1", "--pretty=format:%H%x00%s%x00%an%x00%ad"],
        &path,
    )?;
    let parts: Vec<&str> = output.split('\u{00}').collect();

    if parts.len() >= 4 {
        Ok(CommitInfo {
            hash: parts[0].trim().to_string(),
            message: parts[1].trim().to_string(),
            author: parts[2].trim().to_string(),
            date: parts[3].trim().to_string(),
        })
    } else {
        Err("Failed to parse commit info".to_string())
    }
}

#[tauri::command]
pub fn git_stage_all(path: String) -> Result<String, String> {
    run_git(&["add", "-A"], &path)
}

#[tauri::command]
pub fn git_unstage_all(path: String) -> Result<String, String> {
    run_git(&["reset", "HEAD"], &path)
}

#[tauri::command]
pub fn git_switch_branch(path: String, branch_name: String) -> Result<String, String> {
    run_git(&["checkout", &branch_name], &path)
}

#[tauri::command]
pub fn git_get_branches(path: String) -> Result<Vec<String>, String> {
    let output = run_git(&["branch", "--format=%(refname:short)"], &path)?;
    let branches: Vec<String> = output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(branches)
}

// ============================================================================
// CLONE & REMOTE OPERATIONS
// ============================================================================

#[derive(Serialize, Debug, Clone)]
pub struct CloneProgress {
    pub phase: String,
    pub percent: u32,
    pub message: String,
}

#[tauri::command]
pub fn git_clone(
    url: String,
    destination: String,
    branch: Option<String>,
    depth: Option<u32>,
) -> Result<String, String> {
    let mut args = vec!["clone"];

    if let Some(b) = &branch {
        args.push("--branch");
        args.push(b.as_str());
    }

    let depth_str = depth.map(|d| d.to_string());
    if let Some(ref d) = depth_str {
        args.push("--depth");
        args.push(d.as_str());
    }

    args.push("--progress");
    args.push(&url);
    args.push(&destination);

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    #[cfg(target_os = "windows")]
    let output = Command::new("git")
        .args(&args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[derive(Serialize, Debug, Clone)]
pub struct Remote {
    pub name: String,
    pub fetch_url: String,
    pub push_url: String,
}

#[tauri::command]
pub fn git_list_remotes(path: String) -> Result<Vec<Remote>, String> {
    let output = run_git(&["remote", "-v"], &path)?;
    let mut remotes_map: std::collections::HashMap<String, Remote> =
        std::collections::HashMap::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let name = parts[0].to_string();
            let url = parts[1].to_string();
            let remote_type = parts[2].trim_matches(|c| c == '(' || c == ')');

            let remote = remotes_map.entry(name.clone()).or_insert(Remote {
                name: name.clone(),
                fetch_url: String::new(),
                push_url: String::new(),
            });

            if remote_type == "fetch" {
                remote.fetch_url = url;
            } else if remote_type == "push" {
                remote.push_url = url;
            }
        }
    }

    Ok(remotes_map.into_values().collect())
}

#[tauri::command]
pub fn git_add_remote(path: String, name: String, url: String) -> Result<String, String> {
    run_git(&["remote", "add", &name, &url], &path)
}

#[tauri::command]
pub fn git_remove_remote(path: String, name: String) -> Result<String, String> {
    run_git(&["remote", "remove", &name], &path)
}

#[tauri::command]
pub fn git_rename_remote(
    path: String,
    old_name: String,
    new_name: String,
) -> Result<String, String> {
    run_git(&["remote", "rename", &old_name, &new_name], &path)
}

#[tauri::command]
pub fn git_set_remote_url(path: String, name: String, url: String) -> Result<String, String> {
    run_git(&["remote", "set-url", &name, &url], &path)
}

#[tauri::command]
pub fn git_fetch(
    path: String,
    remote: Option<String>,
    prune: Option<bool>,
) -> Result<String, String> {
    let remote_name = remote.as_deref().unwrap_or("origin");
    let mut args = vec!["fetch", remote_name];

    if prune.unwrap_or(false) {
        args.push("--prune");
    }

    run_git(&args, &path)
}

#[tauri::command]
pub fn git_fetch_all(path: String, prune: Option<bool>) -> Result<String, String> {
    let mut args = vec!["fetch", "--all"];

    if prune.unwrap_or(false) {
        args.push("--prune");
    }

    run_git(&args, &path)
}

// ============================================================================
// MERGE & REBASE OPERATIONS
// ============================================================================

#[tauri::command]
pub fn git_merge(path: String, branch: String, no_ff: Option<bool>) -> Result<String, String> {
    let mut args = vec!["merge"];

    if no_ff.unwrap_or(false) {
        args.push("--no-ff");
    }

    args.push(&branch);
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_merge_abort(path: String) -> Result<String, String> {
    run_git(&["merge", "--abort"], &path)
}

#[tauri::command]
pub fn git_rebase(
    path: String,
    branch: String,
    interactive: Option<bool>,
) -> Result<String, String> {
    let mut args = vec!["rebase"];

    if interactive.unwrap_or(false) {
        args.push("-i");
    }

    args.push(&branch);
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_rebase_abort(path: String) -> Result<String, String> {
    run_git(&["rebase", "--abort"], &path)
}

#[tauri::command]
pub fn git_rebase_continue(path: String) -> Result<String, String> {
    run_git(&["rebase", "--continue"], &path)
}

#[tauri::command]
pub fn git_rebase_skip(path: String) -> Result<String, String> {
    run_git(&["rebase", "--skip"], &path)
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

#[derive(Serialize, Debug, Clone)]
pub struct ConflictFile {
    pub path: String,
    pub ours: String,
    pub theirs: String,
    pub base: String,
}

#[tauri::command]
pub fn git_list_conflicts(path: String) -> Result<Vec<String>, String> {
    let output = run_git(&["diff", "--name-only", "--diff-filter=U"], &path)?;
    let conflicts: Vec<String> = output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(conflicts)
}

#[tauri::command]
pub fn git_get_conflict_content(path: String, file_path: String) -> Result<ConflictFile, String> {
    // Get the conflicted file content
    let ours =
        run_git(&["show", &format!(":2:{}", file_path)], &path).unwrap_or_else(|_| String::new());
    let theirs =
        run_git(&["show", &format!(":3:{}", file_path)], &path).unwrap_or_else(|_| String::new());
    let base =
        run_git(&["show", &format!(":1:{}", file_path)], &path).unwrap_or_else(|_| String::new());

    Ok(ConflictFile {
        path: file_path,
        ours,
        theirs,
        base,
    })
}

#[tauri::command]
pub fn git_resolve_conflict(
    path: String,
    file_path: String,
    resolution: String,
) -> Result<String, String> {
    // Write the resolved content
    use std::fs;
    use std::path::Path;

    let full_path = Path::new(&path).join(&file_path);
    fs::write(&full_path, resolution)
        .map_err(|e| format!("Failed to write resolved file: {}", e))?;

    // Stage the resolved file
    run_git(&["add", &file_path], &path)
}

#[tauri::command]
pub fn git_accept_ours(path: String, file_path: String) -> Result<String, String> {
    run_git(&["checkout", "--ours", &file_path], &path)?;
    run_git(&["add", &file_path], &path)
}

#[tauri::command]
pub fn git_accept_theirs(path: String, file_path: String) -> Result<String, String> {
    run_git(&["checkout", "--theirs", &file_path], &path)?;
    run_git(&["add", &file_path], &path)
}

// ============================================================================
// TAG OPERATIONS
// ============================================================================

#[derive(Serialize, Debug, Clone)]
pub struct Tag {
    pub name: String,
    pub commit: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub fn git_list_tags(path: String) -> Result<Vec<Tag>, String> {
    let output = run_git(
        &["tag", "-l", "--format=%(refname:short)%00%(objectname:short)%00%(contents:subject)%00%(taggername)%00%(taggerdate:iso-strict)"],
        &path,
    )?;

    let mut tags = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split('\u{00}').collect();
        if parts.len() >= 2 {
            tags.push(Tag {
                name: parts[0].trim().to_string(),
                commit: parts[1].trim().to_string(),
                message: if parts.len() > 2 && !parts[2].is_empty() {
                    Some(parts[2].trim().to_string())
                } else {
                    None
                },
                tagger: if parts.len() > 3 && !parts[3].is_empty() {
                    Some(parts[3].trim().to_string())
                } else {
                    None
                },
                date: if parts.len() > 4 && !parts[4].is_empty() {
                    Some(parts[4].trim().to_string())
                } else {
                    None
                },
            });
        }
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
    let mut args = vec!["tag"];

    if let Some(msg) = &message {
        args.push("-a");
        args.push(&name);
        args.push("-m");
        args.push(msg.as_str());
    } else {
        args.push(&name);
    }

    if let Some(c) = &commit {
        args.push(c.as_str());
    }

    run_git(&args, &path)
}

#[tauri::command]
pub fn git_delete_tag(path: String, name: String) -> Result<String, String> {
    run_git(&["tag", "-d", &name], &path)
}

#[tauri::command]
pub fn git_push_tag(path: String, name: String, remote: Option<String>) -> Result<String, String> {
    let remote_name = remote.as_deref().unwrap_or("origin");
    run_git(&["push", remote_name, &name], &path)
}

#[tauri::command]
pub fn git_push_all_tags(path: String, remote: Option<String>) -> Result<String, String> {
    let remote_name = remote.as_deref().unwrap_or("origin");
    run_git(&["push", remote_name, "--tags"], &path)
}

// ============================================================================
// ENHANCED DIFF OPERATIONS
// ============================================================================

#[derive(Serialize, Debug, Clone)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String, // A, M, D, R, C
    pub additions: u32,
    pub deletions: u32,
    pub diff: String,
}

#[tauri::command]
pub fn git_diff_files(
    path: String,
    from: Option<String>,
    to: Option<String>,
    staged: Option<bool>,
) -> Result<Vec<FileDiff>, String> {
    let mut args = vec!["diff"];

    if staged.unwrap_or(false) {
        args.push("--staged");
    }

    args.push("--numstat");
    args.push("--name-status");

    if let Some(f) = &from {
        args.push(f.as_str());
    }

    if let Some(t) = &to {
        args.push(t.as_str());
    }

    let output = run_git(&args, &path)?;

    // Parse the output to get file statistics
    let mut diffs = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let status = parts[0].to_string();
            let file_path = parts[parts.len() - 1].to_string();

            // Get the actual diff for this file
            let mut diff_args = vec!["diff"];
            if staged.unwrap_or(false) {
                diff_args.push("--staged");
            }
            diff_args.push("--");
            diff_args.push(&file_path);

            let diff_output = run_git(&diff_args, &path).unwrap_or_default();

            diffs.push(FileDiff {
                path: file_path.clone(),
                old_path: None,
                status: status.clone(),
                additions: 0,
                deletions: 0,
                diff: diff_output,
            });
        }
    }

    Ok(diffs)
}

#[tauri::command]
pub fn git_diff_commit(path: String, commit: String) -> Result<Vec<FileDiff>, String> {
    // Get the list of files changed in the commit
    let files_output = run_git(&["show", "--pretty=", "--name-only", &commit], &path)?;
    let files: Vec<String> = files_output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let mut diffs = Vec::new();

    for file_path in files {
        // Get the diff for this specific file
        let diff_output = run_git(
            &["show", "--pretty=", "--patch", &commit, "--", &file_path],
            &path,
        )
        .unwrap_or_default();

        // Parse the diff to count additions and deletions
        let mut additions = 0;
        let mut deletions = 0;
        let mut status = "M".to_string(); // Default to modified

        for line in diff_output.lines() {
            if line.starts_with("@@") {
                // Parse hunk header to determine status if possible
                // This is a simplified approach
            } else if line.starts_with("+") && !line.starts_with("+++") {
                additions += 1;
            } else if line.starts_with("-") && !line.starts_with("---") {
                deletions += 1;
            }
        }

        // Determine status based on additions/deletions
        if additions > 0 && deletions == 0 {
            status = "A".to_string(); // Added
        } else if additions == 0 && deletions > 0 {
            status = "D".to_string(); // Deleted
        } else if additions > 0 && deletions > 0 {
            status = "M".to_string(); // Modified
        }

        diffs.push(FileDiff {
            path: file_path,
            old_path: None,
            status,
            additions,
            deletions,
            diff: diff_output,
        });
    }

    Ok(diffs)
}

#[tauri::command]
pub fn git_diff_between_commits(
    path: String,
    from_commit: String,
    to_commit: String,
) -> Result<String, String> {
    run_git(&["diff", &from_commit, &to_commit], &path)
}

// ============================================================================
// BRANCH OPERATIONS (ENHANCED)
// ============================================================================

#[tauri::command]
pub fn git_delete_branch(
    path: String,
    branch_name: String,
    force: Option<bool>,
) -> Result<String, String> {
    let flag = if force.unwrap_or(false) { "-D" } else { "-d" };
    run_git(&["branch", flag, &branch_name], &path)
}

#[tauri::command]
pub fn git_rename_branch(
    path: String,
    old_name: String,
    new_name: String,
) -> Result<String, String> {
    run_git(&["branch", "-m", &old_name, &new_name], &path)
}

#[tauri::command]
pub fn git_set_upstream(path: String, remote: String, branch: String) -> Result<String, String> {
    let upstream = format!("{}/{}", remote, branch);
    run_git(&["branch", "--set-upstream-to", &upstream], &path)
}

// ============================================================================
// COMMIT OPERATIONS (ENHANCED)
// ============================================================================

#[tauri::command]
pub fn git_amend_commit(path: String, message: Option<String>) -> Result<String, String> {
    let mut args = vec!["commit", "--amend"];

    if let Some(msg) = &message {
        args.push("-m");
        args.push(msg.as_str());
    } else {
        args.push("--no-edit");
    }

    run_git(&args, &path)
}

#[tauri::command]
pub fn git_reset(path: String, commit: String, mode: String) -> Result<String, String> {
    // mode: soft, mixed, hard
    let flag = format!("--{}", mode);
    run_git(&["reset", &flag, &commit], &path)
}

#[tauri::command]
pub fn git_revert(path: String, commit: String, no_commit: Option<bool>) -> Result<String, String> {
    let mut args = vec!["revert"];

    if no_commit.unwrap_or(false) {
        args.push("--no-commit");
    }

    args.push(&commit);
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_cherry_pick(
    path: String,
    commit: String,
    no_commit: Option<bool>,
) -> Result<String, String> {
    let mut args = vec!["cherry-pick"];

    if no_commit.unwrap_or(false) {
        args.push("--no-commit");
    }

    args.push(&commit);
    run_git(&args, &path)
}

// ============================================================================
// FILE OPERATIONS (ENHANCED)
// ============================================================================

#[tauri::command]
pub fn git_stage_files(path: String, file_paths: Vec<String>) -> Result<String, String> {
    let mut args = vec!["add"];
    for file_path in &file_paths {
        args.push(file_path.as_str());
    }
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_unstage_files(path: String, file_paths: Vec<String>) -> Result<String, String> {
    let mut args = vec!["reset", "HEAD"];
    for file_path in &file_paths {
        args.push(file_path.as_str());
    }
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_discard_files(path: String, file_paths: Vec<String>) -> Result<String, String> {
    let mut args = vec!["checkout", "--"];
    for file_path in &file_paths {
        args.push(file_path.as_str());
    }
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_show_file(path: String, commit: String, file_path: String) -> Result<String, String> {
    let spec = format!("{}:{}", commit, file_path);
    run_git(&["show", &spec], &path)
}

// ============================================================================
// REPOSITORY INFO
// ============================================================================

#[tauri::command]
pub fn git_get_config(path: String, key: String) -> Result<String, String> {
    run_git(&["config", "--get", &key], &path)
}

#[tauri::command]
pub fn git_set_config(path: String, key: String, value: String) -> Result<String, String> {
    run_git(&["config", &key, &value], &path)
}

#[tauri::command]
pub fn git_get_repo_info(path: String) -> Result<serde_json::Value, String> {
    let remote_url = run_git(&["config", "--get", "remote.origin.url"], &path)
        .unwrap_or_default()
        .trim()
        .to_string();

    let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &path)
        .unwrap_or_default()
        .trim()
        .to_string();

    let commit_count = run_git(&["rev-list", "--count", "HEAD"], &path)
        .unwrap_or_default()
        .trim()
        .parse::<u32>()
        .unwrap_or(0);

    let contributors = run_git(&["shortlog", "-sn", "--all"], &path)
        .unwrap_or_default()
        .lines()
        .count();

    Ok(serde_json::json!({
        "remote_url": remote_url,
        "branch": branch,
        "commit_count": commit_count,
        "contributors": contributors,
    }))
}
