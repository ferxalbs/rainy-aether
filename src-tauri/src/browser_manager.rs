// Browser Preview Manager
//
// Native webview browser for previewing local development servers.
// Uses Tauri 2's WebviewWindow to create a true browser experience.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, Url, WebviewUrl, WebviewWindowBuilder};

/// Browser instance state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserState {
    pub id: String,
    pub url: String,
    pub title: String,
    pub is_loading: bool,
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

/// Managed state for all browser instances
#[derive(Default)]
pub struct BrowserManagerState {
    instances: Arc<Mutex<HashMap<String, BrowserState>>>,
    history: Arc<Mutex<HashMap<String, (Vec<String>, usize)>>>, // (history_stack, current_index)
}

impl BrowserManagerState {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
            history: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

/// Open a new browser preview window with an external URL
///
/// This creates a native WebviewWindow that can load localhost and external URLs.
/// The window is separate from the main IDE to provide full browser functionality.
#[tauri::command]
pub async fn browser_open_preview(
    app: AppHandle,
    url: String,
    window_id: Option<String>,
) -> Result<BrowserState, String> {
    let id =
        window_id.unwrap_or_else(|| format!("browser-{}", chrono::Utc::now().timestamp_millis()));

    eprintln!(
        "[browser_manager] Opening browser preview: {} -> {}",
        id, url
    );

    // Parse and validate URL
    let parsed_url = Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;

    // Create browser window with external URL support
    let window = WebviewWindowBuilder::new(&app, &id, WebviewUrl::External(parsed_url.clone()))
        .title(format!("Preview - {}", url))
        .inner_size(1024.0, 768.0)
        .min_inner_size(400.0, 300.0)
        .decorations(true)
        .center()
        .visible(true)
        .build()
        .map_err(|e| format!("Failed to create browser window: {}", e))?;

    // Clone app handle for event emission
    let app_handle = app.clone();
    let _window = window; // Keep window alive

    let state = BrowserState {
        id: id.clone(),
        url: url.clone(),
        title: format!("Preview - {}", url),
        is_loading: true,
        can_go_back: false,
        can_go_forward: false,
    };

    // Store initial state
    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            instances.insert(id.clone(), state.clone());
        }
        if let Ok(mut history) = state_manager.history.lock() {
            history.insert(id.clone(), (vec![url.clone()], 0));
        }
    }

    // Emit browser opened event
    let _ = app_handle.emit("browser:opened", &state);

    eprintln!("[browser_manager] ✓ Browser preview opened: {}", id);
    Ok(state)
}

/// Navigate to a URL in an existing browser window
#[tauri::command]
pub async fn browser_navigate(
    app: AppHandle,
    window_id: String,
    url: String,
) -> Result<BrowserState, String> {
    eprintln!("[browser_manager] Navigating {} to {}", window_id, url);

    let window = app
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Browser window '{}' not found", window_id))?;

    let parsed_url = Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;

    window
        .navigate(parsed_url)
        .map_err(|e| format!("Navigation failed: {}", e))?;

    // Update history
    let mut can_go_back = false;
    let can_go_forward = false;

    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut history) = state_manager.history.lock() {
            if let Some((stack, index)) = history.get_mut(&window_id) {
                // Truncate forward history when navigating to new URL
                stack.truncate(*index + 1);
                stack.push(url.clone());
                *index = stack.len() - 1;
                can_go_back = *index > 0;
            }
        }
    }

    let state = BrowserState {
        id: window_id.clone(),
        url: url.clone(),
        title: format!("Preview - {}", url),
        is_loading: true,
        can_go_back,
        can_go_forward,
    };

    // Update stored state
    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            instances.insert(window_id.clone(), state.clone());
        }
    }

    // Emit navigation event
    let _ = app.emit("browser:navigated", &state);

    Ok(state)
}

/// Go back in browser history
#[tauri::command]
pub async fn browser_back(app: AppHandle, window_id: String) -> Result<BrowserState, String> {
    eprintln!("[browser_manager] Going back in {}", window_id);

    let (new_url, new_index, stack_len) = {
        let state_manager = app
            .try_state::<BrowserManagerState>()
            .ok_or("Browser state not initialized")?;

        let mut history = state_manager
            .history
            .lock()
            .map_err(|_| "Failed to lock history")?;

        let (stack, index) = history
            .get_mut(&window_id)
            .ok_or_else(|| format!("No history for window '{}'", window_id))?;

        if *index == 0 {
            return Err("Already at beginning of history".to_string());
        }

        *index -= 1;
        (stack[*index].clone(), *index, stack.len())
    };

    // Navigate to previous URL
    let window = app
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Browser window '{}' not found", window_id))?;

    let parsed_url = Url::parse(&new_url).map_err(|e| format!("Invalid URL: {}", e))?;
    window
        .navigate(parsed_url)
        .map_err(|e| format!("Navigation failed: {}", e))?;

    let state = BrowserState {
        id: window_id.clone(),
        url: new_url,
        title: "Preview".to_string(),
        is_loading: true,
        can_go_back: new_index > 0,
        can_go_forward: new_index < stack_len - 1,
    };

    // Update stored state
    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            instances.insert(window_id, state.clone());
        }
    }

    let _ = app.emit("browser:navigated", &state);
    Ok(state)
}

