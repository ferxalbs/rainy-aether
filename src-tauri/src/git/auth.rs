//! Git Authentication
//!
//! Provides authentication callbacks for remote Git operations using libgit2.
//! Supports: SSH keys, SSH agent, system git credentials (osxkeychain, credential-manager-core).

use git2::{Cred, CredentialType, FetchOptions, PushOptions, RemoteCallbacks};
use std::path::Path;
use std::process::{Command, Stdio};

pub struct AuthCallbacks;

/// Try to get credentials from system git credential helper
fn get_system_credentials(url: &str) -> Option<(String, String)> {
    // Parse the URL to extract protocol and host
    let protocol;
    let host;
    
    if url.starts_with("https://") {
        protocol = "https";
        let rest = url.trim_start_matches("https://");
        host = rest.split('/').next().unwrap_or("");
    } else if url.starts_with("http://") {
        protocol = "http";
        let rest = url.trim_start_matches("http://");
        host = rest.split('/').next().unwrap_or("");
    } else {
        return None;
    }
    
    if host.is_empty() {
        return None;
    }
    
    // Build the input for git-credential
    let input = format!("protocol={}\nhost={}\n\n", protocol, host);
    
    // Try git credential fill command
    let output = Command::new("git")
        .args(["credential", "fill"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()
        .and_then(|mut child| {
            use std::io::Write;
            if let Some(stdin) = child.stdin.as_mut() {
                stdin.write_all(input.as_bytes()).ok();
            }
            child.wait_with_output().ok()
        });
    
    if let Some(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut username = None;
            let mut password = None;
            
            for line in stdout.lines() {
                if let Some(user) = line.strip_prefix("username=") {
                    username = Some(user.to_string());
                }
                if let Some(pass) = line.strip_prefix("password=") {
                    password = Some(pass.to_string());
                }
            }
            
            if let (Some(u), Some(p)) = (username, password) {
                return Some((u, p));
            }
        }
    }
    
    None
}

impl AuthCallbacks {
    /// Create remote callbacks with authentication support
    pub fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
        let mut callbacks = RemoteCallbacks::new();
        let tried_ssh = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let tried_agent = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let tried_system = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let cached_creds = std::sync::Arc::new(std::sync::Mutex::new(Option::<(String, String)>::None));

        callbacks.credentials(move |url, username, allowed| {
            // For SSH URLs, try SSH key and agent
            if allowed.contains(CredentialType::SSH_KEY) {
                // Try SSH key files
                if !tried_ssh.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_ssh.store(true, std::sync::atomic::Ordering::Relaxed);
                    
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
                if !tried_agent.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_agent.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Ok(cred) = Cred::ssh_key_from_agent(username.unwrap_or("git")) {
                        return Ok(cred);
                    }
                }
            }

            // For HTTPS URLs, use system git credential helper
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                if !tried_system.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_system.store(true, std::sync::atomic::Ordering::Relaxed);
                    
                    // Get credentials from system git
                    if let Some((user, pass)) = get_system_credentials(url) {
                        let mut cache = cached_creds.lock().unwrap();
                        *cache = Some((user.clone(), pass.clone()));
                        
                        if let Ok(cred) = Cred::userpass_plaintext(&user, &pass) {
                            return Ok(cred);
                        }
                    }
                }
                
                // Try cached credentials on retry
                let cache = cached_creds.lock().unwrap();
                if let Some((ref user, ref pass)) = *cache {
                    if let Ok(cred) = Cred::userpass_plaintext(user, pass) {
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
        let tried_system = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let cached_creds = std::sync::Arc::new(std::sync::Mutex::new(Option::<(String, String)>::None));

        // Add authentication callbacks
        callbacks.credentials(move |url, username, allowed| {
            // For SSH URLs
            if allowed.contains(CredentialType::SSH_KEY) {
                if !tried_ssh.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_ssh.store(true, std::sync::atomic::Ordering::Relaxed);
                    
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
                                if public_key.exists() { Some(&public_key) } else { None },
                                &private_key,
                                None,
                            ) {
                                return Ok(cred);
                            }
                        }
                    }
                }

                if !tried_agent.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_agent.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Ok(cred) = Cred::ssh_key_from_agent(username.unwrap_or("git")) {
                        return Ok(cred);
                    }
                }
            }

            // For HTTPS - use system git credential
            if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
                if !tried_system.load(std::sync::atomic::Ordering::Relaxed) {
                    tried_system.store(true, std::sync::atomic::Ordering::Relaxed);
                    
                    if let Some((user, pass)) = get_system_credentials(url) {
                        let mut cache = cached_creds.lock().unwrap();
                        *cache = Some((user.clone(), pass.clone()));
                        
                        if let Ok(cred) = Cred::userpass_plaintext(&user, &pass) {
                            return Ok(cred);
                        }
                    }
                }
                
                let cache = cached_creds.lock().unwrap();
                if let Some((ref user, ref pass)) = *cache {
                    if let Ok(cred) = Cred::userpass_plaintext(user, pass) {
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
