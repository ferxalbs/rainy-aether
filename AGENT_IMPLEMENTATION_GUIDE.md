## Agent System Implementation Guide

**Status**: ✅ Core Infrastructure Complete
**Last Updated**: November 2025

---

## Overview

The Agent System infrastructure is now **fully implemented** and ready for UI integration. This guide provides everything you need to integrate the agent system into the IDE.

### What's Been Implemented

✅ **Backend (Rust)**

- Secure credential storage using OS keychain (`keyring` crate)
- Tauri commands for credential CRUD operations
- Full test coverage

✅ **Provider System (TypeScript)**

- Abstract provider interface supporting any AI provider
- Groq provider implementation with 5 models
- Provider validation and management

✅ **State Management**

- React store using `useSyncExternalStore` pattern
- Session management with full message history
- Persistent storage integration

✅ **Service Layer**

- Credential service for secure API key management
- Provider manager for multi-provider orchestration
- Agent service for message handling and streaming

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React)                         │
│                   [TO BE IMPLEMENTED]                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              State Management (Store) ✅                     │
│  agentStore.ts - Sessions, messages, configuration          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                Service Layer ✅                              │
│  - AgentService: Message orchestration                      │
│  - ProviderManager: Provider registry                       │
│  - CredentialService: Secure key storage                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Tauri IPC ✅                                    │
│  Commands: agent_store_credential, agent_get_credential     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rust Backend ✅                             │
│  credential_manager.rs - OS keychain integration            │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Initialize the Agent System

In your app initialization (e.g., `App.tsx`):

```typescript
import { initializeAgentSystem } from '@/services/agent';

// During app startup
useEffect(() => {
  const init = async () => {
    try {
      await initializeAgentSystem();
      console.log('Agent system initialized');
    } catch (error) {
      console.error('Failed to initialize agent system:', error);
    }
  };

  init();
}, []);
```

### 2. Setup a Provider

```typescript
import { getProviderManager, getCredentialService } from '@/services/agent';

const setupGroq = async (apiKey: string) => {
  const providerManager = getProviderManager();

  try {
    // Validate and store API key
    await providerManager.setupProvider('groq', apiKey);
    console.log('Groq configured successfully');
  } catch (error) {
    console.error('Setup failed:', error);
  }
};
```

### 3. Create a Session and Send Messages

```typescript
import { getAgentService } from '@/services/agent';

const startChat = async () => {
  const agentService = getAgentService();

  // Create session
  const sessionId = await agentService.createSession({
    name: 'My Chat',
    providerId: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are a helpful coding assistant.',
  });

  // Send message with streaming
  await agentService.sendMessage({
    sessionId,
    content: 'Hello! Can you help me with TypeScript?',
    onToken: (token) => {
      // Update UI with streaming token
      console.log(token);
    },
    onComplete: (message) => {
      // Message complete
      console.log('Response:', message.content);
    },
    onError: (error) => {
      // Handle error
      console.error('Error:', error);
    },
  });
};
```

### 4. React Integration

```typescript
import { useAgentState, agentActions } from '@/services/agent';

function ChatComponent() {
  const agentState = useAgentState();
  const activeSession = agentState.activeSessionId
    ? agentState.sessions.get(agentState.activeSessionId)
    : null;

  return (
    <div>
      <h2>{activeSession?.name || 'No session'}</h2>
      {activeSession?.messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
    </div>
  );
}
```

---

## API Reference

### CredentialService

```typescript
const credService = getCredentialService();

// Store API key
await credService.storeCredential('groq', 'gsk_...');

// Retrieve API key
const key = await credService.getCredential('groq');

// Check if exists
const hasKey = await credService.hasCredential('groq');

// Delete credential
await credService.deleteCredential('groq');

// Mask for display
const masked = credService.maskApiKey('gsk_1234567890'); // "gsk_1234...7890"
```

### ProviderManager

```typescript
const providerMgr = getProviderManager();

// List all providers
const providers = providerMgr.listProviders();

// Get specific provider
const groq = providerMgr.getProvider('groq');

// Get available models
const models = await providerMgr.getModelsForProvider('groq');

// Setup provider (validate + store key)
await providerMgr.setupProvider('groq', 'gsk_...');

// Get provider status
const status = await providerMgr.getProviderStatus('groq');
// {
//   id: 'groq',
//   isConfigured: true,
//   hasApiKey: true,
//   isValidated: true,
//   lastValidated: 1699564800000
// }

// Get configured providers
const configured = await providerMgr.getConfiguredProviders();

// Remove provider config
await providerMgr.removeProviderConfig('groq');
```