/// Go forward in browser history
#[tauri::command]
pub async fn browser_forward(app: AppHandle, window_id: String) -> Result<BrowserState, String> {
    eprintln!("[browser_manager] Going forward in {}", window_id);

    let (new_url, new_index, stack_len) = {
        let state_manager = app
            .try_state::<BrowserManagerState>()
            .ok_or("Browser state not initialized")?;

        let mut history = state_manager
            .history
            .lock()
            .map_err(|_| "Failed to lock history")?;

        let (stack, index) = history
            .get_mut(&window_id)
            .ok_or_else(|| format!("No history for window '{}'", window_id))?;

        if *index >= stack.len() - 1 {
            return Err("Already at end of history".to_string());
        }

        *index += 1;
        (stack[*index].clone(), *index, stack.len())
    };

    let window = app
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Browser window '{}' not found", window_id))?;

    let parsed_url = Url::parse(&new_url).map_err(|e| format!("Invalid URL: {}", e))?;
    window
        .navigate(parsed_url)
        .map_err(|e| format!("Navigation failed: {}", e))?;

    let state = BrowserState {
        id: window_id.clone(),
        url: new_url,
        title: "Preview".to_string(),
        is_loading: true,
        can_go_back: new_index > 0,
        can_go_forward: new_index < stack_len - 1,
    };

    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            instances.insert(window_id, state.clone());
        }
    }

    let _ = app.emit("browser:navigated", &state);
    Ok(state)
}

/// Reload the current page
#[tauri::command]
pub async fn browser_reload(app: AppHandle, window_id: String) -> Result<(), String> {
    eprintln!("[browser_manager] Reloading {}", window_id);

    let window = app
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Browser window '{}' not found", window_id))?;

    // Use JavaScript to reload the page
    window
        .eval("window.location.reload()")
        .map_err(|e| format!("Reload failed: {}", e))?;

    let _ = app.emit("browser:reloading", window_id);
    Ok(())
}

/// Close a browser window
#[tauri::command]
pub async fn browser_close(app: AppHandle, window_id: String) -> Result<(), String> {
    eprintln!("[browser_manager] Closing browser {}", window_id);

    if let Some(window) = app.get_webview_window(&window_id) {
        window
            .close()
            .map_err(|e| format!("Failed to close: {}", e))?;
    }

    // Clean up state
    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            instances.remove(&window_id);
        }
        if let Ok(mut history) = state_manager.history.lock() {
            history.remove(&window_id);
        }
    }

    let _ = app.emit("browser:closed", window_id);
    Ok(())
}

/// Get the current state of a browser window
#[tauri::command]
pub fn browser_get_state(app: AppHandle, window_id: String) -> Result<BrowserState, String> {
    let state_manager = app
        .try_state::<BrowserManagerState>()
        .ok_or("Browser state not initialized")?;

    let instances = state_manager
        .instances
        .lock()
        .map_err(|_| "Failed to lock state")?;

    instances
        .get(&window_id)
        .cloned()
        .ok_or_else(|| format!("Browser '{}' not found", window_id))
}

/// Get all active browser windows
#[tauri::command]
pub fn browser_list_instances(app: AppHandle) -> Result<Vec<BrowserState>, String> {
    let state_manager = app
        .try_state::<BrowserManagerState>()
        .ok_or("Browser state not initialized")?;

    let instances = state_manager
        .instances
        .lock()
        .map_err(|_| "Failed to lock state")?;

    Ok(instances.values().cloned().collect())
}

/// Set the title of a browser window (called when page title changes)
#[tauri::command]
pub fn browser_set_title(app: AppHandle, window_id: String, title: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window
            .set_title(&format!("Preview - {}", title))
            .map_err(|e| format!("Failed to set title: {}", e))?;
    }

    // Update state
    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            if let Some(state) = instances.get_mut(&window_id) {
                state.title = title.clone();
                state.is_loading = false;
            }
        }
    }

    Ok(())
}

/// Set loading state of a browser window
#[tauri::command]
pub fn browser_set_loading(
    app: AppHandle,
    window_id: String,
    is_loading: bool,
) -> Result<(), String> {
    if let Some(state_manager) = app.try_state::<BrowserManagerState>() {
        if let Ok(mut instances) = state_manager.instances.lock() {
            if let Some(state) = instances.get_mut(&window_id) {
                state.is_loading = is_loading;
            }
        }
    }

    let _ = app.emit(
        if is_loading {
            "browser:loading"
        } else {
            "browser:loaded"
        },
        &window_id,
    );

    Ok(())
}
