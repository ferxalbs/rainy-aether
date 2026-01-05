use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

/// Configuration scope (where settings are stored)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConfigurationScope {
    /// User-level settings (global across all workspaces)
    User,
    /// Workspace-level settings (specific to current project)
    Workspace,
    /// Machine-level settings (machine-specific)
    Machine,
    /// Default values from schema
    Default,
}

/// Configuration property type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PropertyType {
    String,
    Number,
    Integer,
    Boolean,
    Null,
    Array,
    Object,
}

/// Configuration property schema definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationProperty {
    /// Property type(s)
    #[serde(rename = "type")]
    pub property_type: PropertyType,

    /// Default value
    pub default: Option<Value>,

    /// Description
    pub description: Option<String>,

    /// Markdown description
    #[serde(rename = "markdownDescription")]
    pub markdown_description: Option<String>,

    /// Deprecation message
    #[serde(rename = "deprecationMessage")]
    pub deprecation_message: Option<String>,

    /// Configuration scope
    pub scope: Option<String>,

    /// Enum values (for dropdowns)
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<Value>>,

    /// Enum descriptions
    #[serde(rename = "enumDescriptions")]
    pub enum_descriptions: Option<Vec<String>>,

    /// Minimum value (for numbers)
    pub minimum: Option<f64>,

    /// Maximum value (for numbers)
    pub maximum: Option<f64>,

    /// Pattern for string validation
    pub pattern: Option<String>,

    /// Pattern error message
    #[serde(rename = "patternErrorMessage")]
    pub pattern_error_message: Option<String>,

    /// Min length (for strings)
    #[serde(rename = "minLength")]
    pub min_length: Option<usize>,

    /// Max length (for strings)
    #[serde(rename = "maxLength")]
    pub max_length: Option<usize>,

    /// Items schema (for arrays)
    pub items: Option<Box<ConfigurationProperty>>,

    /// Properties schema (for objects)
    pub properties: Option<HashMap<String, ConfigurationProperty>>,
}

/// Configuration contribution from extension
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationContribution {
    /// Configuration title
    pub title: Option<String>,

    /// Configuration properties
    pub properties: HashMap<String, ConfigurationProperty>,
}

/// Resolved configuration with metadata
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedConfiguration {
    /// Configuration key
    pub key: String,

    /// Current effective value
    pub value: Value,

    /// Default value from schema
    pub default: Option<Value>,

    /// Is value modified from default?
    pub is_modified: bool,

    /// Scope where value is defined
    pub scope: ConfigurationScope,

    /// Property schema
    pub property: ConfigurationProperty,

    /// Extension that contributed this property
    pub extension_id: String,

    /// Extension display name
    pub extension_name: String,

    /// Is built-in configuration?
    pub is_builtin: bool,
}

/// Configuration change event
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigurationChangeEvent {
    /// Changed keys
    pub changed_keys: Vec<String>,

    /// Scope where changes occurred
    pub scope: ConfigurationScope,

    /// Old values
    pub old_values: HashMap<String, Value>,

    /// New values
    pub new_values: HashMap<String, Value>,

    /// Timestamp
    pub timestamp: i64,
}

/// Configuration validation error
#[derive(Debug, Clone, Serialize)]
pub struct ValidationError {
    /// Configuration key
    pub key: String,

    /// Error message
    pub message: String,

    /// Expected type/format
    pub expected: Option<String>,

    /// Actual value
    pub actual: Option<Value>,
}

/// Get Rainy Aether configuration directory
fn get_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    let rainy_dir = home_dir.join(".rainy-aether");

    if !rainy_dir.exists() {
        fs::create_dir_all(&rainy_dir)
            .map_err(|e| format!("Failed to create .rainy-aether directory: {}", e))?;
    }

    Ok(rainy_dir)
}

/// Get user settings file path
fn get_user_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = get_config_dir(app)?;
    Ok(config_dir.join("settings.json"))
}

/// Get workspace settings file path
fn get_workspace_settings_path(workspace_path: &str) -> Result<PathBuf, String> {
    let workspace = PathBuf::from(workspace_path);
    let settings_dir = workspace.join(".rainy");

    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create .rainy directory: {}", e))?;
    }

    Ok(settings_dir.join("settings.json"))
}

