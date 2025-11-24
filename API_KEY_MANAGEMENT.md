# API Key Management

> **Secure credential storage for AI providers in Rainy Aether**

## 🔐 Overview

The Agent system now includes a secure, user-friendly dialog for managing API keys for different AI providers. All credentials are stored securely using Tauri's credential manager and the operating system's secure keychain.

---

## 🎯 Features

### ✅ Security
- **Encrypted Storage**: Uses OS-level secure credential storage
- **Never Logged**: Keys are never logged or exposed in debug output
- **Masked Display**: Existing keys show as `AIza••••••••abcd`
- **Show/Hide Toggle**: Eye icon to reveal/hide keys when needed
- **Clear Functionality**: Easy removal of stored keys

### ✅ User Experience
- **Visual Status Indicators**: Green checkmark shows configured keys
- **Direct Links**: Quick access to get API keys from providers
- **Real-time Validation**: Immediate feedback on save
- **Helpful Descriptions**: Clear info about which models need which keys
- **Privacy Info**: Transparent about how keys are stored and used

---

## 🖼️ UI Components

### Settings Dialog

**Location**: Top-right corner of Agents view (gear icon)

**Sections**:
1. **Google Gemini API Key**
   - Input field with show/hide toggle
   - Link to Google AI Studio
   - Status indicator
   - Required for: `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`

2. **Groq API Key**
   - Input field with show/hide toggle
   - Link to Groq Console
   - Status indicator
   - Required for: `llama-3.3-70b`, `llama-3.1-8b`, `mixtral-8x7b`

3. **Security & Privacy Info**
   - Explanation of how keys are stored
   - Privacy assurances
   - Usage transparency

---

## 🔧 Technical Implementation

### Component: `AgentSettingsDialog.tsx`

**Key Features**:
```typescript
// Load existing keys (masked)
const loadKeys = async () => {
  const geminiKey = await loadCredential('gemini_api_key');
  const groqKey = await loadCredential('groq_api_key');
  // Display as masked
};

// Save keys securely
const handleSave = async () => {
  await saveCredential('gemini_api_key', geminiKey);
  await saveCredential('groq_api_key', groqKey);
};

// Mask sensitive data
const maskKey = (key: string): string => {
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
};
```

### Tauri Backend Commands

**Already implemented in credential manager**:
- `agent_store_credential(key, value)` - Save encrypted credential
- `agent_get_credential(key)` - Retrieve decrypted credential
- `agent_delete_credential(key)` - Remove credential

**Storage Location**:
- **Windows**: Windows Credential Manager
- **macOS**: macOS Keychain
- **Linux**: Secret Service API (libsecret)

---

## 📖 User Guide

### How to Set Up API Keys

1. **Open Settings**
   - Click the gear icon (⚙️) in the top-right of the Agents view

2. **Get API Keys**
   - Click "Get API Key" links for each provider
   - **Gemini**: https://aistudio.google.com/app/apikey
   - **Groq**: https://console.groq.com/keys

3. **Enter Keys**
   - Paste your API key into the input field
   - Use the eye icon to verify the key is correct
   - Click "Save Keys"

4. **Start Using Agents**
   - Select a model from the dropdown
   - Start chatting!

### Managing Keys

**View Existing Keys**:
- Open settings dialog
- Existing keys show as masked: `AIza••••••••abcd`
- Click eye icon to reveal full key

**Update a Key**:
- Open settings dialog
- Clear the field or paste new key
- Click "Save Keys"

**Delete a Key**:
- Open settings dialog
- Click "Clear" button next to the key
- Click "Save Keys"

---

## 🔒 Security & Privacy

### What's Stored
- **API Keys Only**: Only your AI provider API keys
- **Encrypted**: All keys are encrypted at rest
- **OS Keychain**: Uses your system's secure credential storage

