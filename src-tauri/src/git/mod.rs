//! Git operations module
//!
//! This module provides a unified API for Git operations using libgit2.
//! All operations are native (no CLI subprocess spawning) for:
//! - No CMD window flashing on Windows
//! - 3-10x better performance
//! - Consistent cross-platform behavior

mod auth;
pub mod branch;
pub mod commit;
pub mod error;
pub mod history;
pub mod merge;
pub mod remote;
pub mod stash;
pub mod status;
pub mod types;

// Re-export types for convenience
pub use error::{ErrorCategory, GitError};
pub use types::*;

// Re-export all Tauri commands for generate_handler! macro
// Status operations
pub use status::git_discard_changes;
pub use status::git_discard_files;
pub use status::git_is_repo;
pub use status::git_stage_all;
pub use status::git_stage_file;
pub use status::git_status;
pub use status::git_unstage_all;
pub use status::git_unstage_file;

// History operations
pub use history::git_diff;
pub use history::git_diff_commit;
pub use history::git_diff_commit_file;
pub use history::git_diff_file;
pub use history::git_log;
pub use history::git_show_files;
pub use history::git_unpushed;

// Branch operations
pub use branch::git_branches;
pub use branch::git_checkout_branch;
pub use branch::git_create_branch;
pub use branch::git_delete_branch;
pub use branch::git_get_current_branch;
pub use branch::git_rename_branch;

// Commit operations
pub use commit::git_amend_commit;
pub use commit::git_cherry_pick;
pub use commit::git_commit;
pub use commit::git_reset;
pub use commit::git_revert;

// Remote operations
pub use remote::git_add_remote;
pub use remote::git_clone;
pub use remote::git_fetch;
pub use remote::git_list_remotes;
pub use remote::git_pull;
pub use remote::git_push;
pub use remote::git_remove_remote;
pub use remote::git_set_remote_url;

// Stash operations
pub use stash::git_stash_list;
pub use stash::git_stash_pop;
pub use stash::git_stash_push;

// Merge operations
pub use merge::git_accept_ours;
pub use merge::git_accept_theirs;
pub use merge::git_get_conflict_content;
pub use merge::git_list_conflicts;
pub use merge::git_merge;
pub use merge::git_merge_abort;
pub use merge::git_resolve_conflict;
