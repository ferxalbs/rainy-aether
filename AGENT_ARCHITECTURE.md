# Agent System Architecture

> **Complete Backend Implementation for Rainy Aether's AI Agent System**

## 📋 Overview

This document describes the complete, production-ready agent system architecture implemented for Rainy Aether. The system supports multiple AI providers (Gemini, Groq), real-time streaming responses, tool calling/function execution, and session management.

---

## 🏗️ Architecture Layers

### Layer 1: State Management (`agentStore.ts`)

**Purpose:** Centralized session and conversation state management

**Key Features:**
- Multiple agent sessions
- Session CRUD operations
- Message history tracking
- Active session management
- React integration via `useSyncExternalStore`

**API:**
```typescript
// Actions
agentActions.createSession(name, model?, systemPrompt?)
agentActions.deleteSession(sessionId)
agentActions.setActiveSession(sessionId)
agentActions.addMessage(sessionId, message)
agentActions.updateMessage(sessionId, messageId, updates)
agentActions.clearSession(sessionId)
agentActions.updateSessionModel(sessionId, model)
agentActions.updateSessionName(sessionId, name)
agentActions.setLoading(isLoading)

// Hooks
useAgentStore()              // Full state
useActiveSession()           // Current active session
useSessions()                // All sessions
useAgentLoading()            // Loading state
```

**Data Structure:**
```typescript
interface AgentSession {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}
```

---

### Layer 2: AI Provider Integration (`providers/`)

**Purpose:** Abstraction layer for multiple AI providers

#### Base Interface (`base.ts`)
```typescript
interface AIProvider {
  sendMessage(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatMessage>;
  streamMessage(messages: ChatMessage[], tools: ToolDefinition[], onChunk: (chunk: StreamChunk) => void): Promise<ChatMessage>;
}
```

#### Gemini Provider (`gemini.ts`)
- Uses `@google/genai` SDK
- Supports function calling
- Streaming responses
- System instructions

#### Groq Provider (`groq.ts`)
- Uses `groq-sdk`
- Supports function calling
- Streaming responses
- Fast inference (Llama, Mixtral models)

#### Provider Factory (`index.ts`)
```typescript
const provider = createProvider(
  modelId,
  {
    geminiApiKey: '...',
    groqApiKey: '...',
  },
  temperature,
  maxTokens
);
```

**Available Models:**
```typescript
// Gemini
- gemini-2.0-flash-exp
- gemini-1.5-pro
- gemini-1.5-flash

// Groq
- llama-3.3-70b-versatile
- llama-3.1-8b-instant
- mixtral-8x7b-32768
```

---

### Layer 3: Tool Registry (`ToolRegistry.ts`)

**Purpose:** Manages and executes AI agent tools/functions

**Built-in Tools:**

**File Operations:**
- `read_file(path)` - Read file content
- `apply_edit(path, content)` - Save/modify files
- `list_dir(path)` - List directory contents
- `create_file(path, content?)` - Create new files

**Git Operations:**
- `git_status()` - Get repository status
- `git_commit(message)` - Create commits

**Terminal:**
- `run_command(command)` - Execute shell commands

**Diagnostics:**
- `get_diagnostics(file?)` - Get errors/warnings

**Tool Definition:**
```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
}
```

**Error Handling:**
All tools return structured responses:
```typescript
{
  success: boolean;
  message?: string;  // Success message
  error?: string;    // Error details
  ...data            // Tool-specific data
}
```

---

### Layer 4: Agent Service (`AgentService.ts`)

**Purpose:** Orchestrates AI providers, tools, and credentials

**Key Responsibilities:**
1. Credential management (Tauri secure storage)
2. Provider initialization
3. Message handling
4. Tool execution coordination
5. Streaming support

**Usage:**
```typescript
const service = new AgentService({
  sessionId: 'session-123',
  model: 'gemini-2.0-flash-exp',
  systemPrompt: 'You are a helpful coding assistant...',
  temperature: 0.7,
  maxTokens: 2048,
});

// Non-streaming
const response = await service.sendMessage(messages);

// With streaming
const response = await service.sendMessage(messages, (chunk) => {
  if (chunk.type === 'text') {
    console.log(chunk.content);
  } else if (chunk.type === 'tool_call') {
    console.log('Tool:', chunk.toolCall);
  }
});
```

