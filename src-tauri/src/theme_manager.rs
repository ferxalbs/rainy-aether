use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeState {
    pub active_theme: String,
    pub mode: String, // "day" or "night"
}

pub struct ThemeManagerState {
    pub state: Mutex<ThemeState>,
}

impl ThemeManagerState {
    pub fn new() -> self::ThemeManagerState {
        Self {
            state: Mutex::new(ThemeState {
                active_theme: "dracula".to_string(),
                mode: "night".to_string(),
            }),
        }
    }
}

// Command commands
#[tauri::command]
pub fn set_backend_theme(
    state: State<'_, ThemeManagerState>,
    theme_name: String,
    mode: String,
) -> Result<(), String> {
    let mut s = state.state.lock().map_err(|e| e.to_string())?;
    s.active_theme = theme_name.clone();
    s.mode = mode.clone();
    println!(
        "[ThemeManager] Backend theme updated: {} ({})",
        theme_name, mode
    );
    Ok(())
}

#[tauri::command]
pub fn get_backend_theme(state: State<'_, ThemeManagerState>) -> Result<ThemeState, String> {
    let s = state.state.lock().map_err(|e| e.to_string())?;
    Ok(s.clone())
}
