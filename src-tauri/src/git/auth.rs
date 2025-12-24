//! Git Authentication
//!
//! Provides authentication callbacks for remote Git operations using libgit2.
//! Supports: SSH keys, SSH agent, Git credential helper, default credentials.

use git2::{Cred, CredentialType, FetchOptions, PushOptions, RemoteCallbacks};
use std::path::Path;

pub struct AuthCallbacks;

impl AuthCallbacks {
    /// Create remote callbacks with authentication support
    pub fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
        let mut callbacks = RemoteCallbacks::new();

        callbacks.credentials(|url, username, allowed| {
            // Try SSH key authentication
            if allowed.contains(CredentialType::SSH_KEY) {
                let home = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());

                let ssh_dir = Path::new(&home).join(".ssh");
                let key_names = ["id_rsa", "id_ed25519", "id_ecdsa"];

                for key_name in key_names {
                    let private_key = ssh_dir.join(key_name);
                    let public_key = ssh_dir.join(format!("{}.pub", key_name));

                    if private_key.exists() {
                        let result = Cred::ssh_key(
                            username.unwrap_or("git"),
                            Some(&public_key),
                            &private_key,
                            None,
                        );
                        if result.is_ok() {
                            return result;
                        }
                    }
                }
            }

            // Try SSH agent
            if allowed.contains(CredentialType::SSH_KEY) {
                let result = Cred::ssh_key_from_agent(username.unwrap_or("git"));
                if result.is_ok() {
                    return result;
                }
            }

            // Try default credentials
            if allowed.contains(CredentialType::DEFAULT) {
                let result = Cred::default();
                if result.is_ok() {
                    return result;
                }
            }

            // Try credential helper
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                if let Ok(config) = git2::Config::open_default() {
                    let result = Cred::credential_helper(&config, url, username);
                    if result.is_ok() {
                        return result;
                    }
                }
            }

            if allowed.contains(CredentialType::USERNAME) {
                return Cred::username(username.unwrap_or("git"));
            }

            Err(git2::Error::from_str(
                "No valid authentication method available",
            ))
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

    /// Create fetch options with authentication AND progress callback for clone
    pub fn fetch_options_with_progress<'a, F>(progress_cb: F) -> FetchOptions<'a>
    where
        F: FnMut(git2::Progress<'_>) -> bool + 'a,
    {
        let mut callbacks = RemoteCallbacks::new();

        // Add authentication callbacks
        callbacks.credentials(|url, username, allowed| {
            // Try SSH key authentication
            if allowed.contains(CredentialType::SSH_KEY) {
                let home = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());

                let ssh_dir = Path::new(&home).join(".ssh");
                let key_names = ["id_rsa", "id_ed25519", "id_ecdsa"];

                for key_name in key_names {
                    let private_key = ssh_dir.join(key_name);
                    let public_key = ssh_dir.join(format!("{}.pub", key_name));

                    if private_key.exists() {
                        let result = Cred::ssh_key(
                            username.unwrap_or("git"),
                            Some(&public_key),
                            &private_key,
                            None,
                        );
                        if result.is_ok() {
                            return result;
                        }
                    }
                }
            }

            // Try SSH agent
            if allowed.contains(CredentialType::SSH_KEY) {
                let result = Cred::ssh_key_from_agent(username.unwrap_or("git"));
                if result.is_ok() {
                    return result;
                }
            }

            // Try default credentials
            if allowed.contains(CredentialType::DEFAULT) {
                let result = Cred::default();
                if result.is_ok() {
                    return result;
                }
            }

            // Try credential helper
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                if let Ok(config) = git2::Config::open_default() {
                    let result = Cred::credential_helper(&config, url, username);
                    if result.is_ok() {
                        return result;
                    }
                }
            }

            if allowed.contains(CredentialType::USERNAME) {
                return Cred::username(username.unwrap_or("git"));
            }

            Err(git2::Error::from_str(
                "No valid authentication method available",
            ))
        });

        // Add progress callback
        callbacks.transfer_progress(progress_cb);

        let mut opts = FetchOptions::new();
        opts.remote_callbacks(callbacks);
        opts
    }
}
