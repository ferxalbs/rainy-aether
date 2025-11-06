/*!
 * Language Server Manager
 * Manages language server processes and their communication
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader, Write};
use std::thread;
use tauri::{AppHandle, Emitter};

/// Language server process information
#[derive(Debug)]
struct LanguageServerProcess {
    /// Process ID
    child: Child,
    /// Server ID
    server_id: String,
    /// Process stdin handle
    stdin: Option<std::process::ChildStdin>,
}

/// Language server manager state
#[derive(Default)]
pub struct LanguageServerManager {
    /// Map of server ID to process
    servers: Arc<Mutex<HashMap<String, LanguageServerProcess>>>,
}

/// Parameters for starting a language server
#[derive(Debug, Deserialize)]
pub struct StartServerParams {
    #[serde(rename = "serverId")]
    pub server_id: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

/// Response for server operations
#[derive(Debug, Serialize)]
pub struct ServerResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl LanguageServerManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start a language server process
    pub fn start_server(
        &self,
        params: StartServerParams,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let server_id = params.server_id.clone();

        // Check if server is already running
        {
            let servers = self.servers.lock().unwrap();
            if servers.contains_key(&server_id) {
                return Err(format!("Server {} is already running", server_id));
            }
        }

        println!("[LSP] Starting language server: {} ({})", server_id, params.command);

        // Build command
        let mut cmd = Command::new(&params.command);
        cmd.args(&params.args);

        // Set working directory
        if let Some(cwd) = &params.cwd {
            cmd.current_dir(cwd);
        }

        // Set environment variables
        for (key, value) in &params.env {
            cmd.env(key, value);
        }

        // Configure stdio
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Spawn the process
        let mut child = cmd.spawn().map_err(|e| {
            format!("Failed to spawn language server process: {}", e)
        })?;

        // Get handles
        let stdin = child.stdin.take();
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

        // Store process info
        {
            let mut servers = self.servers.lock().unwrap();
            servers.insert(
                server_id.clone(),
                LanguageServerProcess {
                    child,
                    server_id: server_id.clone(),
                    stdin,
                },
            );
        }

        // Spawn thread to read stdout and send to frontend
        let server_id_stdout = server_id.clone();
        let app_handle_stdout = app_handle.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            let mut buffer = String::new();
            let mut content_length: Option<usize> = None;

            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        // Check if this is a Content-Length header
                        if line.starts_with("Content-Length:") {
                            if let Some(len_str) = line.split(':').nth(1) {
                                content_length = len_str.trim().parse().ok();
                            }
                        } else if line.is_empty() && content_length.is_some() {
                            // Empty line after headers, now read the content
                            if let Some(len) = content_length {
                                buffer.clear();
                                buffer.reserve(len);

                                // Read exactly `len` bytes
                                // Note: This is a simplified version. A production
                                // implementation should handle reading bytes more carefully
                                // For now, we'll emit the message as-is
                            }
                            content_length = None;
                        } else {
                            buffer.push_str(&line);
                            buffer.push('\n');
                        }

                        // If we have a complete message, send it
                        if !buffer.is_empty() && content_length.is_none() {
                            let event_name = format!("lsp-message-{}", server_id_stdout);
                            let _ = app_handle_stdout.emit(&event_name, serde_json::json!({
                                "message": buffer.clone()
                            }));
                            buffer.clear();
                        }
                    }
                    Err(e) => {
                        eprintln!("[LSP] Error reading stdout: {}", e);
                        break;
                    }
                }
            }

            // Server process ended
            let event_name = format!("lsp-close-{}", server_id_stdout);
            let _ = app_handle_stdout.emit(&event_name, ());
        });

        // Spawn thread to read stderr and log
        let server_id_stderr = server_id.clone();
        let app_handle_stderr = app_handle.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        eprintln!("[LSP stderr] {}: {}", server_id_stderr, line);

                        // Emit error event
                        let event_name = format!("lsp-error-{}", server_id_stderr);
                        let _ = app_handle_stderr.emit(&event_name, serde_json::json!({
                            "error": line
                        }));
                    }
                    Err(e) => {
                        eprintln!("[LSP] Error reading stderr: {}", e);
                        break;
                    }
                }
            }
        });

        println!("[LSP] Language server started: {}", server_id);
        Ok(())
    }

    /// Stop a language server process
    pub fn stop_server(&self, server_id: &str) -> Result<(), String> {
        println!("[LSP] Stopping language server: {}", server_id);

        let mut servers = self.servers.lock().unwrap();

        if let Some(mut server_process) = servers.remove(server_id) {
            // Try to gracefully kill the process
            server_process.child.kill().map_err(|e| {
                format!("Failed to kill language server process: {}", e)
            })?;

            // Wait for the process to exit
            let _ = server_process.child.wait();

            println!("[LSP] Language server stopped: {}", server_id);
            Ok(())
        } else {
            Err(format!("Server {} is not running", server_id))
        }
    }

    /// Send a message to a language server
    pub fn send_message(&self, server_id: &str, message: &str) -> Result<(), String> {
        let mut servers = self.servers.lock().unwrap();

        if let Some(server_process) = servers.get_mut(server_id) {
            if let Some(stdin) = &mut server_process.stdin {
                // Write message with Content-Length header (LSP format)
                let content_length = message.len();
                let formatted_message = format!(
                    "Content-Length: {}\r\n\r\n{}",
                    content_length, message
                );

                stdin.write_all(formatted_message.as_bytes()).map_err(|e| {
                    format!("Failed to write to language server stdin: {}", e)
                })?;

                stdin.flush().map_err(|e| {
                    format!("Failed to flush language server stdin: {}", e)
                })?;

                Ok(())
            } else {
                Err(format!("Server {} has no stdin handle", server_id))
            }
        } else {
            Err(format!("Server {} is not running", server_id))
        }
    }

    /// Check if a server is running
    pub fn is_server_running(&self, server_id: &str) -> bool {
        let servers = self.servers.lock().unwrap();
        servers.contains_key(server_id)
    }

    /// Get list of running servers
    pub fn get_running_servers(&self) -> Vec<String> {
        let servers = self.servers.lock().unwrap();
        servers.keys().cloned().collect()
    }

    /// Stop all language servers
    pub fn stop_all_servers(&self) {
        println!("[LSP] Stopping all language servers");

        let mut servers = self.servers.lock().unwrap();
        let server_ids: Vec<String> = servers.keys().cloned().collect();

        for server_id in server_ids {
            if let Some(mut server_process) = servers.remove(&server_id) {
                let _ = server_process.child.kill();
                let _ = server_process.child.wait();
                println!("[LSP] Stopped server: {}", server_id);
            }
        }
    }
}

// Tauri Commands

/// Start a language server
#[tauri::command]
pub fn lsp_start_server(
    params: StartServerParams,
    state: tauri::State<'_, LanguageServerManager>,
    app_handle: AppHandle,
) -> Result<ServerResponse, String> {
    state.start_server(params, app_handle)?;
    Ok(ServerResponse {
        success: true,
        error: None,
    })
}

/// Stop a language server
#[tauri::command]
pub fn lsp_stop_server(
    server_id: String,
    state: tauri::State<'_, LanguageServerManager>,
) -> Result<ServerResponse, String> {
    state.stop_server(&server_id)?;
    Ok(ServerResponse {
        success: true,
        error: None,
    })
}

/// Send a message to a language server
#[tauri::command]
pub fn lsp_send_message(
    server_id: String,
    message: String,
    state: tauri::State<'_, LanguageServerManager>,
) -> Result<ServerResponse, String> {
    state.send_message(&server_id, &message)?;
    Ok(ServerResponse {
        success: true,
        error: None,
    })
}

/// Check if a server is running
#[tauri::command]
pub fn lsp_is_server_running(
    server_id: String,
    state: tauri::State<'_, LanguageServerManager>,
) -> bool {
    state.is_server_running(&server_id)
}

/// Get list of running servers
#[tauri::command]
pub fn lsp_get_running_servers(
    state: tauri::State<'_, LanguageServerManager>,
) -> Vec<String> {
    state.get_running_servers()
}
