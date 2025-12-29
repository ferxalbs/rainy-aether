/**
 * Icon Theme Manager
 *
 * High-performance Rust-based icon theme management for the IDE.
 * Provides O(1) icon matching using pre-computed HashMap lookups.
 *
 * This module handles:
 * - Loading and parsing VS Code-compatible icon theme manifests
 * - Pre-computing lookup tables for file extensions, file names, and folder names
 * - Caching loaded icon content (SVG as base64 data URLs)
 * - Batch icon resolution for multiple files
 */
use base64::{engine::general_purpose::STANDARD, Engine};
use lru::LruCache;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::num::NonZeroUsize;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::State;

/// Icon definition from theme manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconDefinition {
    /// Path to icon file (relative to theme directory)
    #[serde(default)]
    pub icon_path: Option<String>,
    /// Font character (for font-based icons)
    #[serde(default)]
    pub font_character: Option<String>,
    /// Font color
    #[serde(default)]
    pub font_color: Option<String>,
    /// Font ID
    #[serde(default)]
    pub font_id: Option<String>,
}

/// VS Code-compatible icon theme manifest structure
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconThemeManifest {
    /// Icon definitions - map of icon ID to definition
    #[serde(default)]
    pub icon_definitions: HashMap<String, IconDefinition>,
    /// Default file icon ID
    #[serde(default)]
    pub file: Option<String>,
    /// Default folder icon ID (collapsed)
    #[serde(default)]
    pub folder: Option<String>,
    /// Default folder icon ID (expanded)
    #[serde(default)]
    pub folder_expanded: Option<String>,
    /// Root folder icon (collapsed)
    #[serde(default)]
    pub root_folder: Option<String>,
    /// Root folder icon (expanded)
    #[serde(default)]
    pub root_folder_expanded: Option<String>,
    /// File extension to icon ID mapping
    #[serde(default)]
    pub file_extensions: HashMap<String, String>,
    /// Exact file name to icon ID mapping
    #[serde(default)]
    pub file_names: HashMap<String, String>,
    /// Language ID to icon ID mapping
    #[serde(default)]
    pub language_ids: HashMap<String, String>,
    /// Folder name to icon ID mapping (collapsed)
    #[serde(default)]
    pub folder_names: HashMap<String, String>,
    /// Folder name to icon ID mapping (expanded)
    #[serde(default)]
    pub folder_names_expanded: HashMap<String, String>,
    /// Root folder name to icon ID mapping (collapsed)
    #[serde(default)]
    pub root_folder_names: HashMap<String, String>,
    /// Root folder name to icon ID mapping (expanded)
    #[serde(default)]
    pub root_folder_names_expanded: HashMap<String, String>,
    /// Light theme variant
    #[serde(default)]
    pub light: Option<Box<IconThemeManifest>>,
    /// High contrast theme variant
    #[serde(default)]
    pub high_contrast: Option<Box<IconThemeManifest>>,
}

/// Loaded icon theme with pre-computed lookups and cached icons
#[derive(Debug)]
pub struct LoadedIconTheme {
    /// Theme ID
    pub id: String,
    /// Theme display name
    pub label: String,
    /// Extension ID that provides this theme
    pub extension_id: Option<String>,
    /// Path to the theme directory (for resolving icon paths)
    pub base_path: PathBuf,
    /// Pre-computed file extension lookup (lowercase extension -> icon ID)
    pub file_extensions: HashMap<String, String>,
    /// Pre-computed file name lookup (lowercase name -> icon ID)
    pub file_names: HashMap<String, String>,
    /// Pre-computed language ID lookup
    pub language_ids: HashMap<String, String>,
    /// Pre-computed folder name lookup (collapsed)
    pub folder_names: HashMap<String, String>,
    /// Pre-computed folder name lookup (expanded)
    pub folder_names_expanded: HashMap<String, String>,
    /// Root folder names (collapsed)
    pub root_folder_names: HashMap<String, String>,
    /// Root folder names (expanded)
    pub root_folder_names_expanded: HashMap<String, String>,
    /// Icon definitions
    pub icon_definitions: HashMap<String, IconDefinition>,
    /// Default file icon ID
    pub default_file: Option<String>,
    /// Default folder icon ID
    pub default_folder: Option<String>,
    /// Default folder expanded icon ID
    pub default_folder_expanded: Option<String>,
    /// Root folder icon
    pub root_folder: Option<String>,
    /// Root folder expanded icon
    pub root_folder_expanded: Option<String>,
}

