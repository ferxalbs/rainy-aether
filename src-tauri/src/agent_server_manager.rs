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

/// State for the agent server process
pub struct AgentServerState {
    /// Whether the server is currently running
    pub is_running: Arc<Mutex<bool>>,
    /// Port the server is listening on
    pub port: Arc<Mutex<u16>>,
}

impl Default for AgentServerState {
    fn default() -> Self {
        Self {
            is_running: Arc::new(Mutex::new(false)),
            port: Arc::new(Mutex::new(3847)),
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

    // Try to spawn the server
    // In production, use the binary; in dev, use tsx
    #[cfg(debug_assertions)]
    {
        // Development mode: use npx tsx
        let command = app
            .shell()
            .command("npx")
            .args(["tsx", "watch", "src/services/agents/server/index.ts"])
            .env("INNGEST_PORT", port.to_string());

        match command.spawn() {
            Ok(_child) => {
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
        use tauri_plugin_shell::process::CommandEvent;

        let sidecar = app
            .shell()
            .sidecar("rainy-agents-server")
            .map_err(|e| format!("Failed to get sidecar: {}", e))?
            .env("INNGEST_PORT", port.to_string());

        let (mut _rx, _child) = sidecar
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        let mut is_running = state.is_running.lock().map_err(|e| e.to_string())?;
        *is_running = true;
        let mut p = state.port.lock().map_err(|e| e.to_string())?;
        *p = port;
        println!("[AgentServer] Started sidecar on port {}", port);
    }

    Ok(port)
}

/// Stop the agent server
#[tauri::command]
pub async fn agent_server_stop(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AgentServerState>();

    let mut is_running = state.is_running.lock().map_err(|e| e.to_string())?;
    *is_running = false;

    // Note: The child process will be killed when the app exits
    // For explicit stop, we'd need to track the Child handle

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
pub async fn agent_server_health(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<AgentServerState>();
    let port = *state.port.lock().map_err(|e| e.to_string())?;

    // Simple HTTP check
    let url = format!("http://localhost:{}/health", port);

    // Use a simple TCP check since we don't have reqwest
    match std::net::TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        std::time::Duration::from_secs(1),
    ) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