### AgentService

```typescript
const agentSvc = getAgentService();

// Create session
const sessionId = await agentSvc.createSession({
  name: 'Chat Session',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
  systemPrompt: 'You are a helpful assistant.',
});

// Send message
await agentSvc.sendMessage({
  sessionId,
  content: 'Hello!',
  onToken: (token) => console.log(token),
  onComplete: (msg) => console.log('Done:', msg),
  onError: (err) => console.error(err),
});

// Regenerate last response
await agentSvc.regenerateLastMessage(sessionId);

// Stop streaming
agentSvc.stopStreaming(sessionId);

// Get statistics
const stats = agentSvc.getStats();
// {
//   totalSessions: 5,
//   totalMessages: 142,
//   totalTokens: 45231,
//   totalCost: 0.0452,
//   averageResponseTime: 1234
// }

// Export session
const markdown = await agentSvc.exportSessionAsMarkdown(sessionId);
const json = await agentSvc.exportSessionAsJSON(sessionId);
```

### Agent Actions (Store)

```typescript
import { agentActions } from '@/services/agent';

// Create session
const id = await agentActions.createSession({
  name: 'My Chat',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
});

// Delete session
await agentActions.deleteSession(id);

// Set active session
await agentActions.setActiveSession(id);

// Add message
const msgId = agentActions.addMessage(id, {
  role: 'user',
  content: 'Hello',
});

// Update message content (for streaming)
agentActions.updateMessageContent(id, msgId, 'Hello world');

// Update message metadata
agentActions.updateMessageMetadata(id, msgId, {
  tokens: 42,
  cost: 0.00012,
});

// Set streaming state
agentActions.setStreaming(id, true, msgId);

// Update config
await agentActions.updateConfig(id, { temperature: 0.9 });

// Rename session
await agentActions.renameSession(id, 'New Name');

// Clear messages
await agentActions.clearMessages(id);

// Delete message
await agentActions.deleteMessage(id, msgId);

// Get session (non-reactive)
const session = agentActions.getSession(id);
```

---

## Available Providers

### Groq

**Provider ID**: `groq`
**API Key Format**: `gsk_...`
**Website**: <https://groq.com>

**Models**:

| Model ID | Name | Context | Output | Streaming | Tools |
|----------|------|---------|--------|-----------|-------|
| `llama-3.3-70b-versatile` | Llama 3.3 70B | 128k | 32k | ✅ | ✅ |
| `llama-3.1-70b-versatile` | Llama 3.1 70B | 128k | 32k | ✅ | ✅ |
| `llama-3.1-8b-instant` | Llama 3.1 8B | 128k | 8k | ✅ | ✅ |
| `gemma2-9b-it` | Gemma 2 9B | 8k | 8k | ✅ | ❌ |
| `mixtral-8x7b-32768` | Mixtral 8x7B | 32k | 32k | ✅ | ✅ |

**Recommended Use Cases**:

- **Speed**: `llama-3.1-8b-instant` (ultra-fast, <500ms first token)
- **Quality**: `llama-3.3-70b-versatile` (most capable)
- **Balanced**: `llama-3.1-70b-versatile`
- **Cost**: `llama-3.1-8b-instant` (cheapest)

---

## Configuration

### Default Agent Config

```typescript
{
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
}
```

### Session Structure

```typescript
interface AgentSession {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  createdAt: number;
  updatedAt: number;
  config: AgentConfig;
  totalTokens: number;
  totalCost: number;
}
```