/// Resolved icon result returned to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedIcon {
    /// Icon ID from the theme
    pub icon_id: String,
    /// Base64 data URL of the icon (if loaded)
    pub icon_path: Option<String>,
    /// Font character (for font-based icons)
    pub font_character: Option<String>,
    /// Font color
    pub font_color: Option<String>,
    /// Font ID
    pub font_id: Option<String>,
}

/// Theme info returned after loading
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IconThemeInfo {
    pub id: String,
    pub label: String,
    pub extension_id: Option<String>,
    pub icon_count: usize,
    pub file_extension_count: usize,
    pub file_name_count: usize,
}

/// Manager state holding all loaded themes and cache
pub struct IconThemeManagerState {
    /// All loaded icon themes
    themes: RwLock<HashMap<String, LoadedIconTheme>>,
    /// Currently active theme ID
    active_theme_id: RwLock<Option<String>>,
    /// LRU cache for loaded icon content (icon_id -> base64 data URL)
    icon_cache: RwLock<LruCache<String, String>>,
}

impl IconThemeManagerState {
    pub fn new() -> Self {
        Self {
            themes: RwLock::new(HashMap::new()),
            active_theme_id: RwLock::new(None),
            // Cache up to 1000 icons in memory
            icon_cache: RwLock::new(LruCache::new(NonZeroUsize::new(1000).unwrap())),
        }
    }
}

impl Default for IconThemeManagerState {
    fn default() -> Self {
        Self::new()
    }
}

/// Strip JSONC comments from content
fn strip_json_comments(content: &str) -> String {
    let mut result = String::with_capacity(content.len());
    let mut chars = content.chars().peekable();
    let mut in_string = false;
    let mut escape_next = false;

    while let Some(c) = chars.next() {
        if escape_next {
            result.push(c);
            escape_next = false;
            continue;
        }

        if in_string {
            if c == '\\' {
                escape_next = true;
                result.push(c);
            } else if c == '"' {
                in_string = false;
                result.push(c);
            } else {
                result.push(c);
            }
            continue;
        }

        if c == '"' {
            in_string = true;
            result.push(c);
            continue;
        }

        if c == '/' {
            if let Some(&next) = chars.peek() {
                if next == '/' {
                    // Single-line comment - skip until newline
                    chars.next();
                    while let Some(&nc) = chars.peek() {
                        if nc == '\n' || nc == '\r' {
                            break;
                        }
                        chars.next();
                    }
                    continue;
                } else if next == '*' {
                    // Multi-line comment - skip until */
                    chars.next();
                    while let Some(nc) = chars.next() {
                        if nc == '*' {
                            if let Some(&'/') = chars.peek() {
                                chars.next();
                                break;
                            }
                        }
                    }
                    continue;
                }
            }
        }

        result.push(c);
    }

    result
}

/// Resolve a relative icon path to full path
fn resolve_icon_path(base_path: &Path, icon_path: &str) -> PathBuf {
    let mut clean_path = icon_path.to_string();

    // Remove leading ./
    if clean_path.starts_with("./") {
        clean_path = clean_path[2..].to_string();
    }

    // Handle ../ paths (going up from dist/ folder)
    while clean_path.starts_with("../") {
        clean_path = clean_path[3..].to_string();
    }

    base_path.join(clean_path)
}

/// Load icon content and convert to base64 data URL
fn load_icon_as_data_url(icon_path: &Path) -> Result<String, String> {
    let content = fs::read(icon_path)
        .map_err(|e| format!("Failed to read icon file {:?}: {}", icon_path, e))?;

    let extension = icon_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = match extension.as_str() {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/svg+xml", // Default to SVG
    };

    let base64_content = STANDARD.encode(&content);
    Ok(format!("data:{};base64,{}", mime_type, base64_content))
}

