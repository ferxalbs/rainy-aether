//! Agent Server Manager
//!
//! Manages the lifecycle of the Inngest/AgentKit sidecar server.
//! The server can run as:
//! - Development: npm/tsx watch mode
//! - Production: packaged binary via Tauri sidecar
//!
//! Cross-platform: macOS, Linux, Windows

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandChild;

/// State for the agent server process
pub struct AgentServerState {
    /// Whether the server is currently running
    pub is_running: Arc<Mutex<bool>>,
    /// Port the server is listening on
    pub port: Arc<Mutex<u16>>,
    /// Child process handle for stopping
    pub child: Arc<Mutex<Option<CommandChild>>>,
}

impl Default for AgentServerState {
    fn default() -> Self {
        Self {
            is_running: Arc::new(Mutex::new(false)),
            port: Arc::new(Mutex::new(3847)),
            child: Arc::new(Mutex::new(None)),
        }
    }
}

/// Start the agent server sidecar
#[tauri::command]
pub async fn agent_server_start(app: AppHandle) -> Result<u16, String> {
    use tauri_plugin_shell::ShellExt;

    let state = app.state::<AgentServerState>();

    // Check if already running
    {
        let is_running = state.is_running.lock().map_err(|e| e.to_string())?;
        if *is_running {
            let port = state.port.lock().map_err(|e| e.to_string())?;
            return Ok(*port);
        }
    }

    let port: u16 = 3847;

    // Get the app resource directory for finding the server files
    let _resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    // Try to spawn the server
    // In production, use the binary; in dev, use tsx
    #[cfg(debug_assertions)]
    {
        // Development mode: use pnpm to run the agent server
        // The command runs from the project root
        let command = app
            .shell()
            .command("pnpm")
            .args(["agent:dev"])
            .env("INNGEST_PORT", port.to_string());

        match command.spawn() {
            Ok((_rx, child)) => {
                // Store child process for later cleanup
                {
                    let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
                    *child_lock = Some(child);
                }

                let mut is_running = state.is_running.lock().map_err(|e| e.to_string())?;
                *is_running = true;
                let mut p = state.port.lock().map_err(|e| e.to_string())?;
                *p = port;
                println!("[AgentServer] Started in dev mode on port {}", port);
            }
            Err(e) => {
                return Err(format!("Failed to start agent server: {}", e));
            }
        }
    }

    #[cfg(not(debug_assertions))]
    {
        // Production mode: use sidecar binary
        let sidecar = app
            .shell()
            .sidecar("rainy-agents-server")
            .map_err(|e| format!("Failed to get sidecar: {}", e))?
            .env("INNGEST_PORT", port.to_string());

        match sidecar.spawn() {
            Ok((_rx, child)) => {
                // Store child process for later cleanup
                {
                    let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
                    *child_lock = Some(child);
                }

                let mut is_running = state.is_running.lock().map_err(|e| e.to_string())?;
                *is_running = true;
                let mut p = state.port.lock().map_err(|e| e.to_string())?;
                *p = port;
                println!("[AgentServer] Started sidecar on port {}", port);
            }
            Err(e) => {
                return Err(format!("Failed to spawn sidecar: {}", e));
            }
        }
    }

    Ok(port)
}

/// Stop the agent server
#[tauri::command]
pub async fn agent_server_stop(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AgentServerState>();

    // Kill the child process if we have one
    {
        let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
        if let Some(child) = child_lock.take() {
            if let Err(e) = child.kill() {
                eprintln!("[AgentServer] Warning: Failed to kill child process: {}", e);
            }
        }
    }

    let mut is_running = state.is_running.lock().map_err(|e| e.to_string())?;
    *is_running = false;

    println!("[AgentServer] Stopped");
    Ok(())
}

/// Get the agent server status
#[tauri::command]
pub fn agent_server_status(app: AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AgentServerState>();

    let is_running = state.is_running.lock().map_err(|e| e.to_string())?;
    let port = state.port.lock().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "running": *is_running,
        "port": *port,
        "url": format!("http://localhost:{}", *port),
        "inngest_endpoint": format!("http://localhost:{}/api/inngest", *port),
    }))
}

/// Health check for the agent server
#[tauri::command]
pub async fn agent_server_health(_app: AppHandle) -> Result<bool, String> {
    let port: u16 = 3847;

    // Use a simple TCP check
    match std::net::TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        std::time::Duration::from_secs(1),
    ) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