/// Load JSON file as HashMap
fn load_json_file(path: &PathBuf) -> Result<HashMap<String, Value>, String> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read settings file: {}", e))?;

    let parsed: HashMap<String, Value> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings JSON: {}", e))?;

    Ok(parsed)
}

/// Save JSON file from HashMap
fn save_json_file(path: &PathBuf, data: &HashMap<String, Value>) -> Result<(), String> {
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(path, json).map_err(|e| format!("Failed to write settings file: {}", e))?;

    Ok(())
}

/// Validate configuration value against schema
fn validate_value(
    key: &str,
    value: &Value,
    property: &ConfigurationProperty,
) -> Result<(), ValidationError> {
    match property.property_type {
        PropertyType::String => {
            if !value.is_string() {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected string value".to_string(),
                    expected: Some("string".to_string()),
                    actual: Some(value.clone()),
                });
            }

            let str_value = value.as_str().ok_or_else(|| ValidationError {
                key: key.to_string(),
                message: "Failed to convert value to string".to_string(),
                expected: Some("string".to_string()),
                actual: Some(value.clone()),
            })?;

            // Min length validation
            if let Some(min_len) = property.min_length {
                if str_value.len() < min_len {
                    return Err(ValidationError {
                        key: key.to_string(),
                        message: format!("String must be at least {} characters", min_len),
                        expected: Some(format!(">= {} chars", min_len)),
                        actual: Some(value.clone()),
                    });
                }
            }

            // Max length validation
            if let Some(max_len) = property.max_length {
                if str_value.len() > max_len {
                    return Err(ValidationError {
                        key: key.to_string(),
                        message: format!("String must be at most {} characters", max_len),
                        expected: Some(format!("<= {} chars", max_len)),
                        actual: Some(value.clone()),
                    });
                }
            }

            // Pattern validation
            if let Some(pattern) = &property.pattern {
                let regex = regex::Regex::new(pattern).map_err(|_| ValidationError {
                    key: key.to_string(),
                    message: "Invalid regex pattern in schema".to_string(),
                    expected: None,
                    actual: None,
                })?;

                if !regex.is_match(str_value) {
                    return Err(ValidationError {
                        key: key.to_string(),
                        message: property
                            .pattern_error_message
                            .clone()
                            .unwrap_or_else(|| "Invalid format".to_string()),
                        expected: Some(pattern.clone()),
                        actual: Some(value.clone()),
                    });
                }
            }
        }
        PropertyType::Number | PropertyType::Integer => {
            if !value.is_number() {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected number value".to_string(),
                    expected: Some("number".to_string()),
                    actual: Some(value.clone()),
                });
            }

            let num_value = value.as_f64().ok_or_else(|| ValidationError {
                key: key.to_string(),
                message: "Failed to convert value to number".to_string(),
                expected: Some("number".to_string()),
                actual: Some(value.clone()),
            })?;

            // Integer check
            if matches!(property.property_type, PropertyType::Integer) && num_value.fract() != 0.0 {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected integer value".to_string(),
                    expected: Some("integer".to_string()),
                    actual: Some(value.clone()),
                });
            }

            // Min value validation
            if let Some(min) = property.minimum {
                if num_value < min {
                    return Err(ValidationError {
                        key: key.to_string(),
                        message: format!("Value must be at least {}", min),
                        expected: Some(format!(">= {}", min)),
                        actual: Some(value.clone()),
                    });
                }
            }

            // Max value validation
            if let Some(max) = property.maximum {
                if num_value > max {
                    return Err(ValidationError {
                        key: key.to_string(),
                        message: format!("Value must be at most {}", max),
                        expected: Some(format!("<= {}", max)),
                        actual: Some(value.clone()),
                    });
                }
            }
        }
        PropertyType::Boolean => {
            if !value.is_boolean() {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected boolean value".to_string(),
                    expected: Some("boolean".to_string()),
                    actual: Some(value.clone()),
                });
            }
        }
        PropertyType::Array => {
            if !value.is_array() {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected array value".to_string(),
                    expected: Some("array".to_string()),
                    actual: Some(value.clone()),
                });
            }
            // TODO: Validate array items against schema
        }
        PropertyType::Object => {
            if !value.is_object() {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected object value".to_string(),
                    expected: Some("object".to_string()),
                    actual: Some(value.clone()),
                });
            }
            // TODO: Validate object properties against schema
        }
        PropertyType::Null => {
            if !value.is_null() {
                return Err(ValidationError {
                    key: key.to_string(),
                    message: "Expected null value".to_string(),
                    expected: Some("null".to_string()),
                    actual: Some(value.clone()),
                });
            }
        }
    }

    Ok(())
}

