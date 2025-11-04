use keyring::Entry;
use serde::{Deserialize, Serialize};

/// Represents a stored credential for an AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCredential {
    pub provider_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Manages secure storage of API credentials using OS keychain
///
/// - **Windows**: Windows Credential Manager
/// - **macOS**: Keychain Services
/// - **Linux**: Secret Service API (via D-Bus)
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

        let entry = Entry::new(Self::SERVICE_NAME, provider_id)
            .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

        entry
            .set_password(api_key)
            .map_err(|e| format!("Failed to store credential in keychain: {}", e))?;

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

        let entry = Entry::new(Self::SERVICE_NAME, provider_id)
            .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

        entry
            .get_password()
            .map_err(|e| format!("Credential not found or access denied: {}", e))
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

        let entry = Entry::new(Self::SERVICE_NAME, provider_id)
            .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

        entry
            .delete_credential()
            .map_err(|e| format!("Failed to delete credential: {}", e))?;

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