### What's NOT Stored
- ❌ Chat conversations (stored in memory only)
- ❌ Personal information
- ❌ Usage statistics
- ❌ Keys are NOT sent to Rainy Aether servers (we don't have any!)

### Where Keys Are Used
- ✅ Google Gemini API - Only when using Gemini models
- ✅ Groq API - Only when using Groq models
- ❌ Nowhere else

### Security Best Practices
1. **Don't Share Keys**: API keys are like passwords
2. **Use Key Restrictions**: Configure API key restrictions in provider consoles
3. **Rotate Regularly**: Change keys periodically
4. **Monitor Usage**: Check your API usage in provider dashboards
5. **Revoke if Compromised**: Delete and create new keys if exposed

---

## 🛠️ Troubleshooting

### "Failed to save API keys"
**Cause**: Tauri credential manager not accessible
**Solution**:
- Check OS permissions
- Restart the application
- Verify keychain/credential manager is working

### "Provider not initialized. Check API credentials."
**Cause**: No API key configured for selected model
**Solution**:
1. Open settings (⚙️ icon)
2. Verify the key for the selected model's provider is saved
3. Try selecting a different model

### Keys not persisting
**Cause**: Storage permission issue
**Solution**:
- Grant Rainy Aether access to system keychain
- Check for OS-level security restrictions

### "Invalid API key" from AI provider
**Cause**: Incorrect or expired key
**Solution**:
1. Verify key in provider's console
2. Check for extra spaces or characters
3. Regenerate key in provider's console
4. Update in Rainy Aether settings

---

## 🎨 Customization

### Adding New Providers

To add support for a new AI provider:

1. **Create Provider Implementation**
   ```typescript
   // src/services/agent/providers/myProvider.ts
   export class MyProvider implements AIProvider {
     // Implementation
   }
   ```

2. **Update Provider Factory**
   ```typescript
   // src/services/agent/providers/index.ts
   export const AVAILABLE_MODELS: ModelConfig[] = [
     {
       id: 'my-model',
       name: 'My Model',
       provider: 'myProvider',
       model: 'model-id',
     },
   ];
   ```

3. **Add to Settings Dialog**
   ```typescript
   // In AgentSettingsDialog.tsx
   const [myProviderKey, setMyProviderKey] = useState('');

   // Add input field and save logic
   ```

---

## 📊 API Key Format Reference

### Google Gemini
- **Format**: `AIza...` (39 characters)
- **Example**: `AIzaSyDaGmRXZ1234567890abcdefghijklmno`
- **Get Key**: https://aistudio.google.com/app/apikey

### Groq
- **Format**: `gsk_...` (starts with gsk_)
- **Example**: `gsk_1234567890abcdefghijklmnopqrstuvwxyz`
- **Get Key**: https://console.groq.com/keys

---

## 🔄 Integration with Agent System

### Automatic Loading

When you send a message:
```
User sends message
  ↓
AgentService.sendMessage()
  ↓
Load credentials from secure storage
  ↓
Initialize provider with API key
  ↓
Send request to AI provider
```

### Lazy Initialization

- Keys are loaded on-demand (not at app start)
- Only loaded when needed for a specific provider
- Cached during session for performance

---

## 📈 Future Enhancements

Planned features:
- [ ] API key validation (test connection)
- [ ] Usage tracking and limits
- [ ] Multiple key support (rotation)
- [ ] Organization/workspace keys
- [ ] Key expiration warnings
- [ ] Biometric authentication for key access
- [ ] Import/export keys (encrypted)

---

## 📚 Related Documentation

- [AGENT_ARCHITECTURE.md](AGENT_ARCHITECTURE.md) - Complete agent system overview
- [Tauri Security](https://tauri.app/v1/guides/features/security) - Security best practices
- [Google Gemini API Docs](https://ai.google.dev/docs) - Gemini API documentation
- [Groq API Docs](https://console.groq.com/docs) - Groq API documentation

---

**Built with security in mind by the Rainy Aether Team** 🔐