/// Load user-level configuration
#[tauri::command]
pub fn load_user_configuration(app: AppHandle) -> Result<String, String> {
    let settings_path = get_user_settings_path(&app)?;
    let settings = load_json_file(&settings_path)?;

    serde_json::to_string(&settings)
        .map_err(|e| format!("Failed to serialize user configuration: {}", e))
}

/// Load workspace-level configuration
#[tauri::command]
pub fn load_workspace_configuration(workspace_path: String) -> Result<String, String> {
    let settings_path = get_workspace_settings_path(&workspace_path)?;
    let settings = load_json_file(&settings_path)?;

    serde_json::to_string(&settings)
        .map_err(|e| format!("Failed to serialize workspace configuration: {}", e))
}

/// Save user-level configuration
#[tauri::command]
pub fn save_user_configuration(app: AppHandle, configuration: String) -> Result<(), String> {
    let settings: HashMap<String, Value> = serde_json::from_str(&configuration)
        .map_err(|e| format!("Failed to parse configuration: {}", e))?;

    let settings_path = get_user_settings_path(&app)?;
    save_json_file(&settings_path, &settings)?;

    println!("[ConfigurationManager] Saved user configuration");

    Ok(())
}

/// Save workspace-level configuration
#[tauri::command]
pub fn save_workspace_configuration(
    workspace_path: String,
    configuration: String,
) -> Result<(), String> {
    let settings: HashMap<String, Value> = serde_json::from_str(&configuration)
        .map_err(|e| format!("Failed to parse configuration: {}", e))?;

    let settings_path = get_workspace_settings_path(&workspace_path)?;
    save_json_file(&settings_path, &settings)?;

    println!("[ConfigurationManager] Saved workspace configuration");

    Ok(())
}

/// Get a single configuration value (with scope resolution)
#[tauri::command]
pub fn get_configuration_value(
    app: AppHandle,
    key: String,
    workspace_path: Option<String>,
) -> Result<String, String> {
    // Load workspace settings if workspace path provided
    let workspace_settings = if let Some(ws_path) = workspace_path {
        let ws_settings_path = get_workspace_settings_path(&ws_path)?;
        load_json_file(&ws_settings_path)?
    } else {
        HashMap::new()
    };

    // Load user settings
    let user_settings_path = get_user_settings_path(&app)?;
    let user_settings = load_json_file(&user_settings_path)?;

    // Resolve value with scope priority: workspace > user
    let value = workspace_settings
        .get(&key)
        .or_else(|| user_settings.get(&key))
        .cloned()
        .unwrap_or(Value::Null);

    serde_json::to_string(&value)
        .map_err(|e| format!("Failed to serialize configuration value: {}", e))
}

