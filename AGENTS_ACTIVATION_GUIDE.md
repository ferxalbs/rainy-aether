# Rainy Agents Activation Guide

## ✅ Implementation Complete

This guide documents the activation and integration of the Rainy Agents multi-agent system with API key management and database persistence.

---

## 🎯 What Was Implemented

### 1. **Secure API Key Management**
- **Location**: `src/stores/apiKeyStore.ts`
- **Features**:
  - Secure storage via OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service)
  - Support for Google Gemini and Groq providers
  - React hooks for UI integration
  - Automatic validation and status tracking

### 2. **API Key Dialog Component**
- **Location**: `src/components/agents/ApiKeyDialog.tsx`
- **Features**:
  - Beautiful Shadcn UI dialog
  - Tab-based interface for different providers
  - Show/hide toggle for security
  - Direct links to get API keys
  - Provider-specific instructions
  - Success/error feedback

### 3. **Agent Initialization Flow**
- **Location**: `src/services/agents/core/AgentRegistry.ts`
- **Updates**:
  - `initializeAgent(agentId)` - Initialize a single agent with API key
  - `initializeAllAgents()` - Initialize all agents at once
  - Automatic API key fetching from secure storage
  - Provider-specific configuration

### 4. **Router Integration**
- **Location**: `src/services/agents/core/AgentRouter.ts`
- **Updates**:
  - Pre-routing initialization check
  - Automatic agent initialization with API keys
  - Clear error messages for missing keys
  - Applied to both `route()` and `streamRoute()` methods

### 5. **UI Integration**
- **Location**: `src/components/agents/ChatMain.tsx`
- **Updates**:
  - API key check before sending messages
  - Automatic dialog display when keys are missing
  - Error handling with user-friendly messages
  - Integrated into both welcome screen and conversation view

---

## 🚀 How To Use

### For Users

1. **Start the IDE**
   ```bash
   pnpm tauri dev
   ```

2. **Navigate to Agents View**
   - Click on the Agents tab in the sidebar

3. **Try to Send a Message**
   - When you first try to send a message, you'll be prompted for API keys

4. **Configure API Keys**
   The dialog will appear with two tabs:

   **Groq (Llama 3.3)**
   - Go to: https://console.groq.com/keys
   - Create an API key
   - Paste it in the dialog (starts with `gsk_...`)
   - Used by: Rainy and Abby agents

   **Google (Gemini)**
   - Go to: https://aistudio.google.com/app/apikey
   - Create an API key
   - Paste it in the dialog (starts with `AIza...`)
   - Used by: Claude Code agent

5. **Start Chatting**
   - Once keys are configured, agents will initialize automatically
   - Send your first message!

### For Developers

#### Check API Key Status

```typescript
import { useApiKeys, apiKeyActions } from '@/stores/apiKeyStore';

function MyComponent() {
  const apiKeys = useApiKeys();

  // Check if provider is configured
  if (apiKeys.status.groq.configured) {
    console.log('Groq key:', apiKeys.status.groq.keyPrefix);
  }

  // Get missing providers
  const missing = apiKeyActions.getMissingProviders();
  console.log('Missing keys:', missing);
}
```

#### Manually Store API Keys

```typescript
import { apiKeyActions } from '@/stores/apiKeyStore';

// Store a key
await apiKeyActions.setKey('groq', 'gsk_...');

// Get a key
const key = await apiKeyActions.getKey('groq');

// Delete a key
await apiKeyActions.deleteKey('groq');
```

#### Initialize Agents Programmatically

```typescript
import { agentRegistry } from '@/services/agents/core/AgentRegistry';

// Initialize a specific agent
const success = await agentRegistry.initializeAgent('rainy');

// Initialize all agents
const count = await agentRegistry.initializeAllAgents();
console.log(`Initialized ${count} agents`);
```

---

## 🔧 Architecture

### API Key Flow

