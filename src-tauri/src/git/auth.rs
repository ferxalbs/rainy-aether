//! Git Authentication
//!
//! Provides authentication callbacks for remote Git operations using libgit2.
//! Supports: SSH keys, SSH agent, and credential.helper via libgit2.

use git2::{Cred, CredentialType, FetchOptions, PushOptions, RemoteCallbacks};
use std::path::Path;

pub struct AuthCallbacks;

fn resolve_ssh_key_credential(username: Option<&str>) -> Option<Cred> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    let ssh_dir = Path::new(&home).join(".ssh");
    let key_names = ["id_ed25519", "id_rsa", "id_ecdsa"];

    for key_name in key_names {
        let private_key = ssh_dir.join(key_name);
        let public_key = ssh_dir.join(format!("{}.pub", key_name));

        if private_key.exists() {
            if let Ok(cred) = Cred::ssh_key(
                username.unwrap_or("git"),
                if public_key.exists() {
                    Some(&public_key)
                } else {
                    None
                },
                &private_key,
                None,
            ) {
                return Some(cred);
            }
        }
    }

    None
}

fn resolve_helper_credential(url: &str, username: Option<&str>) -> Option<Cred> {
    let config = git2::Config::open_default().ok()?;
    Cred::credential_helper(&config, url, username).ok()
}

impl AuthCallbacks {
    /// Create remote callbacks with authentication support
    pub fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
        let mut callbacks = RemoteCallbacks::new();
        let tried_ssh = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let tried_agent = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let tried_helper = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

        callbacks.credentials(move |url, username, allowed| {
            // For SSH URLs, try SSH key and agent
            if allowed.contains(CredentialType::SSH_KEY) {
                // Try SSH key files
                if !tried_ssh.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_ssh.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Some(cred) = resolve_ssh_key_credential(username) {
                        return Ok(cred);
                    }
                }

                // Try SSH agent
                if !tried_agent.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_agent.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Ok(cred) = Cred::ssh_key_from_agent(username.unwrap_or("git")) {
                        return Ok(cred);
                    }
                }
            }

            // For HTTPS URLs, ask credential.helper via libgit2.
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                if !tried_helper.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_helper.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Some(cred) = resolve_helper_credential(url, username) {
                        return Ok(cred);
                    }
                }
            }

            // For username-only auth
            if allowed.contains(CredentialType::USERNAME) {
                return Cred::username(username.unwrap_or("git"));
            }

            Err(git2::Error::from_str(
                "Authentication failed. For HTTPS, ensure credentials are stored in macOS Keychain. For SSH, ensure your key is added to ssh-agent.",
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
        let tried_ssh = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let tried_agent = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let tried_helper = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

        // Add authentication callbacks
        callbacks.credentials(move |url, username, allowed| {
            // For SSH URLs
            if allowed.contains(CredentialType::SSH_KEY) {
                if !tried_ssh.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_ssh.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Some(cred) = resolve_ssh_key_credential(username) {
                        return Ok(cred);
                    }
                }

                if !tried_agent.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_agent.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Ok(cred) = Cred::ssh_key_from_agent(username.unwrap_or("git")) {
                        return Ok(cred);
                    }
                }
            }

            // For HTTPS - ask credential.helper via libgit2.
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                if !tried_helper.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_helper.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Some(cred) = resolve_helper_credential(url, username) {
                        return Ok(cred);
                    }
                }
            }

            if allowed.contains(CredentialType::USERNAME) {
                return Cred::username(username.unwrap_or("git"));
            }

            Err(git2::Error::from_str("No valid authentication method available"))
        });

        // Add progress callback
        callbacks.transfer_progress(progress_cb);

        let mut opts = FetchOptions::new();
        opts.remote_callbacks(callbacks);
        opts
    }
}