---

### Layer 5: React Integration

#### Hook: `useAgentChat.ts`

**Purpose:** Connect UI to agent system

**Features:**
- Auto-sync with active session
- Message sending
- Streaming visualization
- Error handling

**API:**
```typescript
const {
  messages,           // Current session messages
  input,              // Input text
  setInput,           // Update input
  isLoading,          // Loading state
  streamingContent,   // Real-time streaming text
  sendMessage,        // Send user message
  clearChat,          // Clear session history
} = useAgentChat();
```

#### Component: `AgentChatWindow.tsx`

**Features:**
- Message rendering (user/assistant)
- Tool call visualization with status
- Streaming text with cursor animation
- Model selector (integrated with store)
- Auto-scroll
- Keyboard shortcuts (Enter to send)

#### Component: `AgentsSidebar.tsx`

**Features:**
- Session list with search
- Create new sessions
- Rename sessions
- Delete sessions
- Context menu
- Active session highlighting

#### Component: `AgentsLayout.tsx`

**Features:**
- Resizable layout
- Auto-create first session
- Sidebar + chat view

---

## 🔄 Message Flow

### 1. User Sends Message

```
User types message → Enter key
  ↓
useAgentChat.sendMessage()
  ↓
Add user message to store (optimistic UI)
  ↓
AgentService.sendMessage(messages, onChunk)
```

### 2. AI Provider Processing

```
AgentService
  ↓
Load credentials from Tauri
  ↓
Initialize provider (Gemini/Groq)
  ↓
Convert messages to provider format
  ↓
Convert tools to provider format
  ↓
Send request (streaming)
```

### 3. Streaming Response

```
Provider streams chunks
  ↓
onChunk callback fired
  ↓
Update UI with streaming text
  ↓
Detect tool calls
  ↓
Execute tools via ToolRegistry
  ↓
Update tool status in UI
  ↓
Add final message to store
```

---

## 🔐 Credential Management

**Storage:** Tauri secure credential storage

**API:**
```typescript
// Save
await saveCredential('gemini_api_key', 'your-key-here');
await saveCredential('groq_api_key', 'your-key-here');

// Load (automatic in AgentService)
const key = await loadCredential('gemini_api_key');

// Delete
await deleteCredential('gemini_api_key');
```

**Tauri Commands:**
- `agent_store_credential(key, value)`
- `agent_get_credential(key)`
- `agent_delete_credential(key)`

---

## 📝 Usage Examples

### Basic Chat

```typescript
// Component
function MyChat() {
  const { messages, input, setInput, sendMessage, isLoading } = useAgentChat();

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
      />
      {isLoading && <div>Loading...</div>}
    </div>
  );
}
```

### Creating a Session

```typescript
import { agentActions } from '@/stores/agentStore';

// Create session
const sessionId = agentActions.createSession(
  'My Coding Assistant',
  'gemini-2.0-flash-exp',
  'You are an expert TypeScript developer...'
);

// Set as active
agentActions.setActiveSession(sessionId);
```

### Switching Models

```typescript
import { agentActions, useActiveSession } from '@/stores/agentStore';
import { AVAILABLE_MODELS } from '@/services/agent/providers';

function ModelSelector() {
  const session = useActiveSession();

  const handleChange = (modelId: string) => {
    if (session) {
      agentActions.updateSessionModel(session.id, modelId);
    }
  };

  return (
    <select value={session?.model} onChange={e => handleChange(e.target.value)}>
      {AVAILABLE_MODELS.map(model => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
```

### Custom Tool

```typescript
import { toolRegistry } from '@/services/agent/ToolRegistry';

toolRegistry.registerTool({
  name: 'search_docs',
  description: 'Search project documentation',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
  execute: async ({ query }) => {
    try {
      const results = await searchDocs(query);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});
```

---

## 🚀 Getting Started

### 1. Set API Keys

