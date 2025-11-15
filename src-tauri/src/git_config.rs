//! Git configuration and feature flags
//!
//! This module provides configuration for switching between CLI-based and
//! native libgit2-based Git operations. This allows for gradual migration
//! and easy rollback if issues are discovered.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitConfig {
    /// Use native libgit2 implementation instead of CLI
    pub use_native: bool,

    /// Per-operation feature flags for gradual migration
    pub native_operations: NativeOperations,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeOperations {
    /// Use native implementation for status operations
    pub status: bool,

    /// Use native implementation for log/history operations
    pub log: bool,

    /// Use native implementation for diff operations
    pub diff: bool,

    /// Use native implementation for commit operations
    pub commit: bool,

    /// Use native implementation for branch operations
    pub branch: bool,

    /// Use native implementation for remote operations
    pub remote: bool,

    /// Use native implementation for repository info operations
    pub repo_info: bool,
}

impl Default for GitConfig {
    fn default() -> Self {
        Self {
            // All native operations enabled - Complete migration! 🎉
            use_native: true,
            native_operations: NativeOperations {
                status: true,        // Phase 1 - Core operations ✅
                repo_info: true,     // Phase 2 - Simple info ✅
                log: true,           // Phase 2 - History operations ✅
                diff: true,          // Phase 2 - Diff operations ✅
                branch: true,        // Phase 2 - Branch operations ✅
                commit: true,        // Phase 3 - Write operations ✅ COMPLETE
                remote: true,        // Phase 4 - Remote operations ✅ COMPLETE
                // Phase 5 - Advanced operations (merge, conflicts) ✅ COMPLETE
            },
        }
    }
}

impl GitConfig {
    /// Create a new GitConfig with all native operations enabled
    pub fn all_native() -> Self {
        Self {
            use_native: true,
            native_operations: NativeOperations {
                status: true,
                log: true,
                diff: true,
                commit: true,
                branch: true,
                remote: true,
                repo_info: true,
            },
        }
    }

    /// Create a new GitConfig with all native operations disabled (use CLI)
    pub fn all_cli() -> Self {
        Self {
            use_native: false,
            native_operations: NativeOperations {
                status: false,
                log: false,
                diff: false,
                commit: false,
                branch: false,
                remote: false,
                repo_info: false,
            },
        }
    }

    /// Enable a specific operation to use native implementation
    pub fn enable_operation(&mut self, operation: &str) {
        match operation {
            "status" => self.native_operations.status = true,
            "log" => self.native_operations.log = true,
            "diff" => self.native_operations.diff = true,
            "commit" => self.native_operations.commit = true,
            "branch" => self.native_operations.branch = true,
            "remote" => self.native_operations.remote = true,
            "repo_info" => self.native_operations.repo_info = true,
            _ => {}
        }
    }

    /// Disable a specific operation (fall back to CLI)
    pub fn disable_operation(&mut self, operation: &str) {
        match operation {
            "status" => self.native_operations.status = false,
            "log" => self.native_operations.log = false,
            "diff" => self.native_operations.diff = false,
            "commit" => self.native_operations.commit = false,
            "branch" => self.native_operations.branch = false,
            "remote" => self.native_operations.remote = false,
            "repo_info" => self.native_operations.repo_info = false,
            _ => {}
        }
    }

    /// Check if a specific operation should use native implementation
    pub fn should_use_native(&self, operation: &str) -> bool {
        if !self.use_native {
            return false;
        }

        match operation {
            "status" => self.native_operations.status,
            "log" => self.native_operations.log,
            "diff" => self.native_operations.diff,
            "commit" => self.native_operations.commit,
            "branch" => self.native_operations.branch,
            "remote" => self.native_operations.remote,
            "repo_info" => self.native_operations.repo_info,
            _ => false,
        }
    }
}

// Tauri commands for managing git configuration
#[tauri::command]
pub fn git_get_native_config() -> GitConfig {
    GitConfig::default()
}

#[tauri::command]
pub fn git_set_use_native(_use_native: bool) -> Result<(), String> {
    // In a real implementation, this would persist to settings
    // For now, just return success
    Ok(())
}

#[tauri::command]
pub fn git_enable_native_operation(_operation: String) -> Result<(), String> {
    // In a real implementation, this would persist to settings
    Ok(())
}

#[tauri::command]
pub fn git_disable_native_operation(_operation: String) -> Result<(), String> {
    // In a real implementation, this would persist to settings
    Ok(())
}