```
User enters API key
        ↓
ApiKeyDialog component
        ↓
apiKeyStore.setKey()
        ↓
Tauri: agent_store_credential
        ↓
credential_manager.rs
        ↓
OS Keychain (encrypted storage)
```

### Agent Initialization Flow

```
User sends message
        ↓
ChatMain.handleSend()
        ↓
AgentRouter.route()
        ↓
Check if agent initialized
        ↓ (if not initialized)
AgentRegistry.initializeAgent()
        ↓
apiKeyStore.getKey()
        ↓
Fetch from OS Keychain
        ↓
agent.initialize({ apiKey })
        ↓
Create Rust session + LangGraph agent
        ↓
Agent ready to receive messages
```

### Message Routing Flow

```
User message
        ↓
sessionBridge.sendMessage()
        ↓
AgentRouter.route()
        ↓
Ensure agent initialized
        ↓
Select agent (explicit/capability/load-balance)
        ↓
agent.sendMessage()
        ↓
Route to Fast Mode (Rust) or Smart Mode (LangGraph)
        ↓
Execute tools via Rust backend
        ↓
Return result to UI
```

---

## 🗄️ Database Integration (Optional)

The Turso database integration for conversation persistence is documented in `docs/db/TURSO_DB.md`.

### Quick Setup

1. **Add Turso Dependency**
   ```toml
   # src-tauri/Cargo.toml
   [dependencies]
   turso = "0.3.2"
   ```

2. **Initialize Database**
   ```rust
   // src-tauri/src/agents/database.rs
   use turso::Builder;

   pub async fn init_db() -> Result<turso::Connection, String> {
       let db = Builder::new_local("~/.rainy-aether/agents.db")
           .build()
           .await
           .map_err(|e| e.to_string())?;

       let conn = db.connect()
           .map_err(|e| e.to_string())?;

       Ok(conn)
   }
   ```

3. **Create Schema**
   ```sql
   CREATE TABLE IF NOT EXISTS agent_sessions (
       id TEXT PRIMARY KEY,
       agent_id TEXT NOT NULL,
       created_at INTEGER NOT NULL
   );

   CREATE TABLE IF NOT EXISTS agent_messages (
       id TEXT PRIMARY KEY,
       session_id TEXT NOT NULL,
       role TEXT NOT NULL,
       content TEXT NOT NULL,
       created_at INTEGER NOT NULL
   );
   ```

---

## 🧪 Testing

### Manual Test Checklist

- [ ] **API Key Dialog Appears**
  - Navigate to Agents view
  - Try to send a message without keys
  - Dialog should appear

- [ ] **Store API Keys**
  - Enter Groq key in dialog
  - Enter Google key in dialog
  - Click "Save Keys"
  - Success message should appear

- [ ] **Agent Initialization**
  - Open browser console
  - Send a message
  - Should see: "🔑 Initializing rainy with API key..."
  - Should see: "✅ Agent rainy initialized with groq provider"

- [ ] **Send Messages**
  - Rainy agent with Groq
  - Claude Code agent with Google
  - Abby agent with Groq

- [ ] **Error Handling**
  - Delete API keys
  - Try to send message
  - Should see error and dialog

### Automated Testing

```bash
# Type check
pnpm tsc --noEmit

# Build to verify no errors
pnpm tauri build
```

---

## 🔐 Security

### API Key Storage

API keys are stored using the OS-native secure storage:

- **Windows**: Windows Credential Manager
- **macOS**: Keychain Services (encrypted)
- **Linux**: Secret Service API via D-Bus

Keys are:
- ✅ Encrypted at rest by the OS
- ✅ Never written to disk in plain text
- ✅ Never sent to external servers
- ✅ Access controlled by OS permissions
- ✅ Isolated per user account

### Best Practices

1. **Never log API keys** - The code uses `keyPrefix` for display
2. **Validate input** - All inputs validated in Rust
3. **Handle errors gracefully** - No sensitive info in error messages
4. **Use environment separation** - Different keys for dev/prod

