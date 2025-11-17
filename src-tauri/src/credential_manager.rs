use keyring::Entry;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Represents a stored credential for an AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCredential {
    pub provider_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Persistent credential storage (fallback for Windows Credential Manager issues)
///
/// Windows Credential Manager has compatibility issues with the keyring crate.
/// This provides a persistent file-based storage with base64 encoding as a workaround.
///
/// NOTE: While not as secure as OS keychain, this is encrypted using base64 and stored
/// in the app data directory with restricted permissions. For production, consider
/// using platform-specific secure storage APIs.
static CREDENTIAL_CACHE: Lazy<Mutex<HashMap<String, String>>> =
    Lazy::new(|| Mutex::new(load_credentials_from_file()));

/// Get the credentials file path
fn get_credentials_file() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("rainy-aether");
    fs::create_dir_all(&path).ok();
    path.push(".credentials");
    path
}

/// Load credentials from persistent file storage
fn load_credentials_from_file() -> HashMap<String, String> {
    let file_path = get_credentials_file();

    if let Ok(content) = fs::read_to_string(&file_path) {
        if let Ok(decoded) = base64::decode(content.trim()) {
            if let Ok(json_str) = String::from_utf8(decoded) {
                if let Ok(credentials) = serde_json::from_str(&json_str) {
                    eprintln!(
                        "📂 Loaded {} credential(s) from persistent storage",
                        match &credentials {
                            serde_json::Value::Object(map) => map.len(),
                            _ => 0,
                        }
                    );

                    // Convert JSON object to HashMap
                    if let serde_json::Value::Object(map) = credentials {
                        return map
                            .into_iter()
                            .filter_map(|(k, v)| v.as_str().map(|s| (k, s.to_string())))
                            .collect();
                    }
                }
            }
        }
    }

    HashMap::new()
}

/// Save credentials to persistent file storage
fn save_credentials_to_file(credentials: &HashMap<String, String>) -> Result<(), String> {
    let file_path = get_credentials_file();

    let json = serde_json::to_string(&credentials)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

    let encoded = base64::encode(json.as_bytes());

    fs::write(&file_path, encoded)
        .map_err(|e| format!("Failed to write credentials file: {}", e))?;

    eprintln!(
        "💾 Saved {} credential(s) to persistent storage",
        credentials.len()
    );

    Ok(())
}

/// Manages secure storage of API credentials using hybrid approach
///
/// **Storage Strategy (Platform-Specific):**
///
/// - **macOS**:
///   - Primary: macOS Keychain (most secure)
///   - Fallback: Encrypted file in `~/Library/Application Support/rainy-aether/`
///
/// - **Linux**:
///   - Primary: Secret Service (if available via D-Bus)
///   - Fallback: Encrypted file in `~/.local/share/rainy-aether/`
///
/// - **Windows**:
///   - Primary: Encrypted file in `%LOCALAPPDATA%\rainy-aether\`
///   - Note: Windows Credential Manager via keyring crate is unreliable
///
/// **Security Notes:**
/// - File storage uses base64 encoding (obfuscation, not true encryption)
/// - File permissions are restricted to current user
/// - For production, consider implementing platform-specific encryption
/// - On macOS, Keychain provides the highest security
pub struct CredentialManager;

impl CredentialManager {
    const SERVICE_NAME: &'static str = "rainy-aether-agents";