/// Load an icon theme from its manifest file
#[tauri::command]
pub fn load_icon_theme(
    state: State<'_, IconThemeManagerState>,
    theme_id: String,
    theme_label: String,
    theme_path: String,
    extension_path: String,
    extension_id: Option<String>,
) -> Result<IconThemeInfo, String> {
    // Parse the full path - extension_path is the extension folder name under ~/.rainy-aether/extensions/
    // theme_path is the relative path to the theme JSON file

    // Get home directory and construct full paths
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let extensions_dir = home.join(".rainy-aether").join("extensions");
    let extension_dir = extensions_dir.join(&extension_path);

    // The theme_path is relative to the extension, but may reference dist/ folder
    // We need to resolve it properly
    let theme_file_path = extension_dir.join(&theme_path);

    // Read and parse the theme manifest
    let content = fs::read_to_string(&theme_file_path)
        .map_err(|e| format!("Failed to read theme file {:?}: {}", theme_file_path, e))?;

    let clean_content = strip_json_comments(&content);

    let manifest: IconThemeManifest = serde_json::from_str(&clean_content)
        .map_err(|e| format!("Failed to parse theme manifest: {}", e))?;

    // Determine the base path for resolving icon paths
    // Icons are typically relative to the theme file location or extension root
    let theme_dir = theme_file_path.parent().unwrap_or(&extension_dir);

    // Pre-compute lowercase lookup tables for O(1) matching
    let file_extensions: HashMap<String, String> = manifest
        .file_extensions
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let file_names: HashMap<String, String> = manifest
        .file_names
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let folder_names: HashMap<String, String> = manifest
        .folder_names
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let folder_names_expanded: HashMap<String, String> = manifest
        .folder_names_expanded
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let root_folder_names: HashMap<String, String> = manifest
        .root_folder_names
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let root_folder_names_expanded: HashMap<String, String> = manifest
        .root_folder_names_expanded
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let language_ids: HashMap<String, String> = manifest
        .language_ids
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    let theme_info = IconThemeInfo {
        id: theme_id.clone(),
        label: theme_label.clone(),
        extension_id: extension_id.clone(),
        icon_count: manifest.icon_definitions.len(),
        file_extension_count: file_extensions.len(),
        file_name_count: file_names.len(),
    };

    let loaded_theme = LoadedIconTheme {
        id: theme_id.clone(),
        label: theme_label,
        extension_id,
        base_path: theme_dir.to_path_buf(),
        file_extensions,
        file_names,
        language_ids,
        folder_names,
        folder_names_expanded,
        root_folder_names,
        root_folder_names_expanded,
        icon_definitions: manifest.icon_definitions,
        default_file: manifest.file,
        default_folder: manifest.folder,
        default_folder_expanded: manifest.folder_expanded,
        root_folder: manifest.root_folder,
        root_folder_expanded: manifest.root_folder_expanded,
    };

    // Store the loaded theme
    let mut themes = state.themes.write().map_err(|e| e.to_string())?;
    themes.insert(theme_id, loaded_theme);

    Ok(theme_info)
}

/// Set the active icon theme
#[tauri::command]
pub fn set_active_icon_theme(
    state: State<'_, IconThemeManagerState>,
    theme_id: Option<String>,
) -> Result<(), String> {
    let mut active = state.active_theme_id.write().map_err(|e| e.to_string())?;
    *active = theme_id;

    // Clear icon cache when theme changes
    let mut cache = state.icon_cache.write().map_err(|e| e.to_string())?;
    cache.clear();

    Ok(())
}

/// Get the currently active icon theme ID
#[tauri::command]
pub fn get_active_icon_theme(
    state: State<'_, IconThemeManagerState>,
) -> Result<Option<String>, String> {
    let active = state.active_theme_id.read().map_err(|e| e.to_string())?;
    Ok(active.clone())
}

