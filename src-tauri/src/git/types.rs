//! Git data types
//!
//! Shared data structures used across Git operations.

use serde::Serialize;

/// Status entry for a file in the working tree
#[derive(Serialize, Debug, Clone)]
pub struct StatusEntry {
    pub path: String,
    pub code: String, // two-letter porcelain code (XY)
}

/// Commit information
#[derive(Serialize, Debug, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
}

/// Branch information
#[derive(Serialize, Debug, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub current: bool,
    pub remote: Option<String>,
}

/// Remote information
#[derive(Serialize, Debug, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub fetch_url: String,
    pub push_url: String,
}

/// Stash entry
#[derive(Serialize, Debug, Clone)]
pub struct StashEntry {
    pub index: usize,
    pub message: String,
    pub hash: String,
}

/// File diff information
#[derive(Serialize, Debug, Clone)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
    pub diff: String,
}

/// Clone progress information
#[derive(Serialize, Debug, Clone)]
pub struct CloneProgress {
    pub phase: String,
    pub received_objects: usize,
    pub total_objects: usize,
    pub indexed_objects: usize,
    pub received_bytes: usize,
    pub percent: u32,
}

/// Conflict content for a file
#[derive(Serialize, Debug, Clone)]
pub struct ConflictContent {
    pub path: String,
    pub ours: String,
    pub theirs: String,
    pub base: String,
}
