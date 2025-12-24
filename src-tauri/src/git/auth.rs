//! Git Authentication
//!
//! Provides authentication callbacks for remote Git operations using libgit2.
//! Supports: SSH keys, SSH agent, Git credential helper, macOS Keychain, Windows Credential Manager.

use git2::{Cred, CredentialType, FetchOptions, PushOptions, RemoteCallbacks};
use std::path::Path;

pub struct AuthCallbacks;

impl AuthCallbacks {
    /// Create remote callbacks with authentication support
    pub fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
        let mut callbacks = RemoteCallbacks::new();
        let tried_methods = std::sync::Arc::new(std::sync::Mutex::new(Vec::<String>::new()));

        callbacks.credentials(move |url, username, allowed| {
            let mut tried = tried_methods.lock().unwrap();
            
            // Try SSH key authentication for SSH URLs
            if allowed.contains(CredentialType::SSH_KEY) && !tried.contains(&"ssh_key".to_string()) {
                tried.push("ssh_key".to_string());
                
                let home = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());

                let ssh_dir = Path::new(&home).join(".ssh");
                let key_names = ["id_ed25519", "id_rsa", "id_ecdsa", "id_dsa"];

                for key_name in key_names {
                    let private_key = ssh_dir.join(key_name);
                    let public_key = ssh_dir.join(format!("{}.pub", key_name));

                    if private_key.exists() {
                        // Try without passphrase first
                        if let Ok(cred) = Cred::ssh_key(
                            username.unwrap_or("git"),
                            if public_key.exists() { Some(&public_key) } else { None },
                            &private_key,
                            None,
                        ) {
                            return Ok(cred);
                        }
                    }
                }
            }

            // Try SSH agent (works with macOS Keychain and ssh-agent)
            if allowed.contains(CredentialType::SSH_KEY) && !tried.contains(&"ssh_agent".to_string()) {
                tried.push("ssh_agent".to_string());
                if let Ok(cred) = Cred::ssh_key_from_agent(username.unwrap_or("git")) {
                    return Ok(cred);
                }
            }

            // Try credential helper for HTTPS (git-credential-manager, osxkeychain, etc.)
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) && !tried.contains(&"credential_helper".to_string()) {
                tried.push("credential_helper".to_string());
                
                // Try to get credentials from git credential helper
                if let Ok(config) = git2::Config::open_default() {
                    if let Ok(cred) = Cred::credential_helper(&config, url, username) {
                        return Ok(cred);
                    }
                }
            }

            // Try default credentials
            if allowed.contains(CredentialType::DEFAULT) && !tried.contains(&"default".to_string()) {
                tried.push("default".to_string());
                if let Ok(cred) = Cred::default() {
                    return Ok(cred);
                }
            }

            // For username-only auth
            if allowed.contains(CredentialType::USERNAME) && !tried.contains(&"username".to_string()) {
                tried.push("username".to_string());
                return Cred::username(username.unwrap_or("git"));
            }

            Err(git2::Error::from_str(
                "No valid authentication method available. For HTTPS, run 'git config --global credential.helper' to set up credentials. For SSH, ensure your key is added to ssh-agent.",
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
        let tried_methods = std::sync::Arc::new(std::sync::Mutex::new(Vec::<String>::new()));

        // Add authentication callbacks
        callbacks.credentials(move |url, username, allowed| {
            let mut tried = tried_methods.lock().unwrap();
            
            // Try SSH key authentication for SSH URLs
            if allowed.contains(CredentialType::SSH_KEY) && !tried.contains(&"ssh_key".to_string()) {
                tried.push("ssh_key".to_string());
                
                let home = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());

                let ssh_dir = Path::new(&home).join(".ssh");
                let key_names = ["id_ed25519", "id_rsa", "id_ecdsa", "id_dsa"];

                for key_name in key_names {
                    let private_key = ssh_dir.join(key_name);
                    let public_key = ssh_dir.join(format!("{}.pub", key_name));

                    if private_key.exists() {
                        if let Ok(cred) = Cred::ssh_key(
                            username.unwrap_or("git"),
                            if public_key.exists() { Some(&public_key) } else { None },
                            &private_key,
                            None,
                        ) {
                            return Ok(cred);
                        }
                    }
                }
            }

            // Try SSH agent
            if allowed.contains(CredentialType::SSH_KEY) && !tried.contains(&"ssh_agent".to_string()) {
                tried.push("ssh_agent".to_string());
                if let Ok(cred) = Cred::ssh_key_from_agent(username.unwrap_or("git")) {
                    return Ok(cred);
                }
            }

            // Try credential helper for HTTPS
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) && !tried.contains(&"credential_helper".to_string()) {
                tried.push("credential_helper".to_string());
                if let Ok(config) = git2::Config::open_default() {
                    if let Ok(cred) = Cred::credential_helper(&config, url, username) {
                        return Ok(cred);
                    }
                }
            }

            // Try default credentials
            if allowed.contains(CredentialType::DEFAULT) && !tried.contains(&"default".to_string()) {
                tried.push("default".to_string());
                if let Ok(cred) = Cred::default() {
                    return Ok(cred);
                }
            }

            if allowed.contains(CredentialType::USERNAME) && !tried.contains(&"username".to_string()) {
                tried.push("username".to_string());
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
