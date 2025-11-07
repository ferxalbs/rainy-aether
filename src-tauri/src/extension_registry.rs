use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

// Extension Registry Entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionRegistryEntry {
    pub id: String,
    pub version: String,
    pub path: String,
    pub enabled: bool,
    pub installed_at: String,
    pub last_updated: Option<String>,
    pub file_hash: Option<String>, // SHA-256 hash of extension package
    pub size_bytes: Option<u64>,
}

// Extension Registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionRegistry {
    pub extensions: HashMap<String, ExtensionRegistryEntry>,
    pub last_sync: Option<String>,
    pub version: String,
}

impl ExtensionRegistry {
    pub fn new() -> Self {
        Self {
            extensions: HashMap::new(),
            last_sync: None,
            version: "1.0.0".to_string(),
        }
    }

    pub fn add_extension(&mut self, entry: ExtensionRegistryEntry) {
        self.extensions.insert(entry.id.clone(), entry);
        self.update_sync_time();
    }

    pub fn remove_extension(&mut self, id: &str) -> Option<ExtensionRegistryEntry> {
        let removed = self.extensions.remove(id);
        if removed.is_some() {
            self.update_sync_time();
        }
        removed
    }

    pub fn get_extension(&self, id: &str) -> Option<&ExtensionRegistryEntry> {
        self.extensions.get(id)
    }

    pub fn get_extension_mut(&mut self, id: &str) -> Option<&mut ExtensionRegistryEntry> {
        self.extensions.get_mut(id)
    }

    pub fn update_extension(&mut self, id: &str, entry: ExtensionRegistryEntry) -> bool {
        if self.extensions.contains_key(id) {
            self.extensions.insert(id.to_string(), entry);
            self.update_sync_time();
            true
        } else {
            false
        }
    }

    pub fn enable_extension(&mut self, id: &str) -> bool {
        if let Some(entry) = self.extensions.get_mut(id) {
            entry.enabled = true;
            self.update_sync_time();
            true
        } else {
            false
        }
    }

    pub fn disable_extension(&mut self, id: &str) -> bool {
        if let Some(entry) = self.extensions.get_mut(id) {
            entry.enabled = false;
            self.update_sync_time();
            true
        } else {
            false
        }
    }

    pub fn list_extensions(&self) -> Vec<&ExtensionRegistryEntry> {
        self.extensions.values().collect()
    }

    pub fn list_enabled_extensions(&self) -> Vec<&ExtensionRegistryEntry> {
        self.extensions.values().filter(|e| e.enabled).collect()
    }

    pub fn count(&self) -> usize {
        self.extensions.len()
    }

    pub fn count_enabled(&self) -> usize {
        self.extensions.values().filter(|e| e.enabled).count()
    }

    fn update_sync_time(&mut self) {
        self.last_sync = Some(chrono::Utc::now().to_rfc3339());
    }

    pub fn load_from_file(path: &Path) -> Result<Self, String> {
        if !path.exists() {
            return Ok(Self::new());
        }

        let contents =
            fs::read_to_string(path).map_err(|e| format!("Failed to read registry file: {}", e))?;

        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse registry file: {}", e))
    }

    pub fn save_to_file(&self, path: &Path) -> Result<(), String> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create registry directory: {}", e))?;
        }

        let contents = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize registry: {}", e))?;

        fs::write(path, contents).map_err(|e| format!("Failed to write registry file: {}", e))
    }
}

impl Default for ExtensionRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// Tauri commands for extension registry

#[tauri::command]
pub fn get_extension_registry(app: AppHandle) -> Result<String, String> {
    let registry_path = get_registry_path(&app)?;
    let registry = ExtensionRegistry::load_from_file(&registry_path)?;

    serde_json::to_string(&registry).map_err(|e| format!("Failed to serialize registry: {}", e))
}

#[tauri::command]
pub fn update_extension_registry(app: AppHandle, registry_json: String) -> Result<(), String> {
    let registry_path = get_registry_path(&app)?;

    let registry: ExtensionRegistry = serde_json::from_str(&registry_json)
        .map_err(|e| format!("Failed to parse registry JSON: {}", e))?;

    registry.save_to_file(&registry_path)
}