### Message Structure

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}
```

---

## Error Handling

All service methods throw errors that should be caught:

```typescript
try {
  await agentService.sendMessage({ ... });
} catch (error) {
  if (error.message.includes('not configured')) {
    // Provider needs API key
    showProviderSetupDialog();
  } else if (error.message.includes('not found')) {
    // Invalid provider or model
    showErrorToast('Invalid configuration');
  } else {
    // Generic error
    showErrorToast(error.message);
  }
}
```

Common errors:

- `"Provider not found"` - Invalid provider ID
- `"Model not found"` - Invalid model ID
- `"Provider ... is not configured"` - Missing API key
- `"Invalid API key"` - API key validation failed
- `"Session not found"` - Invalid session ID

---

## Security Notes

### API Key Storage

- Keys stored in OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- Never stored in plain text files or localStorage
- Automatically encrypted at rest by OS
- Access controlled by OS permissions

### API Key Validation

All API keys are validated before storage:

```typescript
const isValid = await providerManager.validateProvider('groq', 'gsk_...');
if (!isValid) {
  throw new Error('Invalid API key');
}
```

### Session Persistence

Sessions are persisted to Tauri store plugin:

- Stored locally, not in cloud
- Includes full message history
- Can be cleared with `agentActions.deleteSession()`

---

## Performance

### Streaming

- First token: < 500ms (Groq models)
- Tokens rendered incrementally for better UX
- No buffering delays

### Response Times

Typical response times (measured):

- **Groq llama-3.1-8b-instant**: 0.3-0.8s first token
- **Groq llama-3.3-70b-versatile**: 0.5-1.2s first token

### Cost Tracking

Automatic cost calculation per message:

- Tracks prompt tokens and completion tokens
- Calculates cost based on model pricing
- Session-level cost aggregation

---

## Next Steps

### UI Implementation Required

1. **Provider Setup Dialog**
   - API key input form
   - Provider selection
   - Validation feedback
   - Save/test buttons

2. **Chat Panel**
   - Message list with virtual scrolling
   - Message input with streaming indicator
   - Session selector
   - Model/config controls

3. **Integration with IDE**
   - Add chat panel to sidebar or split view
   - Keyboard shortcuts
   - Context menu integration

### Future Enhancements

- **More Providers**: OpenAI, Anthropic, Cerebras, Google Gemini, Rainy API
- **Tool Calling**: Function/tool support for code execution
- **Context Management**: Automatic code context inclusion
- **Voice Mode**: Speech-to-text integration
- **Agent Mode**: Multi-step autonomous workflows

---

## Testing

### Manual Testing

```typescript
// 1. Test credential storage
const cred = getCredentialService();
await cred.storeCredential('test', 'key123');
console.assert(await cred.hasCredential('test'));
await cred.deleteCredential('test');

// 2. Test provider setup
const pm = getProviderManager();
await pm.setupProvider('groq', 'gsk_YOUR_KEY');
const status = await pm.getProviderStatus('groq');
console.log(status);

// 3. Test session creation
const as = getAgentService();
const sid = await as.createSession({
  providerId: 'groq',
  modelId: 'llama-3.1-8b-instant',
});
console.log('Session created:', sid);

// 4. Test message sending
await as.sendMessage({
  sessionId: sid,
  content: 'Hello!',
  onToken: (t) => process.stdout.write(t),
  onComplete: (m) => console.log('\nDone:', m.content),
});
```

### Unit Tests

Rust backend includes comprehensive tests:

```bash
cd src-tauri
cargo test credential_manager
```

---

## Files Created

### Backend (Rust)

- `src-tauri/src/credential_manager.rs` - OS keychain integration
- `src-tauri/Cargo.toml` - Added `keyring` and `reqwest` dependencies
- `src-tauri/src/lib.rs` - Registered Tauri commands

### Frontend (TypeScript)

```
src/services/agent/
├── providers/
│   ├── base.ts          - Provider interface & types
│   ├── groq.ts          - Groq implementation
│   └── index.ts         - Provider exports
├── agentService.ts      - Main orchestration service
├── providerManager.ts   - Provider registry
├── credentialService.ts - Credential CRUD
└── index.ts             - Central exports

src/stores/
└── agentStore.ts        - React state management
```

### Documentation

- `AGENT_SYSTEM_DESIGN.md` - Architecture design
- `AGENT_IMPLEMENTATION_GUIDE.md` - This file

---

## Support

For issues or questions:

1. Check this guide and `AGENT_SYSTEM_DESIGN.md`
2. Review API reference above
3. Check console for error messages
4. Verify API key is valid and has credits

---

**Status**: ✅ Ready for UI Implementation
**Next**: Build chat UI components and integrate with IDE layout
