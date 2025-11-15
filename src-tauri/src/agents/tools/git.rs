//! Git operation tools
//!
//! Tools for interacting with git repositories

use crate::agents::executor::Tool;
use async_trait::async_trait;
use serde::Deserialize;
use std::time::Duration;

/// Git status tool
pub struct GitStatusTool;

#[async_trait]
impl Tool for GitStatusTool {
    fn name(&self) -> &str {
        "git_status"
    }

    fn description(&self) -> &str {
        "Get the git status of a repository"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "repo_path": {
                    "type": "string",
                    "description": "Path to the git repository"
                }
            },
            "required": ["repo_path"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: GitStatusArgs = serde_json::from_value(params)?;

        // Use git2 crate to get status
        let repo = git2::Repository::open(&args.repo_path)?;
        let statuses = repo.statuses(None)?;

        let mut modified = Vec::new();
        let mut untracked = Vec::new();
        let mut staged = Vec::new();

        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("").to_string();
            let status = entry.status();

            if status.is_wt_modified() {
                modified.push(path.clone());
            }
            if status.is_wt_new() {
                untracked.push(path.clone());
            }
            if status.is_index_new() || status.is_index_modified() {
                staged.push(path);
            }
        }

        Ok(serde_json::json!({
            "repo_path": args.repo_path,
            "modified": modified,
            "untracked": untracked,
            "staged": staged
        }))
    }

    fn is_cacheable(&self) -> bool {
        false // Git status changes frequently
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(5))
    }
}

#[derive(Deserialize)]
struct GitStatusArgs {
    repo_path: String,
}

/// Git log tool
pub struct GitLogTool;

#[async_trait]
impl Tool for GitLogTool {
    fn name(&self) -> &str {
        "git_log"
    }

    fn description(&self) -> &str {
        "Get commit history from a git repository"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "repo_path": {
                    "type": "string",
                    "description": "Path to the git repository"
                },
                "max_commits": {
                    "type": "number",
                    "description": "Maximum number of commits to retrieve",
                    "default": 10
                }
            },
            "required": ["repo_path"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: GitLogArgs = serde_json::from_value(params)?;

        let repo = git2::Repository::open(&args.repo_path)?;
        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;

        let mut commits = Vec::new();
        let max_commits = args.max_commits.unwrap_or(10);

        for (i, oid) in revwalk.enumerate() {
            if i >= max_commits {
                break;
            }

            let oid = oid?;
            let commit = repo.find_commit(oid)?;

            commits.push(serde_json::json!({
                "id": oid.to_string(),
                "message": commit.message().unwrap_or(""),
                "author": commit.author().name().unwrap_or(""),
                "timestamp": commit.time().seconds()
            }));
        }

        Ok(serde_json::json!({
            "repo_path": args.repo_path,
            "commits": commits
        }))
    }

    fn is_cacheable(&self) -> bool {
        true
    }

    fn cache_ttl(&self) -> Duration {
        Duration::from_secs(60)
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(10))
    }
}

#[derive(Deserialize)]
struct GitLogArgs {
    repo_path: String,
    max_commits: Option<usize>,
}