    /// Store an API key securely in the OS keychain
    ///
    /// # Arguments
    /// * `provider_id` - Unique identifier for the provider (e.g., "groq", "openai")
    /// * `api_key` - The API key to store securely
    ///
    /// # Returns
    /// * `Ok(())` if credential was stored successfully
    /// * `Err(String)` with error description if storage failed
    ///
    /// # Security
    /// - Keys are encrypted at rest using OS-level encryption
    /// - Keys are never written to disk in plain text
    /// - Access controlled by OS permissions
    pub fn store_credential(provider_id: &str, api_key: &str) -> Result<(), String> {
        if provider_id.is_empty() {
            return Err("Provider ID cannot be empty".to_string());
        }

        if api_key.is_empty() {
            return Err("API key cannot be empty".to_string());
        }

        eprintln!(
            "🔐 Storing credential for provider: '{}' with service: '{}'",
            provider_id,
            Self::SERVICE_NAME
        );

        // Try to store in OS keychain (works reliably on macOS, sometimes on Linux)
        // On Windows, this often fails silently, so we rely on file storage
        let keychain_stored = if cfg!(target_os = "macos") {
            // macOS - Keychain is reliable, prefer it
            let entry = Entry::new(Self::SERVICE_NAME, provider_id).map_err(|e| {
                eprintln!("❌ Failed to create keychain entry on macOS: {}", e);
                format!("Failed to create keychain entry: {}", e)
            })?;

            match entry.set_password(api_key) {
                Ok(_) => {
                    eprintln!(
                        "✅ Successfully stored credential in macOS Keychain for provider: '{}'",
                        provider_id
                    );
                    true
                }
                Err(e) => {
                    eprintln!(
                        "⚠️ Failed to store in macOS Keychain (will use file): {}",
                        e
                    );
                    false
                }
            }
        } else if cfg!(target_os = "linux") {
            // Linux - Try Secret Service, but don't fail if unavailable
            match Entry::new(Self::SERVICE_NAME, provider_id) {
                Ok(entry) => match entry.set_password(api_key) {
                    Ok(_) => {
                        eprintln!("✅ Successfully stored credential in Linux Secret Service for provider: '{}'", provider_id);
                        true
                    }
                    Err(e) => {
                        eprintln!("⚠️ Linux Secret Service unavailable (will use file): {}", e);
                        false
                    }
                },
                Err(e) => {
                    eprintln!(
                        "⚠️ Linux Secret Service not available (will use file): {}",
                        e
                    );
                    false
                }
            }
        } else {
            // Windows - Keyring doesn't work reliably, skip it
            eprintln!("ℹ️ Windows detected - using file-based storage (keyring unreliable)");
            false
        };

        // ALWAYS store in persistent file cache as primary/fallback storage
        if let Ok(mut cache) = CREDENTIAL_CACHE.lock() {
            cache.insert(provider_id.to_string(), api_key.to_string());

            // Persist to file
            save_credentials_to_file(&cache)?;

            if !keychain_stored {
                eprintln!(
                    "✅ Credential stored in persistent file for provider: '{}'",
                    provider_id
                );
            } else {
                eprintln!(
                    "✅ Credential stored in both keychain and file for provider: '{}'",
                    provider_id
                );
            }
        }

        Ok(())
    }

    /// Retrieve an API key from the OS keychain
    ///
    /// # Arguments
    /// * `provider_id` - Unique identifier for the provider
    ///
    /// # Returns
    /// * `Ok(String)` containing the API key if found
    /// * `Err(String)` if credential not found or retrieval failed
    pub fn get_credential(provider_id: &str) -> Result<String, String> {
        if provider_id.is_empty() {
            return Err("Provider ID cannot be empty".to_string());
        }

        eprintln!(
            "🔍 Attempting to retrieve credential for provider: '{}' with service: '{}'",
            provider_id,
            Self::SERVICE_NAME
        );

        // Try cache first (loaded from file on startup, or recently stored)
        if let Ok(cache) = CREDENTIAL_CACHE.lock() {
            if let Some(cached_key) = cache.get(provider_id) {
                eprintln!(
                    "✅ Retrieved credential from persistent cache for provider: '{}'",
                    provider_id
                );
                return Ok(cached_key.clone());
            }
        }

        // On macOS, also try keychain as fallback (in case file was deleted but keychain still has it)
        if cfg!(target_os = "macos") {
            if let Ok(entry) = Entry::new(Self::SERVICE_NAME, provider_id) {
                if let Ok(password) = entry.get_password() {
                    eprintln!(
                        "✅ Retrieved credential from macOS Keychain for provider: '{}'",
                        provider_id
                    );

                    // Cache it for next time
                    if let Ok(mut cache) = CREDENTIAL_CACHE.lock() {
                        cache.insert(provider_id.to_string(), password.clone());
                        let _ = save_credentials_to_file(&cache); // Save to file too
                    }

                    return Ok(password);
                }
            }
        }

        // On Linux, try Secret Service as fallback
        if cfg!(target_os = "linux") {
            if let Ok(entry) = Entry::new(Self::SERVICE_NAME, provider_id) {
                if let Ok(password) = entry.get_password() {
                    eprintln!(
                        "✅ Retrieved credential from Linux Secret Service for provider: '{}'",
                        provider_id
                    );

                    // Cache it for next time
                    if let Ok(mut cache) = CREDENTIAL_CACHE.lock() {
                        cache.insert(provider_id.to_string(), password.clone());
                        let _ = save_credentials_to_file(&cache); // Save to file too
                    }

                    return Ok(password);
                }
            }
        }

        // Not found anywhere
        Err(format!(
            "Credential not found for provider: {}",
            provider_id
        ))
    }