/// Get icon for a file by name
#[tauri::command]
pub fn get_file_icon(
    state: State<'_, IconThemeManagerState>,
    file_name: String,
    language_id: Option<String>,
) -> Result<Option<ResolvedIcon>, String> {
    let active = state.active_theme_id.read().map_err(|e| e.to_string())?;
    let theme_id = match active.as_ref() {
        Some(id) => id,
        None => return Ok(None),
    };

    let themes = state.themes.read().map_err(|e| e.to_string())?;
    let theme = match themes.get(theme_id) {
        Some(t) => t,
        None => return Ok(None),
    };

    let file_name_lower = file_name.to_lowercase();

    // 1. Check exact file name match
    if let Some(icon_id) = theme.file_names.get(&file_name_lower) {
        return resolve_icon(&state, theme, icon_id);
    }

    // 2. Check file extension matches (try multi-part extensions first)
    let parts: Vec<&str> = file_name_lower.split('.').collect();
    for i in 1..parts.len() {
        let ext = parts[i..].join(".");
        if let Some(icon_id) = theme.file_extensions.get(&ext) {
            return resolve_icon(&state, theme, icon_id);
        }
    }

    // 3. Check language ID
    if let Some(lang_id) = language_id {
        let lang_id_lower = lang_id.to_lowercase();
        if let Some(icon_id) = theme.language_ids.get(&lang_id_lower) {
            return resolve_icon(&state, theme, icon_id);
        }
    }

    // 4. Fall back to default file icon
    if let Some(ref icon_id) = theme.default_file {
        return resolve_icon(&state, theme, icon_id);
    }

    Ok(None)
}

/// Get icon for a folder by name
#[tauri::command]
pub fn get_folder_icon(
    state: State<'_, IconThemeManagerState>,
    folder_name: String,
    is_expanded: bool,
    is_root: bool,
) -> Result<Option<ResolvedIcon>, String> {
    let active = state.active_theme_id.read().map_err(|e| e.to_string())?;
    let theme_id = match active.as_ref() {
        Some(id) => id,
        None => return Ok(None),
    };

    let themes = state.themes.read().map_err(|e| e.to_string())?;
    let theme = match themes.get(theme_id) {
        Some(t) => t,
        None => return Ok(None),
    };

    let folder_name_lower = folder_name.to_lowercase();

    // 1. Check root folder name match
    if is_root {
        let root_map = if is_expanded {
            &theme.root_folder_names_expanded
        } else {
            &theme.root_folder_names
        };

        if let Some(icon_id) = root_map.get(&folder_name_lower) {
            return resolve_icon(&state, theme, icon_id);
        }

        // Fall back to root folder default
        let default_root = if is_expanded {
            &theme.root_folder_expanded
        } else {
            &theme.root_folder
        };

        if let Some(ref icon_id) = default_root {
            return resolve_icon(&state, theme, icon_id);
        }
    }

    // 2. Check folder name match
    let folder_map = if is_expanded {
        &theme.folder_names_expanded
    } else {
        &theme.folder_names
    };

    if let Some(icon_id) = folder_map.get(&folder_name_lower) {
        return resolve_icon(&state, theme, icon_id);
    }

    // 3. Fall back to default folder icon
    let default_folder = if is_expanded {
        &theme.default_folder_expanded
    } else {
        &theme.default_folder
    };

    if let Some(ref icon_id) = default_folder {
        return resolve_icon(&state, theme, icon_id);
    }

    Ok(None)
}

