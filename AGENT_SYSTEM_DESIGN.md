# Agent System Architecture Design

**Version**: 1.0.0
**Last Updated**: November 2025
**Status**: Initial Design - Phase 2.1 Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Component Design](#component-design)
4. [Security Architecture](#security-architecture)
5. [Provider System](#provider-system)
6. [State Management](#state-management)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

The Agent System is designed to be **modular**, **extensible**, and **secure** from the ground up. Following Rainy Aether's core principles:

- **Multi-Provider First**: Abstract interface supporting any AI provider
- **Security by Design**: Secure API key storage using OS-level keychain
- **Performance Focused**: Streaming responses, efficient state management
- **Developer Experience**: TypeScript type safety, clear abstractions

### Core Principles

1. **Provider Abstraction**: Single interface, multiple implementations
2. **Secure by Default**: All credentials encrypted at rest
3. **Streaming Native**: First-class support for streaming responses
4. **Type Safety**: Full TypeScript coverage with Zod validation
5. **Observable State**: React-friendly state management

---

## Architecture Layers

```table
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Chat Panel  │  │ Agent Config │  │ Provider Setup  │   │
│  │  Component   │  │   Dialog     │  │     Dialog      │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              State Management (Store)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Agent Store  │  │Provider Store│  │  Message Store  │   │
│  │  (Sessions)  │  │ (API Keys)   │  │   (History)     │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                Service Layer (TypeScript)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │Agent Service │  │Provider      │  │  Credential     │   │
│  │(Orchestration)│  │  Manager    │  │   Service       │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Tauri IPC (Commands/Events)                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rust Backend (Tauri)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Credential  │  │   HTTP       │  │   Streaming     │   │
│  │   Manager    │  │   Client     │  │    Manager      │   │
│  │ (Keychain)   │  │ (Reqwest)    │  │   (SSE/WS)      │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Provider Abstraction Layer

**Purpose**: Unified interface for all AI providers

**Interface Design** (`src/services/agent/providers/base.ts`):

```typescript
export interface AIProvider {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;

  // Model management
  listModels(): Promise<AIModel[]>;
  getModel(modelId: string): AIModel | undefined;

  // Text generation
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
  streamText(params: StreamTextParams): AsyncIterable<TextStreamEvent>;

  // Validation
  validateApiKey(apiKey: string): Promise<boolean>;

  // Configuration
  getDefaultConfig(): ProviderConfig;
}

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}
```

**Provider Implementations**:

1. **GroqProvider** (`src/services/agent/providers/groq.ts`)
   - Uses `@ai-sdk/groq` from Vercel AI SDK
   - Models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `gemma2-9b-it`
   - Ultra-fast inference (first token < 500ms)

2. **RainyAPIProvider** (Future)
   - OpenAI-compatible format
   - Custom Enosis Labs models
   - Drop-in replacement for OpenAI provider

3. **OpenAIProvider**, **AnthropicProvider**, **CerebrasProvider** (Future)

### 2. Secure Credential Storage

**Backend** (`src-tauri/src/credential_manager.rs`):

```rust
use keyring::Entry;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ProviderCredential {
    provider_id: String,
    api_key: String,
    encrypted: bool,
    created_at: i64,
    updated_at: i64,
}

pub struct CredentialManager;

impl CredentialManager {
    // Store API key securely in OS keychain
    pub fn store_credential(
        provider_id: &str,
        api_key: &str
    ) -> Result<(), String> {
        let service = "rainy-aether-agents";
        let entry = Entry::new(service, provider_id)
            .map_err(|e| format!("Keychain error: {}", e))?;

        entry.set_password(api_key)
            .map_err(|e| format!("Failed to store credential: {}", e))?;

        Ok(())
    }

    // Retrieve API key from OS keychain
    pub fn get_credential(provider_id: &str) -> Result<String, String> {
        let service = "rainy-aether-agents";
        let entry = Entry::new(service, provider_id)
            .map_err(|e| format!("Keychain error: {}", e))?;

        entry.get_password()
            .map_err(|e| format!("Credential not found: {}", e))
    }

    // Remove credential from keychain
    pub fn delete_credential(provider_id: &str) -> Result<(), String> {
        let service = "rainy-aether-agents";
        let entry = Entry::new(service, provider_id)
            .map_err(|e| format!("Keychain error: {}", e))?;

        entry.delete_credential()
            .map_err(|e| format!("Failed to delete credential: {}", e))?;

        Ok(())
    }

    // List all stored provider IDs (not the keys themselves)
    pub fn list_providers() -> Result<Vec<String>, String> {
        // Implementation depends on platform-specific keychain enumeration
        // For initial version, we'll maintain a separate list in Tauri store
        Ok(vec![])
    }
}
```

**Tauri Commands** (`src-tauri/src/lib.rs`):

```rust
#[tauri::command]
async fn agent_store_credential(
    provider_id: String,
    api_key: String
) -> Result<(), String> {
    credential_manager::CredentialManager::store_credential(&provider_id, &api_key)
}

#[tauri::command]
async fn agent_get_credential(provider_id: String) -> Result<String, String> {
    credential_manager::CredentialManager::get_credential(&provider_id)
}

#[tauri::command]
async fn agent_delete_credential(provider_id: String) -> Result<(), String> {
    credential_manager::CredentialManager::delete_credential(&provider_id)
}

#[tauri::command]
async fn agent_validate_credential(
    provider_id: String,
    api_key: String
) -> Result<bool, String> {
    // Make a lightweight API call to validate the key
    // Implementation will vary by provider
    Ok(true)
}
```

### 3. Frontend Credential Service

**Service** (`src/services/agent/credentialService.ts`):

```typescript
import { invoke } from '@tauri-apps/api/core';

export class CredentialService {
  private static instance: CredentialService;

  static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  async storeCredential(providerId: string, apiKey: string): Promise<void> {
    await invoke('agent_store_credential', { providerId, apiKey });
  }

  async getCredential(providerId: string): Promise<string> {
    return await invoke('agent_get_credential', { providerId });
  }

  async deleteCredential(providerId: string): Promise<void> {
    await invoke('agent_delete_credential', { providerId });
  }

  async validateCredential(providerId: string, apiKey: string): Promise<boolean> {
    return await invoke('agent_validate_credential', { providerId, apiKey });
  }

  async hasCredential(providerId: string): Promise<boolean> {
    try {
      await this.getCredential(providerId);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4. Agent State Management

**Store** (`src/stores/agentStore.ts`):

```typescript
import { useSyncExternalStore } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface AgentSession {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  messages: Message[];
  isStreaming: boolean;
  createdAt: number;
  updatedAt: number;
  config: AgentConfig;
}

export interface AgentConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

export interface AgentState {
  sessions: Map<string, AgentSession>;
  activeSessionId: string | null;
  availableProviders: ProviderInfo[];
  isInitialized: boolean;
}

const defaultConfig: AgentConfig = {
  temperature: 0.7,
  maxTokens: 4096,
};

const initialState: AgentState = {
  sessions: new Map(),
  activeSessionId: null,
  availableProviders: [],
  isInitialized: false,
};

let agentState: AgentState = initialState;
let cachedSnapshot: AgentState = { ...initialState };

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('Agent listener error:', error);
    }
  });
};

const setState = (updater: (prev: AgentState) => AgentState) => {
  agentState = updater(agentState);
  cachedSnapshot = agentState;
  notify();
  return agentState;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

export const useAgentState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const getAgentState = () => agentState;
```

### 5. Provider Manager Service

**Service** (`src/services/agent/providerManager.ts`):

```typescript
import { AIProvider } from './providers/base';
import { GroqProvider } from './providers/groq';

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, AIProvider> = new Map();

  private constructor() {
    // Register built-in providers
    this.registerProvider(new GroqProvider());
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId: string): AIProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  async validateProvider(providerId: string, apiKey: string): Promise<boolean> {
    const provider = this.getProvider(providerId);
    if (!provider) return false;

    return await provider.validateApiKey(apiKey);
  }
}
```

### 6. Agent Service Layer

**Service** (`src/services/agent/agentService.ts`):

```typescript
import { ProviderManager } from './providerManager';
import { CredentialService } from './credentialService';
import type { Message, AgentConfig } from '@/stores/agentStore';

export interface SendMessageOptions {
  sessionId: string;
  message: string;
  onToken?: (token: string) => void;
  onComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export class AgentService {
  private static instance: AgentService;
  private providerManager: ProviderManager;
  private credentialService: CredentialService;

  private constructor() {
    this.providerManager = ProviderManager.getInstance();
    this.credentialService = CredentialService.getInstance();
  }

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  async sendMessage(options: SendMessageOptions): Promise<void> {
    const { sessionId, message, onToken, onComplete, onError } = options;

    try {
      // Get session from store
      const session = agentActions.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      // Get provider
      const provider = this.providerManager.getProvider(session.providerId);
      if (!provider) throw new Error('Provider not found');

      // Get API key
      const apiKey = await this.credentialService.getCredential(session.providerId);

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      agentActions.addMessage(sessionId, userMessage);

      // Create assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      let assistantContent = '';

      agentActions.setStreaming(sessionId, true);

      // Stream response
      const stream = await provider.streamText({
        model: session.modelId,
        messages: session.messages.map(m => ({ role: m.role, content: m.content })),
        config: session.config,
        apiKey,
      });

      for await (const event of stream) {
        if (event.type === 'text-delta') {
          assistantContent += event.text;
          onToken?.(event.text);

          // Update message in store
          agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);
        }
      }

      // Finalize message
      const finalMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
      };

      agentActions.setStreaming(sessionId, false);
      onComplete?.(finalMessage);

    } catch (error) {
      agentActions.setStreaming(sessionId, false);
      onError?.(error as Error);
    }
  }
}
```

---

## Security Architecture

### API Key Storage Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ Enters API Key
       ▼
┌─────────────────┐
│  UI Component   │
└──────┬──────────┘
       │ invoke('agent_store_credential')
       ▼
┌──────────────────┐
│  Tauri Command   │
└──────┬───────────┘
       │
       ▼
┌──────────────────────────┐
│  OS Keychain (Secure)    │
│  - Windows: Credential   │
│    Manager               │
│  - macOS: Keychain       │
│  - Linux: Secret Service │
└──────────────────────────┘
```

### Security Features

1. **No Plain Text Storage**: API keys never stored in files or databases
2. **OS-Level Encryption**: Leverages platform-specific secure storage
3. **Memory Safety**: Keys cleared from memory after use
4. **Transport Security**: All API calls use HTTPS
5. **Validation**: Keys validated before storage

### Dependency: `keyring` Crate

Add to `src-tauri/Cargo.toml`:

```toml
keyring = "3.8.0"
```

Platform support:

- **Windows**: Credential Manager API
- **macOS**: Keychain Services
- **Linux**: Secret Service API (via D-Bus)

---

## Provider System

### Initial Provider: Groq

**Implementation** (`src/services/agent/providers/groq.ts`):

```typescript
import { createGroq } from '@ai-sdk/groq';
import { streamText, generateText } from 'ai';
import type { AIProvider, AIModel } from './base';

export class GroqProvider implements AIProvider {
  id = 'groq';
  name = 'Groq';
  description = 'Ultra-fast AI inference with Llama models';
  requiresApiKey = true;

  private models: AIModel[] = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      contextWindow: 131072,
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      contextWindow: 131072,
      maxOutputTokens: 8000,
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B IT',
      contextWindow: 8192,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: false,
    },
  ];

  async listModels(): Promise<AIModel[]> {
    return this.models;
  }

  getModel(modelId: string): AIModel | undefined {
    return this.models.find(m => m.id === modelId);
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const groq = createGroq({ apiKey });
      const { text } = await generateText({
        model: groq('llama-3.1-8b-instant'),
        prompt: 'Hello',
        maxTokens: 10,
      });
      return text.length > 0;
    } catch {
      return false;
    }
  }

  async *streamText(params: StreamTextParams): AsyncIterable<TextStreamEvent> {
    const groq = createGroq({ apiKey: params.apiKey });

    const result = streamText({
      model: groq(params.model),
      messages: params.messages,
      temperature: params.config.temperature,
      maxTokens: params.config.maxTokens,
      topP: params.config.topP,
    });

    for await (const delta of result.fullStream) {
      if (delta.type === 'text-delta') {
        yield { type: 'text-delta', text: delta.textDelta };
      } else if (delta.type === 'finish') {
        yield { type: 'finish', usage: delta.usage };
      }
    }
  }

  getDefaultConfig(): ProviderConfig {
    return {
      defaultModel: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      maxTokens: 4096,
    };
  }
}
```

---

## State Management

### Agent Actions

```typescript
export const agentActions = {
  // Session management
  async createSession(config: CreateSessionConfig): Promise<string> {
    const sessionId = crypto.randomUUID();
    const session: AgentSession = {
      id: sessionId,
      name: config.name || 'New Chat',
      providerId: config.providerId,
      modelId: config.modelId,
      messages: [],
      isStreaming: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: config.agentConfig || defaultConfig,
    };

    setState(prev => ({
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, session),
      activeSessionId: sessionId,
    }));

    await saveToStore('rainy-agent-sessions', Array.from(agentState.sessions.entries()));
    return sessionId;
  },

  deleteSession(sessionId: string): void {
    setState(prev => {
      const sessions = new Map(prev.sessions);
      sessions.delete(sessionId);

      const activeSessionId =
        prev.activeSessionId === sessionId
          ? sessions.keys().next().value || null
          : prev.activeSessionId;

      return { ...prev, sessions, activeSessionId };
    });

    saveToStore('rainy-agent-sessions', Array.from(agentState.sessions.entries()));
  },

  setActiveSession(sessionId: string): void {
    setState(prev => ({ ...prev, activeSessionId: sessionId }));
  },

  // Message management
  addMessage(sessionId: string, message: Message): void {
    setState(prev => {
      const session = prev.sessions.get(sessionId);
      if (!session) return prev;

      const updated: AgentSession = {
        ...session,
        messages: [...session.messages, message],
        updatedAt: Date.now(),
      };

      return {
        ...prev,
        sessions: new Map(prev.sessions).set(sessionId, updated),
      };
    });
  },

  updateMessageContent(sessionId: string, messageId: string, content: string): void {
    setState(prev => {
      const session = prev.sessions.get(sessionId);
      if (!session) return prev;

      const messages = session.messages.map(msg =>
        msg.id === messageId ? { ...msg, content } : msg
      );

      const updated: AgentSession = { ...session, messages, updatedAt: Date.now() };

      return {
        ...prev,
        sessions: new Map(prev.sessions).set(sessionId, updated),
      };
    });
  },

  setStreaming(sessionId: string, isStreaming: boolean): void {
    setState(prev => {
      const session = prev.sessions.get(sessionId);
      if (!session) return prev;

      const updated: AgentSession = { ...session, isStreaming };

      return {
        ...prev,
        sessions: new Map(prev.sessions).set(sessionId, updated),
      };
    });
  },

  // Configuration
  updateConfig(sessionId: string, config: Partial<AgentConfig>): void {
    setState(prev => {
      const session = prev.sessions.get(sessionId);
      if (!session) return prev;

      const updated: AgentSession = {
        ...session,
        config: { ...session.config, ...config },
        updatedAt: Date.now(),
      };

      return {
        ...prev,
        sessions: new Map(prev.sessions).set(sessionId, updated),
      };
    });
  },

  // Initialization
  async initialize(): Promise<void> {
    const savedSessions = await loadFromStore<[string, AgentSession][]>('rainy-agent-sessions', []);

    setState(prev => ({
      ...prev,
      sessions: new Map(savedSessions),
      activeSessionId: savedSessions[0]?.[0] || null,
      isInitialized: true,
    }));
  },
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

- [x] Design architecture
- [ ] Implement credential manager (Rust)
- [ ] Add Tauri commands for credentials
- [ ] Create credential service (Frontend)
- [ ] Add `keyring` dependency

### Phase 2: Provider System (Week 1-2)

- [ ] Implement base provider interface
- [ ] Create Groq provider
- [ ] Implement provider manager
- [ ] Add provider validation

### Phase 3: State & Services (Week 2)

- [ ] Implement agent store
- [ ] Create agent service
- [ ] Add message management
- [ ] Implement streaming support

### Phase 4: UI Components (Week 2-3)

- [ ] Provider setup dialog
- [ ] Chat panel component
- [ ] Message list component
- [ ] Input component with streaming
- [ ] Configuration panel

### Phase 5: Integration (Week 3)

- [ ] Integrate with IDE layout
- [ ] Add keyboard shortcuts
- [ ] Implement session persistence
- [ ] Add error handling and retry logic

### Phase 6: Polish (Week 3-4)

- [ ] Add usage tracking
- [ ] Implement cost estimates
- [ ] Add conversation export
- [ ] Performance optimization
- [ ] Documentation and examples

---

## File Structure

```table
src/
├── services/
│   └── agent/
│       ├── providers/
│       │   ├── base.ts              # Provider interface
│       │   ├── groq.ts              # Groq implementation
│       │   └── index.ts             # Provider exports
│       ├── agentService.ts          # Main agent orchestration
│       ├── providerManager.ts       # Provider registry
│       └── credentialService.ts     # Credential CRUD
├── stores/
│   └── agentStore.ts                # Agent state management
├── components/
│   └── agent/
│       ├── ChatPanel.tsx            # Main chat interface
│       ├── MessageList.tsx          # Message display
│       ├── MessageInput.tsx         # Input with streaming
│       ├── ProviderSetupDialog.tsx  # API key setup
│       └── AgentConfigPanel.tsx     # Model/config settings

src-tauri/src/
├── credential_manager.rs            # Keychain integration
└── lib.rs                           # Tauri command registration
```

---

## Dependencies

### Frontend (`package.json`)

Already installed:

- `@ai-sdk/groq`: ^2.0.28
- `@ai-sdk/openai`: ^2.0.62
- `@ai-sdk/cerebras`: ^1.0.28
- `@ai-sdk/google`: ^2.0.27
- `ai`: ^5.0.87
- `zod`: ^4.1.12

### Backend (`Cargo.toml`)

To add:

```toml
keyring = "3.8.0"
reqwest = { version = "0.12", features = ["json", "stream"] }
```

---

## Next Steps

1. **Implement Credential Manager** (Rust backend)
2. **Create Base Provider Interface** (TypeScript)
3. **Implement Groq Provider** (First provider)
4. **Build Agent Store** (State management)
5. **Create UI Components** (Chat interface)

This design ensures:

- **Modularity**: Easy to add new providers
- **Security**: OS-level credential storage
- **Performance**: Streaming-first architecture
- **Extensibility**: Clear interfaces for future features
- **Type Safety**: Full TypeScript coverage
