use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Font source type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FontSource {
    System,
    Google,
    Custom,
}

/// Font variant style
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FontStyle {
    Normal,
    Italic,
    Oblique,
}

/// Font variant definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FontVariant {
    pub name: String,
    pub weight: u16,
    pub style: FontStyle,
    pub url: Option<String>,
    pub is_installed: bool,
}

/// Font metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FontMetadata {
    pub id: String,
    pub family: String,
    pub variants: Vec<FontVariant>,
    pub source: FontSource,
    pub category: Option<String>,
    pub preview_url: Option<String>,
    pub files: Option<HashMap<String, String>>,
}

/// Font manifest (persisted to disk)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FontManifest {
    pub fonts: Vec<FontMetadata>,
    pub version: String,
    pub last_updated: i64,
}

/// Get fonts directory path
fn get_fonts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    let fonts_dir = home_dir.join(".rainy-aether").join("fonts");

    if !fonts_dir.exists() {
        fs::create_dir_all(&fonts_dir)
            .map_err(|e| format!("Failed to create fonts directory: {}", e))?;
    }

    Ok(fonts_dir)
}

/// Get manifest file path
fn get_manifest_path(app: &AppHandle) -> Result<PathBuf, String> {
    let fonts_dir = get_fonts_dir(app)?;
    Ok(fonts_dir.join("manifest.json"))
}

/// Load font manifest from disk
#[tauri::command]
pub async fn load_font_manifest(app: AppHandle) -> Result<String, String> {
    let manifest_path = get_manifest_path(&app)?;

    if !manifest_path.exists() {
        // Return empty manifest
        let empty_manifest = FontManifest {
            fonts: vec![],
            version: "1.0.0".to_string(),
            last_updated: chrono::Utc::now().timestamp(),
        };

        let json = serde_json::to_string(&empty_manifest)
            .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

        return Ok(json);
    }

    let content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    Ok(content)
}

/// Save font manifest to disk
#[tauri::command]
pub async fn save_font_manifest(app: AppHandle, manifest_json: String) -> Result<(), String> {
    let manifest_path = get_manifest_path(&app)?;

    // Validate JSON before saving
    let _manifest: FontManifest = serde_json::from_str(&manifest_json)
        .map_err(|e| format!("Invalid manifest JSON: {}", e))?;

    fs::write(&manifest_path, manifest_json.as_bytes())
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    Ok(())
}

/// Download font file from URL
#[tauri::command]
pub async fn download_font_file(
    app: AppHandle,
    url: String,
    font_family: String,
    variant_name: String,
) -> Result<String, String> {
    let fonts_dir = get_fonts_dir(&app)?;

    // Sanitize font family name for filename
    let sanitized_family = font_family
        .to_lowercase()
        .replace(' ', "-")
        .replace('_', "-");

    // Determine file extension from URL
    let extension = if url.contains(".woff2") {
        "woff2"
    } else if url.contains(".woff") {
        "woff"
    } else if url.contains(".ttf") {
        "ttf"
    } else if url.contains(".otf") {
        "otf"
    } else {
        "ttf" // default
    };

    let filename = format!("{}-{}.{}", sanitized_family, variant_name, extension);
    let file_path = fonts_dir.join(&filename);

    // Download file
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download font: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Write to file
    fs::write(&file_path, &bytes).map_err(|e| format!("Failed to write font file: {}", e))?;

    // Return absolute path
    let absolute_path = file_path
        .to_str()
        .ok_or("Invalid path encoding")?
        .to_string();

    Ok(absolute_path)
}

/// Read font file as base64
#[tauri::command]
pub async fn read_font_file_base64(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("Font file not found: {}", file_path));
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read font file: {}", e))?;

    use base64::Engine;
    let base64 = base64::engine::general_purpose::STANDARD.encode(&bytes);

    Ok(base64)
}

/// Import custom font file
#[tauri::command]
pub async fn import_custom_font_file(
    app: AppHandle,
    source_path: String,
    font_family: String,
) -> Result<String, String> {
    let fonts_dir = get_fonts_dir(&app)?;

    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err(format!("Source file not found: {}", source_path));
    }

    // Get file extension
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("Invalid file extension")?;

    // Validate font file format
    let valid_extensions = ["ttf", "otf", "woff", "woff2"];
    if !valid_extensions.contains(&extension.to_lowercase().as_str()) {
        return Err(format!(
            "Invalid font file format. Supported: {}",
            valid_extensions.join(", ")
        ));
    }

    // Validate file signature (basic check)
    let bytes = fs::read(&source).map_err(|e| format!("Failed to read source file: {}", e))?;

    if bytes.len() < 4 {
        return Err("File too small to be a valid font".to_string());
    }

    // Check magic numbers
    let signature = &bytes[0..4];
    let is_valid = match extension.to_lowercase().as_str() {
        "ttf" => signature == b"\x00\x01\x00\x00" || signature == b"true",
        "otf" => signature == b"OTTO",
        "woff" => signature == b"wOFF",
        "woff2" => signature == b"wOF2",
        _ => false,
    };

    if !is_valid {
        return Err("Invalid font file signature".to_string());
    }

    // Sanitize font family name
    let sanitized_family = font_family
        .to_lowercase()
        .replace(' ', "-")
        .replace('_', "-");

    let filename = format!("{}.{}", sanitized_family, extension);
    let dest_path = fonts_dir.join(&filename);

    // Copy file
    fs::copy(&source, &dest_path).map_err(|e| format!("Failed to copy font file: {}", e))?;

    // Return absolute path
    let absolute_path = dest_path
        .to_str()
        .ok_or("Invalid path encoding")?
        .to_string();

    Ok(absolute_path)
}

/// Delete font file
#[tauri::command]
pub async fn delete_font_file(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Ok(()); // Already deleted
    }

    fs::remove_file(&path).map_err(|e| format!("Failed to delete font file: {}", e))?;

    Ok(())
}

/// Validate font file format
#[tauri::command]
pub async fn validate_font_file(file_path: String) -> Result<bool, String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("Invalid file extension")?;

    let valid_extensions = ["ttf", "otf", "woff", "woff2"];
    if !valid_extensions.contains(&extension.to_lowercase().as_str()) {
        return Ok(false);
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    if bytes.len() < 4 {
        return Ok(false);
    }

    let signature = &bytes[0..4];
    let is_valid = match extension.to_lowercase().as_str() {
        "ttf" => signature == b"\x00\x01\x00\x00" || signature == b"true",
        "otf" => signature == b"OTTO",
        "woff" => signature == b"wOFF",
        "woff2" => signature == b"wOF2",
        _ => false,
    };

    Ok(is_valid)
}

/// Get font file info
#[tauri::command]
pub async fn get_font_file_info(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown");

    let info = serde_json::json!({
        "path": file_path,
        "size": metadata.len(),
        "extension": extension,
        "modified": metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0),
    });

    serde_json::to_string(&info).map_err(|e| format!("Failed to serialize info: {}", e))
}