---

## 📝 File Changes Summary

### New Files Created

1. `src/stores/apiKeyStore.ts` - API key management store
2. `src/components/agents/ApiKeyDialog.tsx` - API key dialog UI
3. `AGENTS_ACTIVATION_GUIDE.md` - This document

### Modified Files

1. `src/services/agents/core/AgentRegistry.ts`
   - Added `initializeAgent()`
   - Added `initializeAllAgents()`
   - Updated `performInitialization()`

2. `src/services/agents/core/AgentRouter.ts`
   - Added initialization check in `route()`
   - Added initialization check in `streamRoute()`

3. `src/components/agents/ChatMain.tsx`
   - Added API key checking
   - Added dialog integration
   - Added error handling

4. `src/components/agents/index.tsx`
   - Exported `ApiKeyDialog`

### Existing Files (No Changes Needed)

- `src-tauri/src/credential_manager.rs` - Already has all needed commands
- `src-tauri/src/lib.rs` - Commands already registered

---

## 🚦 Next Steps

### Immediate

1. **Test the Integration**
   - Run `pnpm tauri dev`
   - Try all three agents
   - Verify API key storage

2. **Add Database Persistence** (Optional)
   - Implement Turso DB as documented
   - Store conversation history
   - Enable session restoration

### Future Enhancements

1. **API Key Validation**
   - Test keys before saving
   - Show provider status (rate limits, usage)

2. **Key Rotation**
   - Support multiple keys per provider
   - Automatic fallback on rate limit

3. **Settings Integration**
   - Add API keys section to IDE settings
   - Allow editing/deleting keys from settings

4. **Multi-Provider Support**
   - Add OpenAI provider
   - Add Anthropic provider
   - Add local LLM support

---

## 🐛 Troubleshooting

### "Agent not initialized" Error

**Cause**: API keys not configured or agent failed to initialize

**Solution**:
1. Check if API keys are stored: Use the dialog
2. Check console for initialization errors
3. Verify API key is valid for the provider

### "No API key found" Error

**Cause**: OS keychain not accessible or key was deleted

**Solution**:
1. Re-enter API keys in the dialog
2. Check OS keychain permissions
3. On Linux, ensure `secret-tool` is installed

### Dialog Not Appearing

**Cause**: Dialog state not triggered

**Solution**:
1. Check browser console for errors
2. Verify `showApiKeyDialog` state
3. Check if Shadcn Dialog components are properly installed

### Keys Not Persisting

**Cause**: Keychain access denied or service name mismatch

**Solution**:
1. Check OS keychain app (Keychain Access on macOS)
2. Look for service: `rainy-aether-agents`
3. Verify Rust credential manager is working:
   ```rust
   cargo test --package rainy-aether --lib credential_manager::tests
   ```

---

## 📚 Related Documentation

- [RAINY_AGENTS_MASTER_PLAN.md](docs/agents/RAINY_AGENTS_MASTER_PLAN.md) - Complete system architecture
- [TURSO_DB.md](docs/db/TURSO_DB.md) - Database integration guide
- [CLAUDE.md](CLAUDE.md) - AI assistant reference guide

---

## 🎉 Success Criteria

✅ **API Key Management**
- Keys stored securely in OS keychain
- Dialog appears when keys needed
- Keys persisted across sessions

✅ **Agent Initialization**
- Agents initialize automatically with stored keys
- Clear error messages when keys missing
- Support for both Groq and Google providers

✅ **Routing Integration**
- Router checks initialization before routing
- Automatic initialization on first use
- Proper error handling throughout

✅ **UI Integration**
- Seamless dialog experience
- No friction for users
- Clear feedback on all actions

---

**Status**: ✅ Ready for Testing
**Last Updated**: 2025-11-17
**Version**: 1.0

Built with ❤️ by the Rainy Aether team
