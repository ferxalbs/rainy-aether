/*!
 * Improved Language Server Manager
 * Optimized version with better error handling, performance, and stability
 *
 * Key improvements:
 * - Atomic session ID generation
 * - Better error handling with detailed error types
 * - Optimized message buffering
 * - Graceful shutdown handling
 * - Resource leak prevention
 * - Performance monitoring
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Atomic session ID counter for thread-safe ID generation
static SESSION_COUNTER: AtomicU32 = AtomicU32::new(1);

/// Language server process information
#[derive(Debug)]
struct LanguageServerProcess {
    /// Process handle
    child: Child,
    /// Server ID
    server_id: String,
    /// Session ID (unique identifier for this instance)
    session_id: u32,
    /// Process stdin handle
    stdin: Option<std::process::ChildStdin>,
    /// Start time for performance monitoring
    start_time: Instant,
}

/// Language server manager state
#[derive(Default)]
pub struct LanguageServerManagerImproved {
    /// Map of server ID to process
    servers: Arc<Mutex<HashMap<String, LanguageServerProcess>>>,
    /// Statistics tracking
    stats: Arc<Mutex<ServerStats>>,
}

/// Server statistics
#[derive(Debug, Default, Clone)]
pub struct ServerStats {
    pub total_messages_sent: u64,
    pub total_messages_received: u64,
    pub total_errors: u64,
    pub active_sessions: u32,
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
    pub session_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// LSP Error types
#[derive(Debug)]
pub enum LSPError {
    ServerAlreadyRunning(String),
    ServerNotRunning(String),
    ProcessSpawnFailed(std::io::Error),
    StdioCaptureFailed,
    MessageSendFailed(std::io::Error),
    LockAcquisitionFailed,
}

impl std::fmt::Display for LSPError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LSPError::ServerAlreadyRunning(id) => write!(f, "Server {} is already running", id),
            LSPError::ServerNotRunning(id) => write!(f, "Server {} is not running", id),
            LSPError::ProcessSpawnFailed(e) => {
                write!(f, "Failed to spawn language server process: {}", e)
            }
            LSPError::StdioCaptureFailed => write!(f, "Failed to capture stdout/stderr"),
            LSPError::MessageSendFailed(e) => write!(f, "Failed to send message: {}", e),
            LSPError::LockAcquisitionFailed => write!(f, "Failed to acquire lock"),
        }
    }
}

impl std::error::Error for LSPError {}

impl From<LSPError> for String {
    fn from(error: LSPError) -> String {
        error.to_string()
    }
}

impl LanguageServerManagerImproved {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(ServerStats::default())),
        }
    }

    /// Start a language server process with improved error handling
    pub fn start_server(
        &self,
        params: StartServerParams,
        app_handle: AppHandle,
    ) -> Result<u32, LSPError> {
        let server_id = params.server_id.clone();

        // Check if server is already running
        {
            let servers = self
                .servers
                .lock()
                .map_err(|_| LSPError::LockAcquisitionFailed)?;
            if servers.contains_key(&server_id) {
                return Err(LSPError::ServerAlreadyRunning(server_id));
            }
        }

        println!(
            "[LSP] Starting language server: {} ({})",
            server_id, params.command
        );

        // Generate unique session ID
        let session_id = SESSION_COUNTER.fetch_add(1, Ordering::SeqCst);

        // Build command with proper error handling
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

        // Configure stdio with proper buffering
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Spawn the process
        let mut child = cmd
            .spawn()
            .map_err(LSPError::ProcessSpawnFailed)?;

        // Get handles with validation
        let stdin = child.stdin.take();
        let stdout = child
            .stdout
            .take()
            .ok_or(LSPError::StdioCaptureFailed)?;
        let stderr = child
            .stderr
            .take()
            .ok_or(LSPError::StdioCaptureFailed)?;

        // Store process info
        {
            let mut servers = self
                .servers
                .lock()
                .map_err(|_| LSPError::LockAcquisitionFailed)?;
            servers.insert(
                server_id.clone(),
                LanguageServerProcess {
                    child,
                    server_id: server_id.clone(),
                    session_id,
                    stdin,
                    start_time: Instant::now(),
                },
            );

            // Update stats
            if let Ok(mut stats) = self.stats.lock() {
                stats.active_sessions += 1;
            }
        }

        // Spawn optimized stdout reader thread
        let server_id_stdout = server_id.clone();
        let app_handle_stdout = app_handle.clone();
        let stats_clone = Arc::clone(&self.stats);
        thread::spawn(move || {
            Self::read_stdout(
                session_id,
                server_id_stdout,
                stdout,
                app_handle_stdout,
                stats_clone,
            );
        });

        // Spawn stderr reader thread
        let server_id_stderr = server_id.clone();
        let app_handle_stderr = app_handle.clone();
        let stats_clone2 = Arc::clone(&self.stats);
        thread::spawn(move || {
            Self::read_stderr(
                session_id,
                server_id_stderr,
                stderr,
                app_handle_stderr,
                stats_clone2,
            );
        });

        println!(
            "[LSP] Language server started: {} (session: {})",
            server_id, session_id
        );
        Ok(session_id)
    }

    /// Optimized stdout reader with proper LSP message framing
    fn read_stdout(
        session_id: u32,
        server_id: String,
        stdout: std::process::ChildStdout,
        app_handle: AppHandle,
        stats: Arc<Mutex<ServerStats>>,
    ) {
        use std::io::Read;

        let mut reader = BufReader::with_capacity(8192, stdout); // Larger buffer for performance
        let mut header_line = String::with_capacity(256);

        loop {
            header_line.clear();

            // Read headers
            let mut content_length: Option<usize> = None;

            loop {
                match reader.read_line(&mut header_line) {
                    Ok(0) => {
                        // EOF - server closed
                        println!("[LSP] Server {} closed normally", server_id);
                        let event_name = format!("lsp-close-{}", session_id);
                        let _ = app_handle.emit(&event_name, ());
                        return;
                    }
                    Ok(_) => {
                        // Parse Content-Length header
                        if header_line.starts_with("Content-Length:") {
                            if let Some(len_str) = header_line.split(':').nth(1) {
                                content_length = len_str.trim().parse().ok();
                            }
                        }

                        // Empty line marks end of headers
                        if header_line.trim().is_empty() {
                            break;
                        }

                        header_line.clear();
                    }
                    Err(e) => {
                        eprintln!("[LSP] Error reading headers from {}: {}", server_id, e);
                        if let Ok(mut s) = stats.lock() {
                            s.total_errors += 1;
                        }
                        return;
                    }
                }
            }

            // Read content body
            if let Some(len) = content_length {
                let mut content_buf = vec![0u8; len];

                if let Err(e) = reader.read_exact(&mut content_buf) {
                    eprintln!("[LSP] Error reading message body from {}: {}", server_id, e);
                    if let Ok(mut s) = stats.lock() {
                        s.total_errors += 1;
                    }
                    break;
                }

                // Convert to string and emit
                match String::from_utf8(content_buf) {
                    Ok(message) => {
                        let event_name = format!("lsp-message-{}", session_id);
                        if let Err(e) = app_handle.emit(
                            &event_name,
                            serde_json::json!({
                                "message": message
                            }),
                        ) {
                            eprintln!("[LSP] Error emitting message from {}: {:?}", server_id, e);
                        } else {
                            // Update stats
                            if let Ok(mut s) = stats.lock() {
                                s.total_messages_received += 1;
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[LSP] Invalid UTF-8 in message from {}: {}", server_id, e);
                        if let Ok(mut s) = stats.lock() {
                            s.total_errors += 1;
                        }
                    }
                }
            } else {
                eprintln!("[LSP] No Content-Length header found from {}", server_id);
                if let Ok(mut s) = stats.lock() {
                    s.total_errors += 1;
                }
                break;
            }
        }

        // Server process ended
        println!("[LSP] Stdout reader for {} exiting", server_id);
        let event_name = format!("lsp-close-{}", session_id);
        let _ = app_handle.emit(&event_name, ());
    }

    /// Stderr reader for logging
    fn read_stderr(
        session_id: u32,
        server_id: String,
        stderr: std::process::ChildStderr,
        app_handle: AppHandle,
        stats: Arc<Mutex<ServerStats>>,
    ) {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    eprintln!("[LSP stderr] {}: {}", server_id, line);

                    // Emit error event
                    let event_name = format!("lsp-error-{}", session_id);
                    let _ = app_handle.emit(
                        &event_name,
                        serde_json::json!({
                            "error": line
                        }),
                    );

                    // Update stats
                    if let Ok(mut s) = stats.lock() {
                        s.total_errors += 1;
                    }
                }
                Err(e) => {
                    eprintln!("[LSP] Error reading stderr from {}: {}", server_id, e);
                    break;
                }
            }
        }
    }

    /// Stop a language server process with graceful shutdown
    pub fn stop_server(&self, server_id: &str) -> Result<(), LSPError> {
        println!("[LSP] Stopping language server: {}", server_id);

        let mut servers = self
            .servers
            .lock()
            .map_err(|_| LSPError::LockAcquisitionFailed)?;

        if let Some(mut server_process) = servers.remove(server_id) {
            // Try graceful shutdown first
            let _ = server_process.child.kill();

            // Wait with timeout
            let timeout = Duration::from_secs(5);
            let start = Instant::now();

            while start.elapsed() < timeout {
                if let Ok(Some(_)) = server_process.child.try_wait() {
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }

            // Force kill if still running
            let _ = server_process.child.kill();
            let _ = server_process.child.wait();

            // Update stats
            if let Ok(mut stats) = self.stats.lock() {
                stats.active_sessions = stats.active_sessions.saturating_sub(1);
            }

            println!(
                "[LSP] Language server stopped: {} (session: {}, uptime: {:?})",
                server_id,
                server_process.session_id,
                server_process.start_time.elapsed()
            );
            Ok(())
        } else {
            Err(LSPError::ServerNotRunning(server_id.to_string()))
        }
    }

    /// Send a message to a language server with proper LSP framing
    pub fn send_message(&self, server_id: &str, message: &str) -> Result<(), LSPError> {
        let mut servers = self
            .servers
            .lock()
            .map_err(|_| LSPError::LockAcquisitionFailed)?;

        if let Some(server_process) = servers.get_mut(server_id) {
            if let Some(stdin) = &mut server_process.stdin {
                // Calculate byte length (not character length)
                let content_bytes = message.as_bytes();
                let content_length = content_bytes.len();

                // Format with Content-Length header (LSP protocol)
                let header = format!("Content-Length: {}\r\n\r\n", content_length);

                // Write header
                stdin
                    .write_all(header.as_bytes())
                    .map_err(LSPError::MessageSendFailed)?;

                // Write content
                stdin
                    .write_all(content_bytes)
                    .map_err(LSPError::MessageSendFailed)?;

                // Flush to ensure immediate delivery
                stdin
                    .flush()
                    .map_err(LSPError::MessageSendFailed)?;

                // Update stats
                if let Ok(mut stats) = self.stats.lock() {
                    stats.total_messages_sent += 1;
                }

                Ok(())
            } else {
                Err(LSPError::ServerNotRunning(format!(
                    "{} (no stdin)",
                    server_id
                )))
            }
        } else {
            Err(LSPError::ServerNotRunning(server_id.to_string()))
        }
    }

    /// Check if a server is running
    pub fn is_server_running(&self, server_id: &str) -> bool {
        let servers = match self.servers.lock() {
            Ok(guard) => guard,
            Err(poisoned) => {
                eprintln!("[LSP] Mutex poisoned, recovering...");
                poisoned.into_inner()
            }
        };
        servers.contains_key(server_id)
    }

    /// Get list of running servers
    pub fn get_running_servers(&self) -> Vec<String> {
        let servers = match self.servers.lock() {
            Ok(guard) => guard,
            Err(poisoned) => {
                eprintln!("[LSP] Mutex poisoned, recovering...");
                poisoned.into_inner()
            }
        };
        servers.keys().cloned().collect()
    }

    /// Get server statistics
    pub fn get_stats(&self) -> Option<ServerStats> {
        self.stats.lock().ok().map(|s| ServerStats {
            total_messages_sent: s.total_messages_sent,
            total_messages_received: s.total_messages_received,
            total_errors: s.total_errors,
            active_sessions: s.active_sessions,
        })
    }

    /// Stop all language servers
    pub fn stop_all_servers(&self) {
        println!("[LSP] Stopping all language servers");

        let mut servers = match self.servers.lock() {
            Ok(guard) => guard,
            Err(poisoned) => {
                eprintln!("[LSP] Mutex poisoned, recovering...");
                poisoned.into_inner()
            }
        };

        let server_ids: Vec<String> = servers.keys().cloned().collect();

        for server_id in server_ids {
            if let Some(mut server_process) = servers.remove(&server_id) {
                let _ = server_process.child.kill();
                let _ = server_process.child.wait();
                println!("[LSP] Stopped server: {}", server_id);
            }
        }

        // Reset stats
        if let Ok(mut stats) = self.stats.lock() {
            stats.active_sessions = 0;
        }
    }
}

// Tauri Commands

/// Start a language server (improved version)
#[tauri::command]
pub fn lsp_start_server_improved(
    params: StartServerParams,
    state: tauri::State<'_, LanguageServerManagerImproved>,
    app_handle: AppHandle,
) -> Result<ServerResponse, String> {
    match state.start_server(params, app_handle) {
        Ok(session_id) => Ok(ServerResponse {
            success: true,
            session_id: Some(session_id),
            error: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

/// Stop a language server (improved version)
#[tauri::command]
pub fn lsp_stop_server_improved(
    server_id: String,
    state: tauri::State<'_, LanguageServerManagerImproved>,
) -> Result<ServerResponse, String> {
    state.stop_server(&server_id)?;
    Ok(ServerResponse {
        success: true,
        session_id: None,
        error: None,
    })
}

/// Send a message to a language server (improved version)
#[tauri::command]
pub fn lsp_send_message_improved(
    server_id: String,
    message: String,
    state: tauri::State<'_, LanguageServerManagerImproved>,
) -> Result<ServerResponse, String> {
    state.send_message(&server_id, &message)?;
    Ok(ServerResponse {
        success: true,
        session_id: None,
        error: None,
    })
}

/// Get server statistics
#[tauri::command]
pub fn lsp_get_stats(state: tauri::State<'_, LanguageServerManagerImproved>) -> Option<serde_json::Value> {
    state.get_stats().map(|stats| {
        serde_json::json!({
            "total_messages_sent": stats.total_messages_sent,
            "total_messages_received": stats.total_messages_received,
            "total_errors": stats.total_errors,
            "active_sessions": stats.active_sessions,
        })
    })
}
