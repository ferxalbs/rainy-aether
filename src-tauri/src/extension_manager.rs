use std::fs;
use tauri::{AppHandle, Manager};
use zip::ZipArchive;
use std::io::Cursor;

// Extension management commands for Tauri

#[tauri::command]
pub fn load_installed_extensions(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let extensions_file = app_data_dir.join("installed_extensions.json");

    if !extensions_file.exists() {
        return Ok("[]".to_string());
    }

    fs::read_to_string(&extensions_file)
        .map_err(|e| format!("Failed to read extensions file: {}", e))
}

#[tauri::command]
pub fn save_installed_extensions(app: AppHandle, extensions: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let extensions_file = app_data_dir.join("installed_extensions.json");

    fs::write(&extensions_file, extensions)
        .map_err(|e| format!("Failed to write extensions file: {}", e))
}

#[tauri::command]
pub fn extract_extension(app: AppHandle, vsix_data: Vec<u8>, target_path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_target_path = app_data_dir.join(&target_path);

    // Create target directory
    fs::create_dir_all(&full_target_path)
        .map_err(|e| format!("Failed to create extension directory: {}", e))?;

    // Extract VSIX (which is a ZIP file)
    let cursor = Cursor::new(vsix_data);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to open VSIX archive: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;

        let outpath = full_target_path.join(file.name());

        if file.name().ends_with('/') {
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
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;

            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn remove_directory(app: AppHandle, path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_path = app_data_dir.join(&path);

    if !full_path.exists() {
        return Ok(()); // Already removed
    }

    // Safety check - ensure we're only removing directories under our extensions folder
    let extensions_dir = app_data_dir.join("extensions");
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot remove directory outside extensions folder".to_string());
    }

    fs::remove_dir_all(&full_path)
        .map_err(|e| format!("Failed to remove directory: {}", e))
}

#[tauri::command]
pub fn create_extension_directory(app: AppHandle, path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_path = app_data_dir.join(&path);

    // Safety check - ensure we're only creating directories under our extensions folder
    let extensions_dir = app_data_dir.join("extensions");
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot create directory outside extensions folder".to_string());
    }

    fs::create_dir_all(&full_path)
        .map_err(|e| format!("Failed to create extension directory: {}", e))
}

#[tauri::command]
pub fn list_extension_files(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_path = app_data_dir.join(&path);

    // Safety check - ensure we're only listing directories under our extensions folder
    let extensions_dir = app_data_dir.join("extensions");
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot list files outside extensions folder".to_string());
    }

    if !full_path.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&full_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

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
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let full_path = app_data_dir.join(&path);

    // Safety check - ensure we're only reading files under our extensions folder
    let extensions_dir = app_data_dir.join("extensions");
    if !full_path.starts_with(&extensions_dir) {
        return Err("Cannot read file outside extensions folder".to_string());
    }

    if !full_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}
