use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use zip::ZipArchive;

// Extension management commands for Tauri

/// Get the Rainy Aether user directory (.rainy-aether in user's home)
/// This is where ALL user data, extensions, and settings are stored
fn get_rainy_aether_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    let rainy_dir = home_dir.join(".rainy-aether");

    // Ensure .rainy-aether directory exists
    if !rainy_dir.exists() {
        fs::create_dir_all(&rainy_dir)
            .map_err(|e| format!("Failed to create .rainy-aether directory: {}", e))?;
        println!(
            "[ExtensionManager] Created .rainy-aether directory: {:?}",
            rainy_dir
        );
    }

    Ok(rainy_dir)
}

/// Get the extensions directory path and ensure it exists
/// Extensions are stored in: ~/.rainy-aether/extensions/
fn get_extensions_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let rainy_dir = get_rainy_aether_dir(app)?;
    let extensions_dir = rainy_dir.join("extensions");

    // Ensure extensions directory exists
    if !extensions_dir.exists() {
        fs::create_dir_all(&extensions_dir)
            .map_err(|e| format!("Failed to create extensions directory: {}", e))?;
        println!(
            "[ExtensionManager] Created extensions directory: {:?}",
            extensions_dir
        );
    }

    Ok(extensions_dir)
}

/// VS Code-compatible extensions.json manifest structure
/// Tracks all installed extensions with their metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionsManifest {
    /// List of installed extension entries
    pub extensions: Vec<ExtensionManifestEntry>,
}

/// Individual extension entry in the manifest
#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionManifestEntry {
    /// Extension identifier (publisher.name)
    pub identifier: ExtensionIdentifier,
    /// Version of the extension
    pub version: String,
    /// Installation path relative to extensions directory
    /// Format: publisher.name-version (e.g., "pkief.material-icon-theme-5.28.0")
    pub relative_path: String,
    /// Extension metadata
    pub metadata: ExtensionMetadata,
}

/// Extension identifier structure
#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionIdentifier {
    /// Full ID (e.g., "PKief.material-icon-theme")
    pub id: String,
    /// Unique UUID (optional, for compatibility)
    pub uuid: Option<String>,
}

/// Extension metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionMetadata {
    /// Timestamp when extension was installed (ISO 8601)
    pub installed_timestamp: Option<i64>,
    /// Whether the extension is enabled
    pub is_enabled: bool,
    /// Whether the extension is pre-installed/built-in
    pub is_builtin: Option<bool>,
    /// Whether the extension is a system extension
    pub is_system: Option<bool>,
    /// Last updated timestamp
    pub updated_timestamp: Option<i64>,
    /// Pre-release version flag
    pub pre_release_version: Option<bool>,
    /// Extension display name
    pub display_name: Option<String>,
    /// Extension description
    pub description: Option<String>,
}

#[tauri::command]
pub fn load_installed_extensions(app: AppHandle) -> Result<String, String> {
    let rainy_dir = get_rainy_aether_dir(&app)?;
    let extensions_file = rainy_dir.join("installed_extensions.json");

    if !extensions_file.exists() {
        return Ok("[]".to_string());
    }

    fs::read_to_string(&extensions_file)
        .map_err(|e| format!("Failed to read extensions file: {}", e))
}

#[tauri::command]
pub fn save_installed_extensions(app: AppHandle, extensions: String) -> Result<(), String> {
    let rainy_dir = get_rainy_aether_dir(&app)?;
    let extensions_file = rainy_dir.join("installed_extensions.json");

    fs::write(&extensions_file, extensions)
        .map_err(|e| format!("Failed to write extensions file: {}", e))
}