/// Resolve icons for multiple files in a single batch call (for performance)
#[tauri::command]
pub fn get_icons_batch(
    state: State<'_, IconThemeManagerState>,
    files: Vec<String>,
) -> Result<HashMap<String, Option<ResolvedIcon>>, String> {
    let mut results = HashMap::with_capacity(files.len());

    let active = state.active_theme_id.read().map_err(|e| e.to_string())?;
    let theme_id = match active.as_ref() {
        Some(id) => id.clone(),
        None => {
            // No active theme, return all None
            for file in files {
                results.insert(file, None);
            }
            return Ok(results);
        }
    };

    let themes = state.themes.read().map_err(|e| e.to_string())?;
    let theme = match themes.get(&theme_id) {
        Some(t) => t,
        None => {
            for file in files {
                results.insert(file, None);
            }
            return Ok(results);
        }
    };

    for file_name in files {
        let file_name_lower = file_name.to_lowercase();
        let mut icon: Option<ResolvedIcon> = None;

        // 1. Check exact file name match
        if let Some(icon_id) = theme.file_names.get(&file_name_lower) {
            icon = resolve_icon(&state, theme, icon_id).ok().flatten();
        }

        // 2. Check file extension matches
        if icon.is_none() {
            let parts: Vec<&str> = file_name_lower.split('.').collect();
            for i in 1..parts.len() {
                let ext = parts[i..].join(".");
                if let Some(icon_id) = theme.file_extensions.get(&ext) {
                    icon = resolve_icon(&state, theme, icon_id).ok().flatten();
                    break;
                }
            }
        }

        // 3. Fall back to default
        if icon.is_none() {
            if let Some(ref icon_id) = theme.default_file {
                icon = resolve_icon(&state, theme, icon_id).ok().flatten();
            }
        }

        results.insert(file_name, icon);
    }

    Ok(results)
}

/// Unregister an icon theme
#[tauri::command]
pub fn unregister_icon_theme(
    state: State<'_, IconThemeManagerState>,
    theme_id: String,
) -> Result<(), String> {
    let mut themes = state.themes.write().map_err(|e| e.to_string())?;
    themes.remove(&theme_id);

    // If this was the active theme, clear it
    let mut active = state.active_theme_id.write().map_err(|e| e.to_string())?;
    if active.as_ref() == Some(&theme_id) {
        *active = None;
    }

    Ok(())
}

/// Get list of all loaded themes
#[tauri::command]
pub fn get_loaded_icon_themes(
    state: State<'_, IconThemeManagerState>,
) -> Result<Vec<IconThemeInfo>, String> {
    let themes = state.themes.read().map_err(|e| e.to_string())?;

    Ok(themes
        .values()
        .map(|t| IconThemeInfo {
            id: t.id.clone(),
            label: t.label.clone(),
            extension_id: t.extension_id.clone(),
            icon_count: t.icon_definitions.len(),
            file_extension_count: t.file_extensions.len(),
            file_name_count: t.file_names.len(),
        })
        .collect())
}

/// Helper function to resolve an icon ID to its content
fn resolve_icon(
    state: &State<'_, IconThemeManagerState>,
    theme: &LoadedIconTheme,
    icon_id: &str,
) -> Result<Option<ResolvedIcon>, String> {
    // Check if icon is already in cache
    {
        let mut cache = state.icon_cache.write().map_err(|e| e.to_string())?;
        if let Some(cached_data) = cache.get(icon_id) {
            return Ok(Some(ResolvedIcon {
                icon_id: icon_id.to_string(),
                icon_path: Some(cached_data.clone()),
                font_character: None,
                font_color: None,
                font_id: None,
            }));
        }
    }

    // Get icon definition
    let icon_def = match theme.icon_definitions.get(icon_id) {
        Some(def) => def,
        None => return Ok(None),
    };

    // If it's a font-based icon, return that
    if icon_def.font_character.is_some() {
        return Ok(Some(ResolvedIcon {
            icon_id: icon_id.to_string(),
            icon_path: None,
            font_character: icon_def.font_character.clone(),
            font_color: icon_def.font_color.clone(),
            font_id: icon_def.font_id.clone(),
        }));
    }

    // Load icon file and convert to data URL
    if let Some(ref icon_path) = icon_def.icon_path {
        let full_path = resolve_icon_path(&theme.base_path, icon_path);

        match load_icon_as_data_url(&full_path) {
            Ok(data_url) => {
                // Cache the loaded icon
                {
                    let mut cache = state.icon_cache.write().map_err(|e| e.to_string())?;
                    cache.put(icon_id.to_string(), data_url.clone());
                }

                return Ok(Some(ResolvedIcon {
                    icon_id: icon_id.to_string(),
                    icon_path: Some(data_url),
                    font_character: None,
                    font_color: None,
                    font_id: None,
                }));
            }
            Err(_) => {
                // Icon file not found, return None gracefully
                return Ok(None);
            }
        }
    }

    Ok(None)
}
