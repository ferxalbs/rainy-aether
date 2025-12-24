//! Git error types
//!
//! Centralized error handling for Git operations with structured information
//! for better debugging and user feedback.

use serde::Serialize;

/// Error categories for Git operations
#[derive(Debug, Serialize, Clone)]
pub enum ErrorCategory {
    NotFound,
    Authentication,
    Network,
    Conflict,
    Invalid,
    Permission,
    Internal,
}

/// Custom error type for Git operations with structured information
#[derive(Debug, Serialize, Clone)]
pub struct GitError {
    pub category: ErrorCategory,
    pub message: String,
    pub details: Option<String>,
}

impl GitError {
    /// Create error from git2 library error
    pub fn from_git2_error(err: git2::Error) -> Self {
        let category = match err.class() {
            git2::ErrorClass::Net | git2::ErrorClass::Http => ErrorCategory::Network,
            git2::ErrorClass::Ssh => ErrorCategory::Authentication,
            git2::ErrorClass::Reference => ErrorCategory::NotFound,
            git2::ErrorClass::Index | git2::ErrorClass::Merge => ErrorCategory::Conflict,
            git2::ErrorClass::Os => ErrorCategory::Permission,
            _ => ErrorCategory::Internal,
        };

        Self {
            category,
            message: err.message().to_string(),
            details: Some(format!("Code: {:?}, Class: {:?}", err.code(), err.class())),
        }
    }

    /// Create a "not found" error
    pub fn not_found(message: &str) -> Self {
        Self {
            category: ErrorCategory::NotFound,
            message: message.to_string(),
            details: None,
        }
    }

    /// Create an internal error
    pub fn internal(message: &str) -> Self {
        Self {
            category: ErrorCategory::Internal,
            message: message.to_string(),
            details: None,
        }
    }

    /// Create an authentication error
    pub fn auth(message: &str) -> Self {
        Self {
            category: ErrorCategory::Authentication,
            message: message.to_string(),
            details: None,
        }
    }

    /// Create a conflict error
    pub fn conflict(message: &str) -> Self {
        Self {
            category: ErrorCategory::Conflict,
            message: message.to_string(),
            details: None,
        }
    }
}

// Convert GitError to String for Tauri command compatibility
impl From<GitError> for String {
    fn from(err: GitError) -> String {
        err.message
    }
}

// Convert git2::Error to GitError
impl From<git2::Error> for GitError {
    fn from(err: git2::Error) -> Self {
        Self::from_git2_error(err)
    }
}
