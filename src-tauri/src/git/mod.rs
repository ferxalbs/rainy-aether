//! Git operations module
//!
//! This module provides a unified API for Git operations using libgit2.
//! All operations are native (no CLI subprocess spawning) for:
//! - No CMD window flashing on Windows
//! - Better performance
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
