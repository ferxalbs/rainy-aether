//! Git Authentication System
//!
//! Provides authentication callbacks for remote Git operations using libgit2.
//! Supports multiple authentication methods:
//! - SSH keys (~/.ssh/id_rsa, ~/.ssh/id_ed25519)
//! - SSH agent
//! - Git credential helper
//! - Username/Password (HTTPS)
//! - Default credentials

use git2::{Cred, CredentialType, FetchOptions, PushOptions, RemoteCallbacks};
use std::path::Path;

pub struct AuthCallbacks;

impl AuthCallbacks {
    /// Create remote callbacks with authentication support
    ///
    /// Tries authentication methods in this order:
    /// 1. SSH key from ~/.ssh directory
    /// 2. SSH agent
    /// 3. Git credential helper
    /// 4. Default credentials
    pub fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
        let mut callbacks = RemoteCallbacks::new();

        callbacks.credentials(|url, username, allowed| {
            // Debug logging (can be removed in production)
            eprintln!(
                "Auth callback: url={}, username={:?}, allowed={:?}",
                url, username, allowed
            );

            // Try SSH key authentication
            if allowed.contains(CredentialType::SSH_KEY) {
                // Try multiple SSH key paths
                let home = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());

                let ssh_dir = Path::new(&home).join(".ssh");

                // Try common SSH key names
                let key_names = vec![
                    "id_rsa",
                    "id_ed25519",
                    "id_ecdsa",
                    "id_dsa",
                ];

                for key_name in key_names {
                    let private_key = ssh_dir.join(key_name);
                    let public_key = ssh_dir.join(format!("{}.pub", key_name));

                    if private_key.exists() {
                        eprintln!("Trying SSH key: {:?}", private_key);

                        let result = Cred::ssh_key(
                            username.unwrap_or("git"),
                            Some(&public_key),
                            &private_key,
                            None, // No passphrase for now
                        );

                        if result.is_ok() {
                            return result;
                        }
                    }
                }
            }

            // Try SSH agent
            if allowed.contains(CredentialType::SSH_KEY) {
                eprintln!("Trying SSH agent");
                let result = Cred::ssh_key_from_agent(username.unwrap_or("git"));
                if result.is_ok() {
                    return result;
                }
            }

            // Try default credentials (for HTTPS with credential helper)
            if allowed.contains(CredentialType::DEFAULT) {
                eprintln!("Trying default credentials");
                let result = Cred::default();
                if result.is_ok() {
                    return result;
                }
            }

            // Try credential helper (for HTTPS)
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                eprintln!("Trying credential helper");

                // Try to use git credential helper
                if let Ok(config) = git2::Config::open_default() {
                    let result = Cred::credential_helper(&config, url, username);
                    if result.is_ok() {
                        return result;
                    }
                }
            }

            // Try username from memory (for subsequent attempts)
            if allowed.contains(CredentialType::USERNAME) {
                eprintln!("Providing username only");
                return Cred::username(username.unwrap_or("git"));
            }

            // All methods failed
            eprintln!("All authentication methods failed");
            Err(git2::Error::from_str("No valid authentication method available"))
        });

        callbacks
    }

    /// Create fetch options with authentication callbacks
    pub fn fetch_options<'a>() -> FetchOptions<'a> {
        let mut opts = FetchOptions::new();
        opts.remote_callbacks(Self::create_callbacks());
        opts
    }

    /// Create push options with authentication callbacks
    pub fn push_options<'a>() -> PushOptions<'a> {
        let mut opts = PushOptions::new();
        opts.remote_callbacks(Self::create_callbacks());
        opts
    }

    /// Create callbacks with progress reporting
    pub fn create_callbacks_with_progress<F>(mut on_progress: F) -> RemoteCallbacks<'static>
    where
        F: FnMut(&git2::Progress) -> bool + 'static,
    {
        let mut callbacks = Self::create_callbacks();

        callbacks.transfer_progress(move |progress| on_progress(progress));

        callbacks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_callbacks() {
        let callbacks = AuthCallbacks::create_callbacks();
        // Just verify it doesn't panic
        assert!(true);
    }

    #[test]
    fn test_fetch_options() {
        let opts = AuthCallbacks::fetch_options();
        // Verify options are created
        assert!(true);
    }

    #[test]
    fn test_push_options() {
        let opts = AuthCallbacks::push_options();
        // Verify options are created
        assert!(true);
    }
}