```typescript
import { saveCredential } from '@/services/agent/AgentService';

// Save credentials (run once)
await saveCredential('gemini_api_key', 'AIza...');
await saveCredential('groq_api_key', 'gsk_...');
```

### 2. Open Agents View

Navigate to the Agents section in the IDE.

### 3. Start Chatting

Type your message and press Enter. The agent will:
1. Process your request
2. Execute any necessary tools
3. Return a response

---

## 🎨 UI Components

### Message Types

**User Message:**
```tsx
<div className="bg-primary text-primary-foreground rounded-lg p-3">
  {message.content}
</div>
```

**Assistant Message:**
```tsx
<div className="bg-muted/50 border rounded-lg p-3">
  {message.content}
</div>
```

**Tool Call:**
```tsx
<div className="bg-card border rounded-md p-3">
  <div>Tool: {toolCall.name}</div>
  <div>Arguments: {JSON.stringify(toolCall.arguments)}</div>
  {toolCall.status === 'success' && <div>✓ Completed</div>}
  {toolCall.status === 'error' && <div>✗ Error: {toolCall.error}</div>}
  {toolCall.result && <div>Result: {JSON.stringify(toolCall.result)}</div>}
</div>
```

---

## 🔧 Configuration

### Model Settings

Edit in `providers/index.ts`:
```typescript
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'custom-model',
    name: 'Custom Model',
    provider: 'gemini',
    model: 'model-name',
    description: 'Description',
  },
];
```

### System Prompts

```typescript
const DEFAULT_SYSTEM_PROMPT = `
You are a helpful coding assistant integrated into a Tauri-based IDE.

Capabilities:
- Read and modify files
- Execute terminal commands
- Check git status
- View diagnostics

Guidelines:
- Be concise and accurate
- Use tools when necessary
- Explain your actions
`;
```

---

## 🐛 Debugging

### Enable Logging

```typescript
// In AgentService.ts
console.log('Sending message:', messages);
console.log('Provider response:', response);
console.log('Tool execution:', toolCall.name, toolCall.result);
```

### Check Credentials

```typescript
import { loadCredential } from '@/services/agent/AgentService';

const geminiKey = await loadCredential('gemini_api_key');
console.log('Gemini key exists:', !!geminiKey);
```

### Monitor Tool Execution

```typescript
// In ToolRegistry.ts
console.log(`Executing tool: ${name}`, args);
console.log(`Tool result:`, result);
```

---

## 📚 File Structure

```
src/
├── stores/
│   └── agentStore.ts                 # State management
├── services/agent/
│   ├── AgentService.ts               # Main service
│   ├── ToolRegistry.ts               # Tool definitions
│   └── providers/
│       ├── base.ts                   # Provider interface
│       ├── gemini.ts                 # Gemini provider
│       ├── groq.ts                   # Groq provider
│       └── index.ts                  # Provider factory
├── hooks/
│   └── useAgentChat.ts               # React hook
├── components/agents/
│   ├── AgentsLayout.tsx              # Main layout
│   ├── AgentsSidebar.tsx             # Session management
│   └── AgentChatWindow.tsx           # Chat interface
└── types/
    └── chat.ts                       # Type definitions
```

---

## ✅ Testing

### Manual Test Flow

1. **Create Session**: Click "New Agent"
2. **Send Message**: Type "list the files in src/"
3. **Verify Tool Call**: Should call `list_dir` tool
4. **Check Response**: Agent should return file list
5. **Test Streaming**: Long responses should stream in real-time
6. **Switch Models**: Change model in selector
7. **Delete Session**: Right-click → Delete

---

## 🔮 Future Enhancements

- [ ] Conversation persistence (save/load)
- [ ] Export conversations
- [ ] Voice input/output
- [ ] Multi-agent collaboration
- [ ] Custom tool UI
- [ ] Agent templates
- [ ] Performance metrics
- [ ] Context window management
- [ ] File attachments
- [ ] Code diffs in responses

---

## 📄 License

Part of Rainy Aether - Open Source AI-Native Code Editor

---

**Built with ❤️ by the Rainy Aether Team**