#[tauri::command]
pub fn extract_extension(
    app: AppHandle,
    vsix_data: Vec<u8>,
    target_path: String,
) -> Result<(), String> {
    let extensions_dir = get_extensions_dir(&app)?;

    // target_path is in VS Code format: "publisher.name-version"
    // Example: "pkief.material-icon-theme-5.28.0"
    let full_target_path = extensions_dir.join(&target_path);

    println!(
        "[ExtensionManager] Extracting extension to: {:?}",
        full_target_path
    );

    // Create target directory
    fs::create_dir_all(&full_target_path)
        .map_err(|e| format!("Failed to create extension directory: {}", e))?;

    // Extract VSIX (which is a ZIP file)
    let cursor = Cursor::new(vsix_data);
    let mut archive =
        ZipArchive::new(cursor).map_err(|e| format!("Failed to open VSIX archive: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;

        let file_name = file.name().to_string();

        // VS Code extensions have files inside an "extension/" folder in the VSIX
        // Strip this prefix if it exists
        let relative_path = if file_name.starts_with("extension/") {
            file_name.strip_prefix("extension/").unwrap_or(&file_name)
        } else {
            &file_name
        };

        let outpath = full_target_path.join(relative_path);

        if file_name.ends_with('/') {
            // Create directory
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            // Create parent directory if needed
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            // Extract file
            let mut outfile =
                fs::File::create(&outpath).map_err(|e| format!("Failed to create file: {}", e))?;

            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;

            // Log extraction for debugging (only for important files)
            if relative_path.ends_with(".json") || relative_path.contains("material-icons") {
                println!(
                    "[ExtensionExtract] Extracted: {} -> {}",
                    file_name, relative_path
                );
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn remove_directory(app: AppHandle, path: String) -> Result<(), String> {
    let extensions_dir = get_extensions_dir(&app)?;
    let full_path = extensions_dir.join(&path);

    if !full_path.exists() {
        return Ok(()); // Already removed
    }

    // Safety check - ensure we're only removing directories under our extensions folder
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot remove directory outside extensions folder".to_string());
    }

    println!("[ExtensionManager] Removing directory: {:?}", full_path);
    fs::remove_dir_all(&full_path).map_err(|e| format!("Failed to remove directory: {}", e))
}

#[tauri::command]
pub fn create_extension_directory(app: AppHandle, path: String) -> Result<(), String> {
    let extensions_dir = get_extensions_dir(&app)?;
    let full_path = extensions_dir.join(&path);

    // Safety check - ensure we're only creating directories under our extensions folder
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot create directory outside extensions folder".to_string());
    }

    fs::create_dir_all(&full_path)
        .map_err(|e| format!("Failed to create extension directory: {}", e))
}

#[tauri::command]
pub fn list_extension_files(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    let extensions_dir = get_extensions_dir(&app)?;
    let full_path = extensions_dir.join(&path);

    // Safety check - ensure we're only listing directories under our extensions folder
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot list files outside extensions folder".to_string());
    }

    if !full_path.exists() {
        return Ok(vec![]);
    }

    let entries =
        fs::read_dir(&full_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        files.push(file_name);
    }

    Ok(files)
}

#[tauri::command]
pub fn read_extension_file(app: AppHandle, path: String) -> Result<String, String> {
    let extensions_dir = get_extensions_dir(&app)?;
    let full_path = extensions_dir.join(&path);

    // Safety check - ensure we're only reading files under our extensions folder
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot read file outside extensions folder".to_string());
    }

    if !full_path.exists() {
        return Err(format!(
            "File does not exist: {} (full path: {:?})",
            path, full_path
        ));
    }

    fs::read_to_string(&full_path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Load the extensions.json manifest file
#[tauri::command]
pub fn load_extensions_manifest(app: AppHandle) -> Result<String, String> {
    let extensions_dir = get_extensions_dir(&app)?;
    let manifest_file = extensions_dir.join("extensions.json");

    if !manifest_file.exists() {
        // Return empty manifest if file doesn't exist
        let empty_manifest = ExtensionsManifest { extensions: vec![] };
        return serde_json::to_string_pretty(&empty_manifest)
            .map_err(|e| format!("Failed to serialize empty manifest: {}", e));
    }

    fs::read_to_string(&manifest_file)
        .map_err(|e| format!("Failed to read extensions manifest: {}", e))
}

/// Save the extensions.json manifest file
#[tauri::command]
pub fn save_extensions_manifest(app: AppHandle, manifest: String) -> Result<(), String> {
    let extensions_dir = get_extensions_dir(&app)?;
    let manifest_file = extensions_dir.join("extensions.json");

    // Validate JSON before writing
    let _: ExtensionsManifest =
        serde_json::from_str(&manifest).map_err(|e| format!("Invalid manifest JSON: {}", e))?;

    fs::write(&manifest_file, manifest)
        .map_err(|e| format!("Failed to write extensions manifest: {}", e))
}

/// Get the Rainy Aether directory path (for diagnostics)
/// Returns the path to ~/.rainy-aether/
#[tauri::command]
pub fn get_app_data_directory(app: AppHandle) -> Result<String, String> {
    let rainy_dir = get_rainy_aether_dir(&app)?;
    Ok(rainy_dir.to_string_lossy().to_string())
}

/// Ensure extensions directory structure exists
#[tauri::command]
pub fn ensure_extensions_directory(app: AppHandle) -> Result<String, String> {
    let extensions_dir = get_extensions_dir(&app)?;
    Ok(extensions_dir.to_string_lossy().to_string())
}