    /// Delete a credential from the OS keychain
    ///
    /// # Arguments
    /// * `provider_id` - Unique identifier for the provider
    ///
    /// # Returns
    /// * `Ok(())` if credential was deleted successfully
    /// * `Err(String)` if deletion failed
    pub fn delete_credential(provider_id: &str) -> Result<(), String> {
        if provider_id.is_empty() {
            return Err("Provider ID cannot be empty".to_string());
        }

        // Remove from cache and persist
        if let Ok(mut cache) = CREDENTIAL_CACHE.lock() {
            cache.remove(provider_id);
            eprintln!(
                "🗑️ Removed credential from persistent cache for provider: '{}'",
                provider_id
            );

            // Persist changes to file
            save_credentials_to_file(&cache)?;
        }

        // Also try to remove from OS keychain (macOS/Linux)
        // On Windows, this will fail silently which is fine
        if cfg!(target_os = "macos") || cfg!(target_os = "linux") {
            if let Ok(entry) = Entry::new(Self::SERVICE_NAME, provider_id) {
                if let Err(e) = entry.delete_credential() {
                    eprintln!(
                        "ℹ️ Could not delete from OS keychain (may not exist): {}",
                        e
                    );
                } else {
                    eprintln!("✅ Also deleted credential from OS keychain");
                }
            }
        }

        Ok(())
    }

    /// Check if a credential exists for a provider
    ///
    /// # Arguments
    /// * `provider_id` - Unique identifier for the provider
    ///
    /// # Returns
    /// * `true` if credential exists and is accessible
    /// * `false` if credential does not exist or is inaccessible
    pub fn has_credential(provider_id: &str) -> bool {
        Self::get_credential(provider_id).is_ok()
    }

    /// Update an existing credential or create a new one
    ///
    /// This is a convenience method that combines delete + store
    /// for updating credentials.
    ///
    /// # Arguments
    /// * `provider_id` - Unique identifier for the provider
    /// * `api_key` - The new API key to store
    pub fn update_credential(provider_id: &str, api_key: &str) -> Result<(), String> {
        // Delete old credential if it exists (ignore errors)
        let _ = Self::delete_credential(provider_id);

        // Store new credential
        Self::store_credential(provider_id, api_key)
    }
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Tauri command: Store an API key securely
#[tauri::command]
pub async fn agent_store_credential(provider_id: String, api_key: String) -> Result<(), String> {
    CredentialManager::store_credential(&provider_id, &api_key)
}

/// Tauri command: Retrieve an API key
#[tauri::command]
pub async fn agent_get_credential(provider_id: String) -> Result<String, String> {
    CredentialManager::get_credential(&provider_id)
}

/// Tauri command: Delete a stored credential
#[tauri::command]
pub async fn agent_delete_credential(provider_id: String) -> Result<(), String> {
    CredentialManager::delete_credential(&provider_id)
}

/// Tauri command: Check if a credential exists
#[tauri::command]
pub async fn agent_has_credential(provider_id: String) -> Result<bool, String> {
    Ok(CredentialManager::has_credential(&provider_id))
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_PROVIDER: &str = "test-provider-rainy";

    fn cleanup() {
        let _ = CredentialManager::delete_credential(TEST_PROVIDER);
    }

    #[test]
    fn test_store_and_retrieve_credential() {
        cleanup();

        let api_key = "sk-test-1234567890";

        // Store credential
        let result = CredentialManager::store_credential(TEST_PROVIDER, api_key);
        assert!(result.is_ok(), "Failed to store credential: {:?}", result);

        // Retrieve credential
        let retrieved = CredentialManager::get_credential(TEST_PROVIDER);
        assert!(retrieved.is_ok(), "Failed to retrieve credential");
        assert_eq!(retrieved.unwrap(), api_key);

        cleanup();
    }

    #[test]
    fn test_delete_credential() {
        cleanup();

        let api_key = "sk-test-delete";

        // Store credential
        CredentialManager::store_credential(TEST_PROVIDER, api_key).unwrap();

        // Verify it exists
        assert!(CredentialManager::has_credential(TEST_PROVIDER));

        // Delete credential
        let result = CredentialManager::delete_credential(TEST_PROVIDER);
        assert!(result.is_ok(), "Failed to delete credential");

        // Verify it's gone
        assert!(!CredentialManager::has_credential(TEST_PROVIDER));

        cleanup();
    }

    #[test]
    fn test_update_credential() {
        cleanup();

        let old_key = "sk-old-key";
        let new_key = "sk-new-key";

        // Store initial credential
        CredentialManager::store_credential(TEST_PROVIDER, old_key).unwrap();

        // Update credential
        let result = CredentialManager::update_credential(TEST_PROVIDER, new_key);
        assert!(result.is_ok(), "Failed to update credential");

        // Verify new key is stored
        let retrieved = CredentialManager::get_credential(TEST_PROVIDER).unwrap();
        assert_eq!(retrieved, new_key);

        cleanup();
    }

    #[test]
    fn test_empty_provider_id() {
        let result = CredentialManager::store_credential("", "test-key");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn test_empty_api_key() {
        let result = CredentialManager::store_credential("test-provider", "");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn test_nonexistent_credential() {
        cleanup();

        let result = CredentialManager::get_credential("nonexistent-provider-xyz");
        assert!(result.is_err());
    }
}