#[tauri::command]
pub fn add_extension_to_registry(
    app: AppHandle,
    extension_id: String,
    version: String,
    path: String,
    enabled: bool,
) -> Result<(), String> {
    let registry_path = get_registry_path(&app)?;
    let mut registry = ExtensionRegistry::load_from_file(&registry_path)?;

    let entry = ExtensionRegistryEntry {
        id: extension_id.clone(),
        version,
        path,
        enabled,
        installed_at: chrono::Utc::now().to_rfc3339(),
        last_updated: None,
        file_hash: None,
        size_bytes: None,
    };

    registry.add_extension(entry);
    registry.save_to_file(&registry_path)
}

#[tauri::command]
pub fn remove_extension_from_registry(
    app: AppHandle,
    extension_id: String,
) -> Result<bool, String> {
    let registry_path = get_registry_path(&app)?;
    let mut registry = ExtensionRegistry::load_from_file(&registry_path)?;

    let removed = registry.remove_extension(&extension_id).is_some();

    if removed {
        registry.save_to_file(&registry_path)?;
    }

    Ok(removed)
}

#[tauri::command]
pub fn enable_extension_in_registry(app: AppHandle, extension_id: String) -> Result<bool, String> {
    let registry_path = get_registry_path(&app)?;
    let mut registry = ExtensionRegistry::load_from_file(&registry_path)?;

    let enabled = registry.enable_extension(&extension_id);

    if enabled {
        registry.save_to_file(&registry_path)?;
    }

    Ok(enabled)
}

#[tauri::command]
pub fn disable_extension_in_registry(app: AppHandle, extension_id: String) -> Result<bool, String> {
    let registry_path = get_registry_path(&app)?;
    let mut registry = ExtensionRegistry::load_from_file(&registry_path)?;

    let disabled = registry.disable_extension(&extension_id);

    if disabled {
        registry.save_to_file(&registry_path)?;
    }

    Ok(disabled)
}

#[tauri::command]
pub fn get_extension_cache_dir(app: AppHandle) -> Result<String, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache directory: {}", e))?;

    let extension_cache = cache_dir.join("extensions");

    fs::create_dir_all(&extension_cache)
        .map_err(|e| format!("Failed to create extension cache directory: {}", e))?;

    Ok(extension_cache.to_string_lossy().to_string())
}

#[tauri::command]
pub fn clear_extension_cache(app: AppHandle, extension_id: Option<String>) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache directory: {}", e))?;

    let extension_cache = cache_dir.join("extensions");

    if let Some(id) = extension_id {
        // Clear cache for specific extension
        let ext_cache = extension_cache.join(&id);
        if ext_cache.exists() {
            fs::remove_dir_all(&ext_cache)
                .map_err(|e| format!("Failed to clear extension cache: {}", e))?;
        }
    } else {
        // Clear all extension cache
        if extension_cache.exists() {
            fs::remove_dir_all(&extension_cache)
                .map_err(|e| format!("Failed to clear extension cache: {}", e))?;
            fs::create_dir_all(&extension_cache)
                .map_err(|e| format!("Failed to recreate extension cache directory: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_extension_stats(app: AppHandle) -> Result<ExtensionStats, String> {
    let registry_path = get_registry_path(&app)?;
    let registry = ExtensionRegistry::load_from_file(&registry_path)?;

    let extensions_dir = get_extensions_dir(&app)?;

    // Calculate total size
    let total_size = calculate_directory_size(&extensions_dir).unwrap_or(0);

    Ok(ExtensionStats {
        total_count: registry.count(),
        enabled_count: registry.count_enabled(),
        disabled_count: registry.count() - registry.count_enabled(),
        total_size_bytes: total_size,
        last_sync: registry.last_sync.clone(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionStats {
    pub total_count: usize,
    pub enabled_count: usize,
    pub disabled_count: usize,
    pub total_size_bytes: u64,
    pub last_sync: Option<String>,
}

// Helper functions

fn get_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.join("extension_registry.json"))
}

fn get_extensions_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.join("extensions"))
}

fn calculate_directory_size(path: &Path) -> Result<u64, std::io::Error> {
    let mut size = 0;

    if path.is_dir() {
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let metadata = entry.metadata()?;

            if metadata.is_dir() {
                size += calculate_directory_size(&entry.path())?;
            } else {
                size += metadata.len();
            }
        }
    }

    Ok(size)
}
