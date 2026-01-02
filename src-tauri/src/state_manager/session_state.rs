// Session State Manager - Handles app session persistence
// Single source of truth for session state (replaces fragmented TS persistence)

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// Session state - persisted across app restarts
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionState {
    /// Current view: "startup", "editor", or "settings"
    pub current_view: String,
    /// Path to the active workspace (if any)
    pub active_workspace_path: Option<String>,
    /// Whether a project is currently open
    pub is_project_open: bool,
}

/// Managed state for session persistence
pub struct SessionStateManager {
    state: Mutex<SessionState>,
    storage_path: Mutex<Option<PathBuf>>,
}

impl SessionStateManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(SessionState::default()),
            storage_path: Mutex::new(None),
        }
    }

    /// Initialize storage path from app handle
    fn ensure_storage_path(&self, app: &AppHandle) -> Result<PathBuf, String> {
        let mut path_guard = self.storage_path.lock().map_err(|e| e.to_string())?;

        if let Some(ref path) = *path_guard {
            return Ok(path.clone());
        }

        // Get app data directory
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;

        // Ensure directory exists
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;

        let file_path = app_data_dir.join(".session-state.json");
        *path_guard = Some(file_path.clone());

        Ok(file_path)
    }

    /// Load state from disk
    fn load_from_disk(&self, app: &AppHandle) -> Result<SessionState, String> {
        let path = self.ensure_storage_path(app)?;

        if !path.exists() {
            return Ok(SessionState::default());
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read session state: {}", e))?;

        serde_json::from_str(&content).map_err(|e| format!("Failed to parse session state: {}", e))
    }

    /// Save state to disk
    fn save_to_disk(&self, app: &AppHandle, state: &SessionState) -> Result<(), String> {
        let path = self.ensure_storage_path(app)?;

        let content = serde_json::to_string_pretty(state)
            .map_err(|e| format!("Failed to serialize session state: {}", e))?;

        fs::write(&path, content).map_err(|e| format!("Failed to write session state: {}", e))?;

        eprintln!(
            "[SessionState] Saved: current_view={}, is_project_open={}, workspace={:?}",
            state.current_view, state.is_project_open, state.active_workspace_path
        );

        Ok(())
    }
}

impl Default for SessionStateManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Get session state - called on app startup
#[tauri::command]
pub fn get_session_state(
    app: AppHandle,
    state: State<'_, SessionStateManager>,
) -> Result<SessionState, String> {
    // Load from disk
    let session_state = state.load_from_disk(&app)?;

    // Update in-memory state
    if let Ok(mut guard) = state.state.lock() {
        *guard = session_state.clone();
    }

    eprintln!(
        "[SessionState] Loaded: current_view={}, is_project_open={}, workspace={:?}",
        session_state.current_view,
        session_state.is_project_open,
        session_state.active_workspace_path
    );

    Ok(session_state)
}

/// Save session state - called when view/project changes
#[tauri::command]
pub fn save_session_state(
    app: AppHandle,
    state: State<'_, SessionStateManager>,
    session: SessionState,
) -> Result<(), String> {
    // Update in-memory state
    if let Ok(mut guard) = state.state.lock() {
        *guard = session.clone();
    }

    // Persist to disk
    state.save_to_disk(&app, &session)
}

/// Clear session state - for testing/reset
#[tauri::command]
pub fn clear_session_state(
    app: AppHandle,
    state: State<'_, SessionStateManager>,
) -> Result<(), String> {
    let default_state = SessionState::default();

    // Update in-memory state
    if let Ok(mut guard) = state.state.lock() {
        *guard = default_state.clone();
    }

    // Persist to disk
    state.save_to_disk(&app, &default_state)?;

    eprintln!("[SessionState] Cleared");
    Ok(())
}
