use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Debug, Clone)]
pub struct Commit {
    pub hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
}

fn run_git(args: &[&str], cwd: &str) -> Result<String, String> {
    println!("Running git command with cwd: {}", cwd);
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
    let args_vec = vec!["log", "--date=iso-strict", pretty_arg.as_str(), "--max-count", count_arg.as_str()];

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
pub fn git_diff(path: String, commit_hash: String, file_path: Option<String>) -> Result<String, String> {
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
        if line.len() < 3 { continue; }
        let code = &line[0..2];
        let rest = line[3..].trim();
        // Handle renames: "R  a -> b"
        let path = if let Some(idx) = rest.find(" -> ") {
            rest[idx+4..].to_string()
        } else {
            rest.to_string()
        };
        entries.push(StatusEntry { path, code: code.to_string() });
    }
    Ok(entries)
}

#[tauri::command]
pub fn git_commit(path: String, message: String, stage_all: Option<bool>) -> Result<String, String> {
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
            if up.is_empty() { return Ok(vec![]); }
            let spec = format!("{}..HEAD", up);
            let output = run_git(&["rev-list", &spec], &path)?;
            let hashes: Vec<String> = output
                .lines()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            Ok(hashes)
        },
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
    let output = run_git(&["branch", "-a", "--format=%(refname:short)%00%(HEAD)%00%(upstream:track)"], &path)?;
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
pub fn git_diff_file(path: String, file_path: String, staged: Option<bool>) -> Result<String, String> {
    let args = if staged.unwrap_or(false) {
        vec!["diff", "--staged", "--", &file_path]
    } else {
        vec!["diff", "--", &file_path]
    };
    run_git(&args, &path)
}

#[tauri::command]
pub fn git_push(path: String, remote: Option<String>, branch: Option<String>) -> Result<String, String> {
    let remote_name = remote.as_deref().unwrap_or("origin");
    let branch_name = branch.as_deref().unwrap_or("HEAD");
    run_git(&["push", remote_name, branch_name], &path)
}

#[tauri::command]
pub fn git_pull(path: String, remote: Option<String>, branch: Option<String>) -> Result<String, String> {
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