/// Set a configuration value at specified scope
#[tauri::command]
pub fn set_configuration_value(
    app: AppHandle,
    key: String,
    value: String,
    scope: String,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let parsed_value: Value =
        serde_json::from_str(&value).map_err(|e| format!("Failed to parse value: {}", e))?;

    let scope_enum = match scope.as_str() {
        "user" => ConfigurationScope::User,
        "workspace" => ConfigurationScope::Workspace,
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    // Load appropriate settings file
    let (settings_path, mut settings) = match scope_enum {
        ConfigurationScope::User => {
            let path = get_user_settings_path(&app)?;
            let settings = load_json_file(&path)?;
            (path, settings)
        }
        ConfigurationScope::Workspace => {
            if let Some(ws_path) = workspace_path {
                let path = get_workspace_settings_path(&ws_path)?;
                let settings = load_json_file(&path)?;
                (path, settings)
            } else {
                return Err("Workspace path required for workspace scope".to_string());
            }
        }
        _ => return Err("Invalid scope".to_string()),
    };

    // Store old value for change event
    let old_value = settings.get(&key).cloned();

    // Update value
    settings.insert(key.clone(), parsed_value.clone());

    // Save to disk
    save_json_file(&settings_path, &settings)?;

    // Emit change event
    let mut old_values = HashMap::new();
    let mut new_values = HashMap::new();

    if let Some(old) = old_value {
        old_values.insert(key.clone(), old);
    }
    new_values.insert(key.clone(), parsed_value);

    let change_event = ConfigurationChangeEvent {
        changed_keys: vec![key],
        scope: scope_enum,
        old_values,
        new_values,
        timestamp: chrono::Utc::now().timestamp_millis(),
    };

    let _ = app.emit("configuration-changed", change_event);

    Ok(())
}

/// Delete a configuration value at specified scope
#[tauri::command]
pub fn delete_configuration_value(
    app: AppHandle,
    key: String,
    scope: String,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let scope_enum = match scope.as_str() {
        "user" => ConfigurationScope::User,
        "workspace" => ConfigurationScope::Workspace,
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    // Load appropriate settings file
    let (settings_path, mut settings) = match scope_enum {
        ConfigurationScope::User => {
            let path = get_user_settings_path(&app)?;
            let settings = load_json_file(&path)?;
            (path, settings)
        }
        ConfigurationScope::Workspace => {
            if let Some(ws_path) = workspace_path {
                let path = get_workspace_settings_path(&ws_path)?;
                let settings = load_json_file(&path)?;
                (path, settings)
            } else {
                return Err("Workspace path required for workspace scope".to_string());
            }
        }
        _ => return Err("Invalid scope".to_string()),
    };

    // Store old value for change event
    let old_value = settings.remove(&key);

    // Save to disk
    save_json_file(&settings_path, &settings)?;

    // Emit change event if value existed
    if let Some(old) = old_value {
        let mut old_values = HashMap::new();
        old_values.insert(key.clone(), old);

        let change_event = ConfigurationChangeEvent {
            changed_keys: vec![key],
            scope: scope_enum,
            old_values,
            new_values: HashMap::new(),
            timestamp: chrono::Utc::now().timestamp_millis(),
        };

        let _ = app.emit("configuration-changed", change_event);
    }

    Ok(())
}

/// Validate a configuration value against its schema
#[tauri::command]
pub fn validate_configuration_value(
    key: String,
    value: String,
    schema: String,
) -> Result<bool, String> {
    let parsed_value: Value =
        serde_json::from_str(&value).map_err(|e| format!("Failed to parse value: {}", e))?;

    let property: ConfigurationProperty =
        serde_json::from_str(&schema).map_err(|e| format!("Failed to parse schema: {}", e))?;

    match validate_value(&key, &parsed_value, &property) {
        Ok(_) => Ok(true),
        Err(err) => Err(serde_json::to_string(&err).unwrap_or(err.message)),
    }
}

/// Get all configuration keys at a scope
#[tauri::command]
pub fn list_configuration_keys(
    app: AppHandle,
    scope: String,
    workspace_path: Option<String>,
) -> Result<Vec<String>, String> {
    let scope_enum = match scope.as_str() {
        "user" => ConfigurationScope::User,
        "workspace" => ConfigurationScope::Workspace,
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    let settings = match scope_enum {
        ConfigurationScope::User => {
            let path = get_user_settings_path(&app)?;
            load_json_file(&path)?
        }
        ConfigurationScope::Workspace => {
            if let Some(ws_path) = workspace_path {
                let path = get_workspace_settings_path(&ws_path)?;
                load_json_file(&path)?
            } else {
                return Err("Workspace path required for workspace scope".to_string());
            }
        }
        _ => return Err("Invalid scope".to_string()),
    };

    Ok(settings.keys().cloned().collect())
}
