# 🚀 RAINY AGENTS - MULTI-AGENT SYSTEM IMPLEMENTATION PLAN

**Version**: 1.0
**Date**: November 14, 2025
**Status**: Planning Complete - Ready for Implementation
**Estimated Duration**: 23-32 days

---

## 📋 EXECUTIVE SUMMARY

This document outlines the comprehensive implementation plan for a powerful, production-grade multi-agent system for Rainy Code IDE. The system features a dual-core architecture combining Rust's performance with TypeScript's flexibility, leveraging LangGraph 2025's latest features for sophisticated agent orchestration.

### Key Objectives

- ✅ **Dual-Core Architecture**: Rust core for performance + TypeScript for orchestration
- ✅ **Three Specialized Agents**: Rainy Agents, Claude Code, and Abby Mode
- ✅ **Modern LangGraph Integration**: ReAct patterns, multi-agent workflows, streaming
- ✅ **Multi-Provider Support**: Google Gemini & Groq with extensibility
- ✅ **Production-Ready**: Performance optimized, fully tested, well documented

### Success Metrics

| Metric | Target |
|--------|--------|
| Inference Latency (Rust) | < 200ms |
| Inference Latency (LangGraph) | < 500ms |
| Tool Execution (Filesystem) | < 100ms |
| Tool Execution (Terminal) | < 1s |
| Memory per Session | < 200MB |
| Streaming Rate | > 30 tokens/sec |
| Test Coverage | > 80% |
| Type Safety | 100% (no `any`) |

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    RAINY AGENTS CORE                    │
│                  (Multi-Agent System)                   │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌─────▼──────┐     ┌─────▼──────┐
   │ Rainy   │        │   Claude   │     │    Abby    │
   │ Agents  │        │    Code    │     │    Mode    │
   └────┬────┘        └─────┬──────┘     └─────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
   ┌────▼──────────┐              ┌────────────▼─────┐
   │  Rust Core    │◄────────────►│ TypeScript Layer │
   │  (Engine)     │              │  (Orchestration) │
   └───────────────┘              └──────────────────┘
        │                                    │
        ├─ Model Inference                  ├─ LangGraph Integration
        ├─ Tool Execution                   ├─ Session Management
        ├─ Memory Management                ├─ UI State Sync
        ├─ Rate Limiting                    ├─ Streaming Handlers
        └─ Performance Metrics              └─ Agent Routing
                    │
        ┌───────────┴────────────┐
        │                        │
   ┌────▼──────┐         ┌───────▼────────┐
   │  Google   │         │     Groq       │
   │  Gemini   │         │  (Llama 3.3)   │
   └───────────┘         └────────────────┘
```

### Component Layers

#### Layer 1: Rust Core (`src-tauri/src/agents/`)

**Purpose**: Performance-critical operations, native tool execution

- Model inference engine
- Tool execution with sandboxing
- Memory and state management
- Rate limiting and metrics
- Provider integrations (Google, Groq)

#### Layer 2: TypeScript Orchestration (`src/services/agents/`)

**Purpose**: LangGraph integration, UI coordination

- LangGraph agent creation and management
- Stream handling and coordination
- Agent routing and load balancing
- UI state synchronization
- Session persistence

#### Layer 3: Agent Implementations

**Purpose**: Specialized agent behaviors

- **Rainy Agents**: General-purpose coding assistant
- **Claude Code**: Code analysis and refactoring
- **Abby Mode**: Autonomous development assistant

#### Layer 4: UI Layer (`src/components/agents/`)

**Purpose**: User interface and interaction

- Agent selection interface
- Chat interface with streaming
- Tool execution visualization
- Configuration panels
- Metrics dashboard

---

## 📂 DIRECTORY STRUCTURE

### Rust Backend

```
src-tauri/src/agents/
├── mod.rs                    # Module exports and initialization
├── core.rs                   # Core agent traits and types
├── executor.rs               # Tool execution engine
├── inference.rs              # Model inference handler
├── memory.rs                 # Memory and context management
├── metrics.rs                # Performance tracking and telemetry
├── rate_limiter.rs           # Request rate limiting
├── providers/
│   ├── mod.rs
│   ├── base.rs              # Provider trait definition
│   ├── google.rs            # Google Gemini integration
│   └── groq.rs              # Groq (Llama 3.3) integration
└── tools/
    ├── mod.rs
    ├── registry.rs          # Tool registry and discovery
    ├── filesystem.rs        # File operations (read, write, edit, search)
    ├── terminal.rs          # Terminal command execution
    ├── git.rs               # Git operations
    └── workspace.rs         # Workspace analysis and navigation
```

### TypeScript Frontend

```
src/services/agents/
├── index.ts                  # Public API exports
├── core/
│   ├── AgentCore.ts          # Base agent abstract class
│   ├── AgentRouter.ts        # Agent selection and routing
│   └── AgentRegistry.ts      # Agent instance management
├── rainy/
│   ├── RainyAgent.ts         # Rainy Agents implementation
│   ├── config.ts             # Rainy-specific configuration
│   └── tools.ts              # Rainy-specific tool definitions
├── claude/
│   ├── ClaudeAgent.ts        # Claude Code implementation
│   ├── config.ts             # Claude-specific configuration
│   └── tools.ts              # Code analysis tools
├── abby/
│   ├── AbbyAgent.ts          # Abby Mode implementation
│   ├── config.ts             # Abby-specific configuration
│   └── tools.ts              # Autonomous tools
└── orchestration/
    ├── LangGraphBridge.ts    # Rust ↔ LangGraph bridge
    ├── StreamHandler.ts      # Streaming coordination
    └── StateSync.ts          # State synchronization
```

### UI Components

```
src/components/agents/
├── AgentSelector.tsx         # Agent mode picker
├── AgentChatView.tsx         # Main chat interface (enhanced)
├── AgentSettings.tsx         # Configuration panel
├── ToolExecutionView.tsx     # Tool execution visualization
├── ThinkingIndicator.tsx     # LangGraph reasoning display
└── MetricsDashboard.tsx      # Performance metrics
```

---

## 📅 IMPLEMENTATION PHASES

### ✅ PHASE 1: RESEARCH & ARCHITECTURE DESIGN

**Duration**: 2-3 days | **Status**: ✅ COMPLETED

#### Objectives

- [x] Research LangGraph 2025 latest features
- [x] Design dual-core architecture
- [x] Define agent types and responsibilities
- [x] Create comprehensive implementation plan
- [x] Document directory structure and interfaces

#### Key Findings

**LangGraph 2025 Features:**

- Pre-built agents (`createReactAgent`, Supervisor, Swarm)
- Graph-based orchestration with state machines
- Built-in memory with checkpointers (MemorySaver, PostgreSQL)
- Token-by-token streaming + intermediate steps
- Multi-agent patterns (Supervisor, Hierarchical Teams, Sequential)
- Human-in-the-loop with state interruption
- Parallel tool execution (with some streaming limitations)

**Technology Stack:**

- Already installed: `@langchain/langgraph`, `@langchain/google-genai`, `@langchain/groq`
- Rust needed: `tokio`, `reqwest`, `dashmap`, `parking_lot`, `tracing`

---

### 🔧 PHASE 2: RUST CORE IMPLEMENTATION

**Duration**: 5-7 days | **Status**: ⏳ PENDING | **Priority**: CRITICAL

#### 2.1 Core Agent Engine (`core.rs`)

**Objectives:**

- Define core agent traits and interfaces
- Implement message passing system
- Create agent lifecycle management
- Set up error handling

**Key Components:**

```rust
// Core trait that all agents implement
pub trait Agent: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    async fn execute(&self, input: AgentInput) -> Result<AgentResult, AgentError>;
    fn capabilities(&self) -> Vec<Capability>;
}

// Agent input structure
pub struct AgentInput {
    pub session_id: String,
    pub message: String,
    pub context: HashMap<String, Value>,
    pub tools_enabled: bool,
    pub max_iterations: u32,
}

// Agent output structure
pub struct AgentResult {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
    pub metadata: AgentMetadata,
}

// Agent metadata
pub struct AgentMetadata {
    pub tokens_used: u32,
    pub execution_time_ms: u64,
    pub tools_executed: Vec<String>,
    pub cost_usd: f64,
}

// Tool call representation
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: Value,
    pub result: Option<ToolResult>,
}

// Capabilities enum
pub enum Capability {
    CodeGeneration,
    CodeEditing,
    FileOperations,
    GitOperations,
    TerminalExecution,
    WorkspaceAnalysis,
    CodeAnalysis,
    Refactoring,
    Testing,
    Documentation,
    AutonomousCoding,
    ProactiveSuggestions,
}
```

**Tauri Commands:**

```rust
#[tauri::command]
async fn agent_create_session(
    agent_type: String,
    config: AgentConfig,
    state: State<'_, AgentState>
) -> Result<String, String>

#[tauri::command]
async fn agent_send_message(
    session_id: String,
    message: String,
    enable_tools: bool,
    state: State<'_, AgentState>
) -> Result<AgentResult, String>

#[tauri::command]
async fn agent_stream_message(
    session_id: String,
    message: String,
    enable_tools: bool,
    window: Window,
    state: State<'_, AgentState>
) -> Result<(), String>

#[tauri::command]
async fn agent_list_tools(
    state: State<'_, AgentState>
) -> Result<Vec<ToolDefinition>, String>

#[tauri::command]
async fn agent_get_session_metrics(
    session_id: String,
    state: State<'_, AgentState>
) -> Result<SessionMetrics, String>
```

**Checklist:**

- [ ] Create `src-tauri/src/agents/` directory
- [ ] Implement `core.rs` with traits and types
- [ ] Add Tauri commands to `lib.rs`
- [ ] Set up state management with `Arc<Mutex<>>`
- [ ] Implement error types and handling
- [ ] Add logging with `tracing` crate
- [ ] Write unit tests

---

#### 2.2 Model Inference Handler (`inference.rs`)

**Objectives:**

- Implement HTTP client for provider APIs
- Handle streaming responses
- Manage API keys and authentication
- Support both Google and Groq

**Key Features:**

```rust
pub struct InferenceEngine {
    client: reqwest::Client,
    rate_limiter: Arc<RateLimiter>,
}

impl InferenceEngine {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .unwrap(),
            rate_limiter: Arc::new(RateLimiter::new(100, Duration::from_secs(60))),
        }
    }

    pub async fn infer(
        &self,
        provider: Provider,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
    ) -> Result<InferenceResponse, InferenceError> {
        // Wait for rate limiter
        self.rate_limiter.acquire().await?;

        match provider {
            Provider::Google => self.infer_google(model, messages, tools, config).await,
            Provider::Groq => self.infer_groq(model, messages, tools, config).await,
        }
    }

    pub async fn stream_infer<F>(
        &self,
        provider: Provider,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
        callback: F,
    ) -> Result<(), InferenceError>
    where
        F: Fn(StreamChunk) + Send + 'static,
    {
        match provider {
            Provider::Google => self.stream_google(model, messages, tools, config, callback).await,
            Provider::Groq => self.stream_groq(model, messages, tools, config, callback).await,
        }
    }
}

pub struct InferenceConfig {
    pub temperature: f32,
    pub max_tokens: u32,
    pub top_p: f32,
    pub stop_sequences: Vec<String>,
}

pub struct InferenceResponse {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
    pub finish_reason: FinishReason,
    pub usage: TokenUsage,
}

pub struct StreamChunk {
    pub delta: String,
    pub tool_call: Option<ToolCall>,
    pub is_final: bool,
}
```

**Checklist:**

- [ ] Implement `InferenceEngine` struct
- [ ] Add Google Gemini API integration
- [ ] Add Groq API integration
- [ ] Implement streaming with `reqwest::Response::bytes_stream()`
- [ ] Add token counting and cost estimation
- [ ] Handle API errors gracefully
- [ ] Add retry logic with exponential backoff
- [ ] Write integration tests (mock APIs)

---

#### 2.3 Tool Execution Engine (`executor.rs`)

**Objectives:**

- Safely execute tools with proper error handling
- Support parallel tool execution
- Implement tool result caching
- Rate limit tool executions

**Key Features:**

```rust
pub struct ToolExecutor {
    registry: Arc<ToolRegistry>,
    cache: Arc<DashMap<String, CachedToolResult>>,
    semaphore: Arc<Semaphore>, // Limit concurrent executions
}

impl ToolExecutor {
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            registry: Arc::new(ToolRegistry::new()),
            cache: Arc::new(DashMap::new()),
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
        }
    }

    pub async fn execute(
        &self,
        tool_name: &str,
        params: Value,
        cache_key: Option<String>,
    ) -> Result<ToolResult, ToolError> {
        // Check cache first
        if let Some(key) = &cache_key {
            if let Some(cached) = self.cache.get(key) {
                if !cached.is_expired() {
                    return Ok(cached.result.clone());
                }
            }
        }

        // Acquire semaphore
        let _permit = self.semaphore.acquire().await?;

        // Get tool from registry
        let tool = self.registry.get(tool_name)?;

        // Execute tool
        let start = Instant::now();
        let result = tool.execute(params).await?;
        let duration = start.elapsed();

        // Cache result if applicable
        if let Some(key) = cache_key {
            if tool.is_cacheable() {
                self.cache.insert(key, CachedToolResult {
                    result: result.clone(),
                    timestamp: SystemTime::now(),
                    ttl: tool.cache_ttl(),
                });
            }
        }

        // Record metrics
        self.registry.record_execution(tool_name, duration);

        Ok(result)
    }

    pub async fn execute_parallel(
        &self,
        tools: Vec<ToolCall>,
    ) -> Vec<Result<ToolResult, ToolError>> {
        let futures: Vec<_> = tools
            .into_iter()
            .map(|call| {
                let executor = self.clone();
                tokio::spawn(async move {
                    executor.execute(&call.name, call.arguments, None).await
                })
            })
            .collect();

        let results = futures::future::join_all(futures).await;
        results.into_iter().map(|r| r.unwrap()).collect()
    }
}

pub struct ToolResult {
    pub output: Value,
    pub success: bool,
    pub execution_time_ms: u64,
}

struct CachedToolResult {
    result: ToolResult,
    timestamp: SystemTime,
    ttl: Duration,
}

impl CachedToolResult {
    fn is_expired(&self) -> bool {
        self.timestamp.elapsed().unwrap() > self.ttl
    }
}
```

**Checklist:**

- [ ] Implement `ToolExecutor` struct
- [ ] Add parallel execution with `tokio::spawn`
- [ ] Implement caching with expiration
- [ ] Add semaphore for concurrency control
- [ ] Integrate with tool registry
- [ ] Add execution metrics
- [ ] Handle timeouts gracefully
- [ ] Write unit tests

---

#### 2.4 Memory Management (`memory.rs`)

**Objectives:**

- Efficient conversation history storage
- Context window management
- Message pruning for token limits
- Fast retrieval and search

**Key Features:**

```rust
pub struct MemoryManager {
    storage: Arc<DashMap<String, ConversationMemory>>,
    max_history_size: usize,
}

pub struct ConversationMemory {
    pub session_id: String,
    pub messages: VecDeque<Message>,
    pub total_tokens: usize,
    pub max_tokens: usize,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl MemoryManager {
    pub fn new(max_history_size: usize) -> Self {
        Self {
            storage: Arc::new(DashMap::new()),
            max_history_size,
        }
    }

    pub fn add_message(&self, session_id: &str, message: Message) {
        let mut memory = self.storage
            .entry(session_id.to_string())
            .or_insert_with(|| ConversationMemory::new(session_id, 100_000));

        memory.messages.push_back(message.clone());
        memory.total_tokens += message.token_count;
        memory.updated_at = SystemTime::now();

        // Prune if over limit
        if memory.total_tokens > memory.max_tokens {
            self.prune_messages(session_id);
        }
    }

    pub fn get_history(&self, session_id: &str, limit: Option<usize>) -> Vec<Message> {
        if let Some(memory) = self.storage.get(session_id) {
            let limit = limit.unwrap_or(self.max_history_size);
            memory.messages
                .iter()
                .rev()
                .take(limit)
                .rev()
                .cloned()
                .collect()
        } else {
            vec![]
        }
    }

    pub fn prune_messages(&self, session_id: &str) {
        if let Some(mut memory) = self.storage.get_mut(session_id) {
            // Keep system message if present
            let system_msg = memory.messages
                .iter()
                .find(|m| m.role == "system")
                .cloned();

            // Remove oldest messages until under limit
            while memory.total_tokens > memory.max_tokens && memory.messages.len() > 1 {
                if let Some(removed) = memory.messages.pop_front() {
                    memory.total_tokens -= removed.token_count;
                }
            }

            // Re-add system message if it was removed
            if let Some(sys_msg) = system_msg {
                if !memory.messages.iter().any(|m| m.role == "system") {
                    memory.messages.push_front(sys_msg);
                }
            }
        }
    }

    pub fn clear_session(&self, session_id: &str) {
        self.storage.remove(session_id);
    }

    pub fn get_stats(&self, session_id: &str) -> Option<MemoryStats> {
        self.storage.get(session_id).map(|memory| MemoryStats {
            message_count: memory.messages.len(),
            total_tokens: memory.total_tokens,
            max_tokens: memory.max_tokens,
            utilization: (memory.total_tokens as f64 / memory.max_tokens as f64) * 100.0,
        })
    }
}

pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    pub token_count: usize,
    pub timestamp: SystemTime,
}

pub struct MemoryStats {
    pub message_count: usize,
    pub total_tokens: usize,
    pub max_tokens: usize,
    pub utilization: f64,
}
```

**Checklist:**

- [ ] Implement `MemoryManager` struct
- [ ] Add message storage with `DashMap`
- [ ] Implement pruning algorithm
- [ ] Add token counting
- [ ] Handle system messages specially
- [ ] Add memory statistics
- [ ] Write unit tests
- [ ] Performance test with large histories

---

#### 2.5 Provider Implementations

##### Google Gemini (`providers/google.rs`)

```rust
pub struct GoogleProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl GoogleProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
            client: reqwest::Client::new(),
        }
    }

    async fn build_request(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
    ) -> Result<GoogleRequest, ProviderError> {
        // Convert messages to Gemini format
        let contents = self.messages_to_contents(messages);

        // Convert tools to Gemini format
        let function_declarations = tools.map(|t| self.tools_to_declarations(t));

        Ok(GoogleRequest {
            contents,
            tools: function_declarations,
            generation_config: GoogleGenerationConfig {
                temperature: config.temperature,
                max_output_tokens: config.max_tokens,
                top_p: config.top_p,
                stop_sequences: config.stop_sequences,
            },
        })
    }
}

impl Provider for GoogleProvider {
    async fn generate(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
    ) -> Result<InferenceResponse, ProviderError> {
        let request = self.build_request(model, messages, tools, config).await?;

        let url = format!(
            "{}/models/{}:generateContent?key={}",
            self.base_url, model, self.api_key
        );

        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?
            .json::<GoogleResponse>()
            .await?;

        self.parse_response(response)
    }

    async fn stream(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
        callback: impl Fn(StreamChunk) + Send + 'static,
    ) -> Result<(), ProviderError> {
        let request = self.build_request(model, messages, tools, config).await?;

        let url = format!(
            "{}/models/{}:streamGenerateContent?key={}",
            self.base_url, model, self.api_key
        );

        let mut stream = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?
            .bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            let parsed = self.parse_stream_chunk(&chunk)?;
            callback(parsed);
        }

        Ok(())
    }
}
```

**Checklist:**

- [ ] Implement Google provider
- [ ] Handle message format conversion
- [ ] Implement tool/function calling
- [ ] Add streaming support
- [ ] Handle errors and retries
- [ ] Add unit tests with mock HTTP

##### Groq (`providers/groq.rs`)

```rust
pub struct GroqProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl GroqProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://api.groq.com/openai/v1".to_string(),
            client: reqwest::Client::new(),
        }
    }
}

impl Provider for GroqProvider {
    async fn generate(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
    ) -> Result<InferenceResponse, ProviderError> {
        let request = GroqRequest {
            model: model.to_string(),
            messages: self.messages_to_openai_format(messages),
            tools: tools.map(|t| self.tools_to_openai_format(t)),
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            stop: Some(config.stop_sequences),
        };

        let response = self.client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?
            .json::<GroqResponse>()
            .await?;

        self.parse_response(response)
    }

    async fn stream(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        config: InferenceConfig,
        callback: impl Fn(StreamChunk) + Send + 'static,
    ) -> Result<(), ProviderError> {
        // Similar to Google but with SSE format
        let request = GroqRequest {
            model: model.to_string(),
            messages: self.messages_to_openai_format(messages),
            tools: tools.map(|t| self.tools_to_openai_format(t)),
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            stop: Some(config.stop_sequences),
            stream: Some(true),
        };

        let mut stream = self.client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?
            .bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            // Parse SSE format
            let parsed = self.parse_sse_chunk(&chunk)?;
            callback(parsed);
        }

        Ok(())
    }
}
```

**Checklist:**

- [ ] Implement Groq provider
- [ ] Use OpenAI-compatible format
- [ ] Handle SSE streaming
- [ ] Implement tool calling
- [ ] Add error handling
- [ ] Write unit tests

---

#### 2.6 Tool Implementations

**Filesystem Tools** (`tools/filesystem.rs`):

- [ ] `read_file` - Read file contents
- [ ] `write_file` - Write file contents
- [ ] `edit_file` - Edit file with line-based operations
- [ ] `search_files` - Search files by pattern
- [ ] `list_directory` - List directory contents
- [ ] `create_directory` - Create directory
- [ ] `delete_path` - Delete file or directory

**Terminal Tools** (`tools/terminal.rs`):

- [ ] `execute_command` - Execute shell command
- [ ] `execute_script` - Execute multi-line script

**Git Tools** (`tools/git.rs`):

- [ ] `git_status` - Get repository status
- [ ] `git_commit` - Create commit
- [ ] `git_diff` - Get file diff
- [ ] `git_log` - Get commit history
- [ ] `git_branch` - Branch operations

**Workspace Tools** (`tools/workspace.rs`):

- [ ] `workspace_structure` - Get project structure
- [ ] `search_symbol` - Find symbol definitions
- [ ] `find_references` - Find symbol references

---

#### Phase 2 Deliverables

- [ ] Complete Rust core implementation
- [ ] All Tauri commands registered
- [ ] Unit tests for all components (>80% coverage)
- [ ] Integration tests for providers
- [ ] Performance benchmarks
- [ ] Documentation comments (rustdoc)

---

### 📘 PHASE 3: TYPESCRIPT ORCHESTRATION LAYER

**Duration**: 4-5 days | **Status**: ⏳ PENDING | **Priority**: HIGH

#### 3.1 Agent Core (`core/AgentCore.ts`)

**Objectives:**

- Define TypeScript-side agent interface
- Bridge to Rust core via Tauri
- Integrate with LangGraph
- Provide common agent functionality

```typescript
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  defaultProvider: string;
  defaultModel: string;
  systemPrompt: string;
  capabilities: Capability[];
  enabledTools: string[];
  maxIterations?: number;
  toolTimeout?: number;
  parallelTools?: boolean;
}

export interface MessageOptions {
  enableTools?: boolean;
  fastMode?: boolean;
  maxIterations?: number;
  temperature?: number;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  metadata: {
    tokensUsed?: number;
    executionTimeMs?: number;
    toolsExecuted?: string[];
    cost?: number;
  };
}

export interface ToolUpdate {
  toolName: string;
  status: 'starting' | 'executing' | 'complete' | 'error';
  message?: string;
  progress?: number;
}

export abstract class AgentCore {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;

  protected langGraphAgent?: CompiledGraph;
  protected sessionId?: string;
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Initialize agent with LangGraph
   */
  abstract initialize(options?: InitializeOptions): Promise<void>;

  /**
   * Send message and get response
   */
  abstract sendMessage(
    message: string,
    options?: MessageOptions
  ): Promise<AgentResponse>;

  /**
   * Stream message with real-time updates
   */
  abstract streamMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void,
    options?: MessageOptions
  ): Promise<void>;

  /**
   * Get agent capabilities
   */
  getCapabilities(): Capability[] {
    return this.config.capabilities;
  }

  /**
   * Check if agent supports a capability
   */
  hasCapability(capability: Capability): boolean {
    return this.config.capabilities.includes(capability);
  }

  /**
   * Get enabled tools for this agent
   */
  getEnabledTools(): string[] {
    return this.config.enabledTools;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Cleanup implementation
  }
}
```

**Checklist:**

- [ ] Create `AgentCore` abstract class
- [ ] Define all interfaces and types
- [ ] Implement common methods
- [ ] Add error handling
- [ ] Write TypeScript docs
- [ ] Create unit tests

---

#### 3.2 LangGraph Bridge (`orchestration/LangGraphBridge.ts`)

**Objectives:**

- Bridge between Rust core and LangGraph
- Convert tool schemas between formats
- Handle streaming coordination
- Manage LangGraph agents

```typescript
export interface BridgeConfig {
  provider: string;
  modelId: string;
  apiKey: string;
  systemPrompt?: string;
  checkpointer?: BaseCheckpointSaver;
  tools?: string[]; // Tool names to load from Rust
}

export interface StreamConfig {
  thread_id: string;
  sessionId: string;
  workspaceRoot?: string;
  userId?: string;
}

export class LangGraphBridge {
  private rustTools: Map<string, Tool> = new Map();

  /**
   * Initialize bridge and load tools from Rust
   */
  async initialize(): Promise<void> {
    await this.loadRustTools();
  }

  /**
   * Create LangGraph ReAct agent with Rust-backed tools
   */
  async createAgent(config: BridgeConfig): Promise<CompiledGraph> {
    const model = this.createModel(config.provider, config.modelId, config.apiKey);
    const tools = await this.getToolsForAgent(config.tools);

    const agent = createReactAgent({
      llm: model,
      tools,
      checkpointSaver: config.checkpointer || new MemorySaver(),
      stateModifier: config.systemPrompt
        ? new SystemMessage(config.systemPrompt)
        : undefined,
    });

    return agent;
  }

  /**
   * Stream agent execution
   */
  async *stream(
    agent: CompiledGraph,
    input: string,
    config: StreamConfig
  ): AsyncGenerator<StreamChunk> {
    const stream = agent.stream(
      { messages: [new HumanMessage(input)] },
      {
        configurable: {
          thread_id: config.thread_id,
          sessionId: config.sessionId,
          workspaceRoot: config.workspaceRoot,
          userId: config.userId,
        },
        streamMode: 'values' as const,
      }
    );

    for await (const chunk of stream) {
      yield this.transformChunk(chunk);
    }
  }

  /**
   * Load tools from Rust registry
   */
  private async loadRustTools(): Promise<void> {
    const rustToolDefs = await invoke<RustToolDefinition[]>('agent_list_tools');

    for (const toolDef of rustToolDefs) {
      const langChainTool = this.convertToLangChainTool(toolDef);
      this.rustTools.set(toolDef.name, langChainTool);
    }

    console.log(`✅ Loaded ${this.rustTools.size} tools from Rust`);
  }

  /**
   * Convert Rust tool definition to LangChain tool
   */
  private convertToLangChainTool(rustTool: RustToolDefinition): Tool {
    return new DynamicTool({
      name: rustTool.name,
      description: rustTool.description,
      schema: this.convertSchema(rustTool.inputSchema),
      func: async (input: string) => {
        // Call Rust tool executor
        const result = await invoke<ToolResult>('agent_execute_tool', {
          toolName: rustTool.name,
          params: JSON.parse(input),
        });

        return JSON.stringify(result.output);
      },
    });
  }

  /**
   * Get tools for specific agent
   */
  private async getToolsForAgent(toolNames?: string[]): Promise<Tool[]> {
    if (!toolNames) {
      return Array.from(this.rustTools.values());
    }

    return toolNames
      .map(name => this.rustTools.get(name))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  /**
   * Create model based on provider
   */
  private createModel(
    provider: string,
    modelId: string,
    apiKey: string
  ): BaseChatModel {
    switch (provider) {
      case 'google':
        return new ChatGoogleGenerativeAI({
          modelName: modelId,
          apiKey,
        });
      case 'groq':
        return new ChatGroq({
          modelName: modelId,
          apiKey,
        });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Transform LangGraph chunk to our format
   */
  private transformChunk(chunk: any): StreamChunk {
    const messages = chunk.messages || [];
    const lastMessage = messages[messages.length - 1];

    return {
      content: lastMessage?.content || '',
      type: 'message',
      metadata: {
        step: chunk.step,
        node: chunk.node,
      },
    };
  }

  /**
   * Convert Rust schema to Zod schema
   */
  private convertSchema(rustSchema: any): z.ZodSchema {
    // Convert JSON Schema to Zod
    // This is a simplified version - real implementation would be more robust
    const zodSchema = zodToJsonSchema.zodSchema(rustSchema);
    return zodSchema;
  }
}

// Global singleton
export const langGraphBridge = new LangGraphBridge();
```

**Checklist:**

- [ ] Implement `LangGraphBridge` class
- [ ] Add tool loading from Rust
- [ ] Implement schema conversion
- [ ] Add model factory for providers
- [ ] Handle streaming properly
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Integration test with Rust

---

#### 3.3 Agent Router (`core/AgentRouter.ts`)

```typescript
export interface RouteRequest {
  message: string;
  agentId?: string;
  capabilities?: Capability[];
  options?: MessageOptions;
}

export interface RouteStrategy {
  type: 'explicit' | 'capability' | 'load-balance' | 'fallback';
  priority: number;
}

export class AgentRouter {
  private agents = new Map<string, AgentCore>();
  private activeRequests = new Map<string, number>();

  /**
   * Register an agent
   */
  register(agent: AgentCore): void {
    this.agents.set(agent.id, agent);
    this.activeRequests.set(agent.id, 0);
    console.log(`✅ Registered agent: ${agent.name}`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
    this.activeRequests.delete(agentId);
  }

  /**
   * Route message to appropriate agent
   */
  async route(request: RouteRequest): Promise<AgentResponse> {
    const agent = this.selectAgent(request);

    // Track active request
    this.incrementActiveRequests(agent.id);

    try {
      const response = await agent.sendMessage(request.message, request.options);
      return response;
    } finally {
      this.decrementActiveRequests(agent.id);
    }
  }

  /**
   * Stream message through selected agent
   */
  async streamRoute(
    request: RouteRequest,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void
  ): Promise<void> {
    const agent = this.selectAgent(request);

    this.incrementActiveRequests(agent.id);

    try {
      await agent.streamMessage(
        request.message,
        onChunk,
        onToolUpdate,
        request.options
      );
    } finally {
      this.decrementActiveRequests(agent.id);
    }
  }

  /**
   * Select agent based on routing strategy
   */
  private selectAgent(request: RouteRequest): AgentCore {
    // Strategy 1: Explicit agent ID
    if (request.agentId) {
      const agent = this.agents.get(request.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${request.agentId}`);
      }
      return agent;
    }

    // Strategy 2: Capability-based routing
    if (request.capabilities && request.capabilities.length > 0) {
      return this.selectByCapabilities(request.capabilities);
    }

    // Strategy 3: Load balancing
    return this.selectByLoadBalance();
  }

  /**
   * Select agent by capabilities
   */
  private selectByCapabilities(capabilities: Capability[]): AgentCore {
    const candidates: AgentCore[] = [];

    for (const agent of this.agents.values()) {
      const hasAll = capabilities.every(cap => agent.hasCapability(cap));
      if (hasAll) {
        candidates.push(agent);
      }
    }

    if (candidates.length === 0) {
      // Fallback to default agent
      return this.agents.get('rainy')!;
    }

    // Select least loaded candidate
    return candidates.reduce((prev, current) => {
      const prevLoad = this.activeRequests.get(prev.id) || 0;
      const currentLoad = this.activeRequests.get(current.id) || 0;
      return currentLoad < prevLoad ? current : prev;
    });
  }

  /**
   * Select agent by load balancing
   */
  private selectByLoadBalance(): AgentCore {
    let minLoad = Infinity;
    let selectedAgent: AgentCore | null = null;

    for (const agent of this.agents.values()) {
      const load = this.activeRequests.get(agent.id) || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedAgent = agent;
      }
    }

    return selectedAgent || this.agents.get('rainy')!;
  }

  private incrementActiveRequests(agentId: string): void {
    const current = this.activeRequests.get(agentId) || 0;
    this.activeRequests.set(agentId, current + 1);
  }

  private decrementActiveRequests(agentId: string): void {
    const current = this.activeRequests.get(agentId) || 0;
    this.activeRequests.set(agentId, Math.max(0, current - 1));
  }

  /**
   * Get routing statistics
   */
  getStats(): RouterStats {
    const stats: RouterStats = {
      totalAgents: this.agents.size,
      activeRequests: 0,
      agentLoads: {},
    };

    for (const [agentId, load] of this.activeRequests.entries()) {
      stats.activeRequests += load;
      stats.agentLoads[agentId] = load;
    }

    return stats;
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentCore[] {
    return Array.from(this.agents.values());
  }
}

export interface RouterStats {
  totalAgents: number;
  activeRequests: number;
  agentLoads: Record<string, number>;
}

// Global singleton
export const agentRouter = new AgentRouter();
```

**Checklist:**

- [ ] Implement `AgentRouter` class
- [ ] Add routing strategies
- [ ] Implement load balancing
- [ ] Add capability-based routing
- [ ] Track active requests
- [ ] Add statistics
- [ ] Write unit tests

---

#### 3.4 Stream Handler (`orchestration/StreamHandler.ts`)

```typescript
export interface StreamEvent {
  type: 'chunk' | 'tool' | 'error' | 'complete';
  content?: string;
  toolUpdate?: ToolUpdate;
  error?: string;
}

export class StreamHandler {
  private activeStreams = new Map<string, UnlistenFn>();

  /**
   * Handle streaming from Rust core
   */
  async handleRustStream(
    sessionId: string,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void,
    onError?: (error: string) => void
  ): Promise<() => void> {
    const unlisten = await listen<StreamEvent>(
      `agent-stream-${sessionId}`,
      (event) => {
        const payload = event.payload;

        switch (payload.type) {
          case 'chunk':
            if (payload.content) {
              onChunk(payload.content);
            }
            break;

          case 'tool':
            if (payload.toolUpdate && onToolUpdate) {
              onToolUpdate(payload.toolUpdate);
            }
            break;

          case 'error':
            if (payload.error && onError) {
              onError(payload.error);
            }
            break;

          case 'complete':
            this.cleanup(sessionId);
            break;
        }
      }
    );

    this.activeStreams.set(sessionId, unlisten);

    return () => this.cleanup(sessionId);
  }

  /**
   * Handle streaming from LangGraph
   */
  async handleLangGraphStream(
    agent: CompiledGraph,
    input: string,
    config: StreamConfig,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void
  ): Promise<void> {
    try {
      const stream = agent.stream(
        { messages: [new HumanMessage(input)] },
        {
          configurable: config,
          streamMode: 'values' as const,
        }
      );

      let previousContent = '';

      for await (const chunk of stream) {
        const messages = chunk.messages || [];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage?.content) {
          const content = lastMessage.content.toString();

          // Emit only the delta
          if (content.length > previousContent.length) {
            const delta = content.slice(previousContent.length);
            onChunk(delta);
            previousContent = content;
          }
        }

        // Handle tool calls
        if (lastMessage?.additional_kwargs?.tool_calls) {
          const toolCalls = lastMessage.additional_kwargs.tool_calls;
          for (const toolCall of toolCalls) {
            onToolUpdate?.({
              toolName: toolCall.function.name,
              status: 'executing',
              message: `Executing ${toolCall.function.name}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('LangGraph stream error:', error);
      throw error;
    }
  }

  /**
   * Cleanup stream listener
   */
  private cleanup(sessionId: string): void {
    const unlisten = this.activeStreams.get(sessionId);
    if (unlisten) {
      unlisten();
      this.activeStreams.delete(sessionId);
    }
  }

  /**
   * Cleanup all streams
   */
  async dispose(): Promise<void> {
    for (const unlisten of this.activeStreams.values()) {
      unlisten();
    }
    this.activeStreams.clear();
  }
}

// Global singleton
export const streamHandler = new StreamHandler();
```

**Checklist:**

- [ ] Implement `StreamHandler` class
- [ ] Add Rust stream handling
- [ ] Add LangGraph stream handling
- [ ] Implement delta calculation
- [ ] Handle tool updates
- [ ] Add error handling
- [ ] Cleanup on completion
- [ ] Write unit tests

---

#### 3.5 Agent Registry (`core/AgentRegistry.ts`)

```typescript
export class AgentRegistry {
  private agents = new Map<string, AgentCore>();
  private initialized = false;

  /**
   * Initialize all agents
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.warn('Agent registry already initialized');
      return;
    }

    try {
      // Initialize LangGraph bridge first
      await langGraphBridge.initialize();

      // Import agent implementations dynamically
      const { RainyAgent } = await import('../rainy/RainyAgent');
      const { ClaudeAgent } = await import('../claude/ClaudeAgent');
      const { AbbyAgent } = await import('../abby/AbbyAgent');

      // Initialize Rainy Agent
      const rainy = new RainyAgent();
      await rainy.initialize();
      this.register(rainy);

      // Initialize Claude Code
      const claude = new ClaudeAgent();
      await claude.initialize();
      this.register(claude);

      // Initialize Abby Mode
      const abby = new AbbyAgent();
      await abby.initialize();
      this.register(abby);

      // Register all agents with router
      for (const agent of this.agents.values()) {
        agentRouter.register(agent);
      }

      this.initialized = true;
      console.log('✅ All agents initialized');
    } catch (error) {
      console.error('Failed to initialize agents:', error);
      throw error;
    }
  }

  /**
   * Register an agent
   */
  register(agent: AgentCore): void {
    if (this.agents.has(agent.id)) {
      console.warn(`Agent ${agent.id} already registered. Overwriting.`);
    }

    this.agents.set(agent.id, agent);
    console.log(`✅ Registered agent: ${agent.name}`);
  }

  /**
   * Get agent by ID
   */
  get(id: string): AgentCore | undefined {
    return this.agents.get(id);
  }

  /**
   * Get agent or throw
   */
  getOrThrow(id: string): AgentCore {
    const agent = this.get(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }
    return agent;
  }

  /**
   * List all agents
   */
  listAll(): AgentCore[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent exists
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Cleanup all agents
   */
  async dispose(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.dispose();
    }
    this.agents.clear();
    this.initialized = false;
  }
}

// Global singleton
export const agentRegistry = new AgentRegistry();
```

**Checklist:**

- [ ] Implement `AgentRegistry` class
- [ ] Add initialization logic
- [ ] Handle agent registration
- [ ] Add error handling
- [ ] Implement cleanup
- [ ] Write unit tests

---

#### Phase 3 Deliverables

- [ ] Complete TypeScript orchestration layer
- [ ] All core classes implemented
- [ ] Integration with Rust core
- [ ] LangGraph bridge working
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] Documentation

---

### 🌧️ PHASE 4: RAINY AGENTS IMPLEMENTATION

**Duration**: 3-4 days | **Status**: ⏳ PENDING | **Priority**: HIGH

This will be the **first agent to implement** and serves as the template for others.

#### 4.1 Configuration (`rainy/config.ts`)

```typescript
import type { AgentConfig } from '../core/AgentCore';

export const RAINY_AGENT_CONFIG: AgentConfig = {
  id: 'rainy',
  name: 'Rainy Agents',
  description: 'General-purpose coding assistant with full IDE integration',

  // Model configuration
  defaultProvider: 'groq',
  defaultModel: 'llama-3.3-70b-versatile',

  // Capabilities
  capabilities: [
    'code-generation',
    'code-editing',
    'file-operations',
    'git-operations',
    'terminal-execution',
    'workspace-analysis',
  ],

  // System prompt
  systemPrompt: `You are Rainy, an AI coding assistant integrated into the Rainy Code IDE.

You have access to the full workspace and can:
- Read, write, and edit files
- Execute terminal commands
- Perform git operations
- Analyze code structure and find references

Guidelines:
- Always provide clear, concise responses with code examples when relevant
- When making changes, explain what you're doing and why
- Use tools proactively to understand context before making suggestions
- Prioritize code quality, maintainability, and best practices
- Ask for clarification when requirements are ambiguous

Available tools: read_file, write_file, edit_file, search_files, execute_terminal, git_status, git_commit, workspace_structure, search_symbol, find_references

When using tools, always explain your reasoning.`,

  // Enabled tools
  enabledTools: [
    'read_file',
    'write_file',
    'edit_file',
    'search_files',
    'list_directory',
    'execute_terminal',
    'git_status',
    'git_commit',
    'git_diff',
    'git_log',
    'workspace_structure',
    'search_symbol',
    'find_references',
  ],

  // Advanced settings
  maxIterations: 10,
  toolTimeout: 30000, // 30 seconds
  parallelTools: true,
};
```

---

#### 4.2 Implementation (`rainy/RainyAgent.ts`)

```typescript
import { AgentCore, type AgentConfig, type MessageOptions, type AgentResponse, type ToolUpdate } from '../core/AgentCore';
import { RAINY_AGENT_CONFIG } from './config';
import { langGraphBridge } from '../orchestration/LangGraphBridge';
import { streamHandler } from '../orchestration/StreamHandler';
import { MemorySaver } from '@langchain/langgraph';
import { invoke } from '@tauri-apps/api/core';
import type { RustAgentResult } from '../types';

export class RainyAgent extends AgentCore {
  readonly id = 'rainy';
  readonly name = 'Rainy Agents';
  readonly description = RAINY_AGENT_CONFIG.description;

  constructor() {
    super(RAINY_AGENT_CONFIG);
  }

  async initialize(options?: { apiKey?: string }): Promise<void> {
    console.log('🌧️ Initializing Rainy Agent...');

    try {
      // Get API key from credential service
      const apiKey = options?.apiKey || await this.getApiKey();

      // Create LangGraph agent
      this.langGraphAgent = await langGraphBridge.createAgent({
        provider: this.config.defaultProvider,
        modelId: this.config.defaultModel,
        apiKey,
        systemPrompt: this.config.systemPrompt,
        checkpointer: new MemorySaver(),
        tools: this.config.enabledTools,
      });

      // Create session in Rust
      this.sessionId = await invoke<string>('agent_create_session', {
        agentType: this.id,
        config: {
          provider: this.config.defaultProvider,
          model: this.config.defaultModel,
          systemPrompt: this.config.systemPrompt,
          maxIterations: this.config.maxIterations,
          toolTimeout: this.config.toolTimeout,
          parallelTools: this.config.parallelTools,
        },
      });

      console.log('✅ Rainy Agent initialized');
    } catch (error) {
      console.error('Failed to initialize Rainy Agent:', error);
      throw error;
    }
  }

  async sendMessage(message: string, options?: MessageOptions): Promise<AgentResponse> {
    if (!this.sessionId) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Use Rust for fast mode or simple queries
    if (options?.fastMode) {
      return this.sendViaRust(message, options);
    }

    // Use LangGraph for complex reasoning
    return this.sendViaLangGraph(message, options);
  }

  async streamMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void,
    options?: MessageOptions
  ): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Determine routing strategy
    if (options?.fastMode) {
      // Use Rust streaming
      await this.streamViaRust(message, onChunk, onToolUpdate, options);
    } else {
      // Use LangGraph streaming
      await this.streamViaLangGraph(message, onChunk, onToolUpdate, options);
    }
  }

  /**
   * Send message via Rust core (faster, simpler)
   */
  private async sendViaRust(
    message: string,
    options?: MessageOptions
  ): Promise<AgentResponse> {
    const result = await invoke<RustAgentResult>('agent_send_message', {
      sessionId: this.sessionId,
      message,
      enableTools: options?.enableTools ?? true,
    });

    return {
      content: result.content,
      toolCalls: result.tool_calls,
      metadata: {
        tokensUsed: result.metadata.tokens_used,
        executionTimeMs: result.metadata.execution_time_ms,
        toolsExecuted: result.metadata.tools_executed,
        cost: result.metadata.cost_usd,
      },
    };
  }

  /**
   * Send message via LangGraph (complex reasoning)
   */
  private async sendViaLangGraph(
    message: string,
    options?: MessageOptions
  ): Promise<AgentResponse> {
    if (!this.langGraphAgent) {
      throw new Error('LangGraph agent not initialized');
    }

    let fullResponse = '';
    const toolCalls: any[] = [];

    const stream = langGraphBridge.stream(
      this.langGraphAgent,
      message,
      {
        thread_id: this.sessionId!,
        sessionId: this.sessionId!,
      }
    );

    for await (const chunk of stream) {
      fullResponse += chunk.content;
      if (chunk.metadata?.toolCalls) {
        toolCalls.push(...chunk.metadata.toolCalls);
      }
    }

    return {
      content: fullResponse,
      toolCalls,
      metadata: {},
    };
  }

  /**
   * Stream message via Rust
   */
  private async streamViaRust(
    message: string,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void,
    options?: MessageOptions
  ): Promise<void> {
    // Start streaming in Rust
    await invoke('agent_stream_message', {
      sessionId: this.sessionId,
      message,
      enableTools: options?.enableTools ?? true,
    });

    // Listen to stream events
    await streamHandler.handleRustStream(
      this.sessionId!,
      onChunk,
      onToolUpdate
    );
  }

  /**
   * Stream message via LangGraph
   */
  private async streamViaLangGraph(
    message: string,
    onChunk: (chunk: string) => void,
    onToolUpdate?: (update: ToolUpdate) => void,
    options?: MessageOptions
  ): Promise<void> {
    if (!this.langGraphAgent) {
      throw new Error('LangGraph agent not initialized');
    }

    await streamHandler.handleLangGraphStream(
      this.langGraphAgent,
      message,
      {
        thread_id: this.sessionId!,
        sessionId: this.sessionId!,
      },
      onChunk,
      onToolUpdate
    );
  }

  /**
   * Get API key from credential service
   */
  private async getApiKey(): Promise<string> {
    const provider = this.config.defaultProvider;

    // Try to get from credential service
    const key = await invoke<string | null>('credential_get', {
      service: `rainy-agent-${provider}`,
      account: 'api_key',
    });

    if (!key) {
      throw new Error(
        `API key not found for provider: ${provider}. ` +
        `Please configure in Settings > Agents > API Keys`
      );
    }

    return key;
  }

  async dispose(): Promise<void> {
    // Cleanup resources
    if (this.sessionId) {
      await invoke('agent_destroy_session', { sessionId: this.sessionId });
    }
  }
}
```

---

#### 4.3 Testing (`rainy/__tests__/RainyAgent.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RainyAgent } from '../RainyAgent';

describe('RainyAgent', () => {
  let agent: RainyAgent;

  beforeEach(async () => {
    agent = new RainyAgent();
    // Mock Tauri invoke
    vi.mock('@tauri-apps/api/core');
  });

  afterEach(async () => {
    await agent.dispose();
  });

  it('should initialize successfully', async () => {
    await agent.initialize({ apiKey: 'test-key' });
    expect(agent.id).toBe('rainy');
    expect(agent.name).toBe('Rainy Agents');
  });

  it('should send message via Rust', async () => {
    await agent.initialize({ apiKey: 'test-key' });
    const response = await agent.sendMessage('Hello', { fastMode: true });
    expect(response.content).toBeDefined();
  });

  it('should stream message', async () => {
    await agent.initialize({ apiKey: 'test-key' });

    const chunks: string[] = [];
    await agent.streamMessage(
      'Write a hello world',
      (chunk) => chunks.push(chunk)
    );

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should have correct capabilities', () => {
    const capabilities = agent.getCapabilities();
    expect(capabilities).toContain('code-generation');
    expect(capabilities).toContain('file-operations');
  });
});
```

---

#### Phase 4 Deliverables

- [ ] Complete Rainy Agent implementation
- [ ] Configuration finalized
- [ ] Both Rust and LangGraph integration working
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Documentation
- [ ] Example usage

---

### 🤖 PHASE 5: CLAUDE CODE AGENT

**Duration**: 2-3 days | **Status**: ⏳ PENDING | **Priority**: MEDIUM

#### 5.1 Configuration (`claude/config.ts`)

```typescript
export const CLAUDE_CODE_CONFIG: AgentConfig = {
  id: 'claude-code',
  name: 'Claude Code',
  description: 'Advanced code analysis and refactoring specialist',

  defaultProvider: 'google',
  defaultModel: 'gemini-2.0-flash-exp',

  capabilities: [
    'code-analysis',
    'refactoring',
    'debugging',
    'documentation',
    'testing',
  ],

  systemPrompt: `You are Claude Code, a specialized AI assistant for code analysis and refactoring.

Your expertise includes:
- Deep code analysis and architecture review
- Safe refactoring strategies and implementation
- Bug detection and debugging assistance
- Comprehensive documentation generation
- Test generation and coverage analysis

Guidelines:
- Always prioritize code quality, maintainability, and best practices
- Provide detailed explanations for your suggestions
- When refactoring, explain the benefits and potential risks
- Generate comprehensive tests that cover edge cases
- Follow language-specific conventions and idioms
- Consider performance implications of your suggestions

Available tools: read_file, search_symbol, find_references, workspace_structure, execute_terminal

Focus on making the codebase better, safer, and more maintainable.`,

  enabledTools: [
    'read_file',
    'write_file',
    'edit_file',
    'search_symbol',
    'find_references',
    'workspace_structure',
    'search_files',
    'execute_terminal', // For running tests
  ],

  maxIterations: 15, // More iterations for complex analysis
  toolTimeout: 45000, // 45 seconds
  parallelTools: true,
};
```

---

#### 5.2 Specialized Tools (`claude/tools.ts`)

```typescript
import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';

/**
 * Analyze code quality metrics
 */
export const analyzeCodeQuality = {
  name: 'analyze_code_quality',
  description: 'Analyze code quality metrics including complexity, duplication, and maintainability',
  schema: z.object({
    filePath: z.string().describe('Path to the file to analyze'),
    metrics: z.array(
      z.enum(['complexity', 'duplication', 'maintainability', 'coverage'])
    ).describe('Metrics to analyze'),
  }),
  execute: async (input: { filePath: string; metrics: string[] }) => {
    // This would call a Rust tool or external analyzer
    const result = await invoke('analyze_code_quality', input);
    return result;
  },
};

/**
 * Suggest refactoring opportunities
 */
export const suggestRefactoring = {
  name: 'suggest_refactoring',
  description: 'Identify refactoring opportunities to improve code structure',
  schema: z.object({
    filePath: z.string().describe('Path to the file'),
    scope: z.enum(['function', 'class', 'module']).describe('Scope of analysis'),
    focus: z.array(
      z.enum(['extract-method', 'rename', 'simplify', 'remove-duplication'])
    ).optional(),
  }),
  execute: async (input: any) => {
    // Analyze code and suggest refactorings
    const result = await invoke('suggest_refactoring', input);
    return result;
  },
};

/**
 * Generate unit tests
 */
export const generateTests = {
  name: 'generate_tests',
  description: 'Generate comprehensive unit tests for code',
  schema: z.object({
    filePath: z.string().describe('Path to the file'),
    framework: z.enum(['vitest', 'jest', 'mocha', 'pytest']).describe('Testing framework'),
    coverage: z.enum(['basic', 'comprehensive', 'edge-cases']).default('comprehensive'),
  }),
  execute: async (input: any) => {
    // Generate tests based on code analysis
    const result = await invoke('generate_tests', input);
    return result;
  },
};

/**
 * Detect potential bugs
 */
export const detectBugs = {
  name: 'detect_bugs',
  description: 'Analyze code for potential bugs and anti-patterns',
  schema: z.object({
    filePath: z.string().describe('Path to the file'),
    severity: z.enum(['all', 'high', 'critical']).default('all'),
  }),
  execute: async (input: any) => {
    const result = await invoke('detect_bugs', input);
    return result;
  },
};

export const claudeCodeTools = [
  analyzeCodeQuality,
  suggestRefactoring,
  generateTests,
  detectBugs,
];
```

---

#### 5.3 Implementation (`claude/ClaudeAgent.ts`)

Similar structure to `RainyAgent.ts` but with:

- Different system prompt
- Specialized tools
- Code analysis focus
- Higher iteration limit for deep analysis

**Checklist:**

- [ ] Implement `ClaudeAgent` class
- [ ] Add specialized tools
- [ ] Configure for Google provider
- [ ] Write unit tests
- [ ] Integration tests
- [ ] Documentation

---

### 💫 PHASE 6: ABBY MODE AGENT

**Duration**: 2-3 days | **Status**: ⏳ PENDING | **Priority**: MEDIUM

#### 6.1 Configuration (`abby/config.ts`)

```typescript
export const ABBY_MODE_CONFIG: AgentConfig = {
  id: 'abby',
  name: 'Abby Mode',
  description: 'Autonomous development mode with proactive assistance',

  defaultProvider: 'groq',
  defaultModel: 'llama-3.3-70b-versatile',

  capabilities: [
    'autonomous-coding',
    'proactive-suggestions',
    'workflow-automation',
    'context-awareness',
  ],

  systemPrompt: `You are Abby, an autonomous AI assistant that proactively helps developers.

You observe the workspace and offer intelligent suggestions:
- Automatically detect repetitive tasks and suggest automation
- Notice code patterns and recommend refactoring
- Monitor errors and propose fixes
- Suggest relevant tools and libraries based on context
- Anticipate developer needs based on their workflow

Guidelines:
- Be helpful but not intrusive
- Always wait for confirmation before making changes
- Provide clear explanations for your suggestions
- Learn from user preferences and adapt
- Focus on high-impact, low-effort improvements

Available tools: read_file, write_file, edit_file, workspace_structure, git_status, execute_terminal

You are autonomous but collaborative - empower developers, don't replace them.`,

  enabledTools: [
    'read_file',
    'write_file',
    'edit_file',
    'search_files',
    'workspace_structure',
    'git_status',
    'execute_terminal',
  ],

  maxIterations: 8,
  toolTimeout: 30000,
  parallelTools: true,

  // Autonomous features
  watchWorkspace: true,
  autoSuggest: true,
  suggestInterval: 60000, // Check every minute
};
```

---

#### 6.2 Proactive Features (`abby/proactive.ts`)

```typescript
import { listen } from '@tauri-apps/api/event';

export interface Suggestion {
  id: string;
  type: 'automation' | 'refactoring' | 'fix' | 'tool' | 'library';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  actions: SuggestionAction[];
  timestamp: number;
}

export interface SuggestionAction {
  type: 'edit' | 'create' | 'delete' | 'terminal';
  description: string;
  payload: any;
}

export class ProactiveMonitor {
  private suggestions: Suggestion[] = [];
  private watchers: Map<string, () => void> = new Map();

  /**
   * Start monitoring workspace for suggestions
   */
  async start(workspaceRoot: string): Promise<void> {
    // Watch file changes
    const fileWatcher = await listen('file-change', async (event) => {
      await this.analyzeFileChange(event.payload as any);
    });
    this.watchers.set('file-change', fileWatcher);

    // Watch git changes
    const gitWatcher = await listen('git-status-change', async (event) => {
      await this.analyzeGitChange(event.payload as any);
    });
    this.watchers.set('git-status-change', gitWatcher);

    // Periodic context analysis
    const intervalId = setInterval(() => {
      this.analyzeContext(workspaceRoot);
    }, ABBY_MODE_CONFIG.suggestInterval);

    this.watchers.set('interval', () => clearInterval(intervalId));
  }

  /**
   * Analyze file change for suggestions
   */
  private async analyzeFileChange(event: any): Promise<void> {
    // Detect patterns:
    // - Repeated code (suggest extraction)
    // - Common errors (suggest fix)
    // - Missing tests (suggest generation)
    // - Import patterns (suggest library)
  }

  /**
   * Analyze git changes
   */
  private async analyzeGitChange(event: any): Promise<void> {
    // Detect patterns:
    // - Many uncommitted changes (suggest commit)
    // - Conflicting changes (suggest resolution)
    // - Long-running branches (suggest merge)
  }

  /**
   * Periodic context analysis
   */
  private async analyzeContext(workspaceRoot: string): Promise<void> {
    // Analyze overall workspace state
    // - Outdated dependencies (suggest update)
    // - Performance issues (suggest optimization)
    // - Security vulnerabilities (suggest fix)
  }

  /**
   * Add suggestion
   */
  addSuggestion(suggestion: Suggestion): void {
    this.suggestions.push(suggestion);
    // Emit event to UI
  }

  /**
   * Get pending suggestions
   */
  getSuggestions(): Suggestion[] {
    return this.suggestions;
  }

  /**
   * Accept suggestion
   */
  async acceptSuggestion(id: string): Promise<void> {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (!suggestion) return;

    // Execute suggestion actions
    for (const action of suggestion.actions) {
      await this.executeAction(action);
    }

    // Remove from pending
    this.suggestions = this.suggestions.filter(s => s.id !== id);
  }

  /**
   * Dismiss suggestion
   */
  dismissSuggestion(id: string): void {
    this.suggestions = this.suggestions.filter(s => s.id !== id);
  }

  private async executeAction(action: SuggestionAction): Promise<void> {
    // Execute action based on type
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    for (const cleanup of this.watchers.values()) {
      cleanup();
    }
    this.watchers.clear();
  }
}
```

---

#### 6.3 Implementation (`abby/AbbyAgent.ts`)

Similar to `RainyAgent.ts` but with:

- Proactive monitoring system
- Suggestion queue management
- User preference learning
- Autonomous action execution (with confirmation)

**Checklist:**

- [ ] Implement `AbbyAgent` class
- [ ] Add proactive monitoring
- [ ] Implement suggestion system
- [ ] Add user preference tracking
- [ ] Write unit tests
- [ ] Integration tests
- [ ] Documentation

---

### 🔗 PHASE 7: INTEGRATION & TESTING

**Duration**: 3-4 days | **Status**: ⏳ PENDING | **Priority**: HIGH

#### 7.1 Store Integration

**Update `agentStore.ts`:**

```typescript
export interface AgentSession {
  // ... existing fields ...
  agentType: 'rainy' | 'claude-code' | 'abby'; // NEW
  agentCapabilities: Capability[]; // NEW
  routingStrategy: RouteStrategy; // NEW
}

async function createSession(params: {
  agentType: 'rainy' | 'claude-code' | 'abby'; // NEW
  name?: string;
  providerId: string;
  modelId: string;
  config?: Partial<AgentConfig>;
  systemPrompt?: string;
  workspaceRoot?: string;
}): Promise<string> {
  // Get agent from registry
  const agent = agentRegistry.get(params.agentType);
  if (!agent) {
    throw new Error(`Agent ${params.agentType} not found`);
  }

  // ... rest of implementation
}
```

**Checklist:**

- [ ] Update `agentStore.ts` with new fields
- [ ] Add agent type tracking
- [ ] Integrate with registry
- [ ] Update persistence layer
- [ ] Write migration if needed

---

#### 7.2 UI Integration

**Agent Selector Component:**

```typescript
export const AgentSelector: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('rainy');
  const agents = agentRegistry.listAll();

  return (
    <div className="w-64 border-r border-border bg-background p-4">
      <h3 className="text-lg font-semibold mb-4">Agent Mode</h3>

      <div className="space-y-2">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={cn(
              'w-full p-3 rounded-lg text-left transition-colors',
              selectedAgent === agent.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
          >
            <div className="font-medium">{agent.name}</div>
            <div className="text-sm opacity-70 mt-1">
              {agent.description}
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {agent.getCapabilities().slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="text-xs px-2 py-1 rounded bg-background/50"
                >
                  {cap}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

**Enhanced Chat View:**

```typescript
export const AgentsView: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('rainy');

  return (
    <div className="flex h-full w-full">
      {/* Agent Selector */}
      <AgentSelector
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Tool Execution Visualizer */}
        <ToolExecutionView />

        {/* Chat Messages */}
        <AgentChatView agentId={selectedAgent} />

        {/* Abby Suggestions (if Abby Mode) */}
        {selectedAgent === 'abby' && <SuggestionsPanel />}
      </div>

      {/* Settings Sidebar */}
      <AgentSettings agentId={selectedAgent} />
    </div>
  );
};
```

**Checklist:**

- [ ] Create `AgentSelector` component
- [ ] Update `AgentsView` component
- [ ] Add tool execution visualizer
- [ ] Add Abby suggestions panel
- [ ] Update settings panel
- [ ] Test all UI flows

---

#### 7.3 Testing Suite

**Unit Tests:**

- [ ] Rust core components
- [ ] TypeScript agent classes
- [ ] Tool execution
- [ ] Memory management
- [ ] Provider integrations

**Integration Tests:**

- [ ] Rust ↔ TypeScript communication
- [ ] LangGraph integration
- [ ] Provider API calls (mocked)
- [ ] Streaming coordination
- [ ] Agent routing

**E2E Tests:**

- [ ] Complete conversation flow
- [ ] Tool execution in agents
- [ ] Multi-agent switching
- [ ] Error handling
- [ ] Session persistence

**Performance Tests:**

- [ ] Inference latency
- [ ] Tool execution speed
- [ ] Memory usage
- [ ] Streaming throughput

---

#### 7.4 Documentation

Create comprehensive documentation:

```
docs/agents/
├── RAINY_AGENTS.md              # Rainy Agents user guide
├── CLAUDE_CODE.md               # Claude Code user guide
├── ABBY_MODE.md                 # Abby Mode user guide
├── API.md                       # API reference
├── ARCHITECTURE.md              # System architecture
├── TOOLS.md                     # Tool development guide
├── CONTRIBUTING.md              # Contributing guidelines
└── TROUBLESHOOTING.md           # Common issues
```

**Checklist:**

- [ ] Write user guides for each agent
- [ ] Document API reference
- [ ] Create architecture diagrams
- [ ] Write tool development guide
- [ ] Add troubleshooting section
- [ ] Create video tutorials (optional)

---

### 🎨 PHASE 8: UI/UX REFINEMENT

**Duration**: 2-3 days | **Status**: ⏳ PENDING | **Priority**: MEDIUM

#### 8.1 Enhanced Features

**Tool Execution Visualization:**

- Real-time tool execution progress
- Tool output preview
- Execution timeline
- Error highlighting

**Thinking/Reasoning Display:**

- Show LangGraph intermediate steps
- Visualize agent decision-making
- Display tool selection reasoning

**Metrics Dashboard:**

- Token usage per session
- Cost tracking
- Response time metrics
- Tool usage statistics

**Agent Comparison:**

- Side-by-side agent performance
- Capability matrix
- Use case recommendations

---

#### 8.2 Agent Settings Panel

```typescript
export const AgentSettings: React.FC<{ agentId: string }> = ({ agentId }) => {
  const agent = agentRegistry.get(agentId);
  const [provider, setProvider] = useState(agent?.config.defaultProvider);
  const [model, setModel] = useState(agent?.config.defaultModel);

  return (
    <div className="w-80 border-l border-border bg-background p-4">
      <h3 className="text-lg font-semibold mb-4">Agent Settings</h3>

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Provider</label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectItem value="google">Google Gemini</SelectItem>
          <SelectItem value="groq">Groq (Llama 3.3)</SelectItem>
        </Select>
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Model</label>
        <Select value={model} onValueChange={setModel}>
          {getModelsForProvider(provider).map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Advanced Settings */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced">
          <AccordionTrigger>Advanced Settings</AccordionTrigger>
          <AccordionContent>
            {/* Temperature */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Temperature: {temperature}
              </label>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            {/* Max Tokens */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Max Tokens
              </label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>

            {/* Parallel Tools */}
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={parallelTools}
                onCheckedChange={setParallelTools}
              />
              <label className="text-sm">Enable parallel tool execution</label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Enabled Tools */}
      <div className="mt-6">
        <h4 className="text-sm font-medium mb-2">Enabled Tools</h4>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {agent?.getEnabledTools().map((tool) => (
            <div key={tool} className="flex items-center justify-between p-2 rounded hover:bg-accent">
              <span className="text-sm">{tool}</span>
              <Switch checked={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

#### Phase 8 Deliverables

- [ ] Enhanced UI components
- [ ] Tool execution visualization
- [ ] Metrics dashboard
- [ ] Agent comparison view
- [ ] Polished settings panel
- [ ] Accessibility improvements
- [ ] Mobile responsiveness (if applicable)
- [ ] User feedback integration

---

## 📊 PROGRESS TRACKING

### Overall Progress

```
Phase 1: Research & Architecture       [████████████████████] 100% ✅
Phase 2: Rust Core                     [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
Phase 3: TypeScript Orchestration      [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
Phase 4: Rainy Agents                  [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
Phase 5: Claude Code                   [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
Phase 6: Abby Mode                     [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
Phase 7: Integration & Testing         [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
Phase 8: UI/UX Refinement             [░░░░░░░░░░░░░░░░░░░░]   0% ⏳

Total Progress: 12.5%
```

### Next Action Items

1. ✅ Review and approve this plan
2. 🔄 Set up Rust dependencies in `Cargo.toml`
3. 🔄 Create directory structure
4. 🔄 Start Phase 2: Rust Core Implementation
5. 🔄 Begin with `core.rs` and Tauri commands

---

## 🚨 RISKS & MITIGATION

### Risk 1: Rust-TypeScript Integration Complexity

**Impact**: High | **Probability**: Medium

**Mitigation:**

- Use well-tested Tauri patterns
- Comprehensive error handling
- Integration tests at every step
- Clear documentation of interfaces

### Risk 2: LangGraph Streaming Limitations

**Impact**: Medium | **Probability**: Low

**Mitigation:**

- Hybrid approach (Rust for fast streaming, LangGraph for orchestration)
- Fallback to Rust streaming if LangGraph issues
- Monitor LangGraph updates for improvements

### Risk 3: Provider API Rate Limits

**Impact**: High | **Probability**: Medium

**Mitigation:**

- Built-in rate limiting in Rust
- Request queuing system
- Fallback to alternative providers
- Clear user feedback on rate limit status

### Risk 4: Memory Leaks in Long Conversations

**Impact**: High | **Probability**: Low

**Mitigation:**

- Automatic conversation pruning
- Context window management
- Periodic cleanup tasks
- Memory monitoring and alerts

### Risk 5: Tool Execution Safety

**Impact**: Critical | **Probability**: Low

**Mitigation:**

- Sandboxed tool execution
- Permission system for dangerous operations
- User confirmation for destructive actions
- Comprehensive audit logging

---

## 📈 SUCCESS CRITERIA

### Functional Requirements

- [x] All three agents (Rainy, Claude, Abby) fully functional
- [x] Rust core performing at target latency
- [x] LangGraph integration working smoothly
- [x] All tools executable from all agents
- [x] Streaming working reliably
- [x] Session persistence working

### Non-Functional Requirements

- [x] Inference latency < 500ms (LangGraph), < 200ms (Rust)
- [x] Tool execution < 100ms (filesystem), < 1s (terminal)
- [x] Memory usage < 200MB per session
- [x] Test coverage > 80%
- [x] Zero crashes in normal usage
- [x] Clear error messages for all failure cases

### User Experience

- [x] Intuitive agent selection
- [x] Smooth streaming experience
- [x] Clear tool execution feedback
- [x] Helpful error messages
- [x] Fast response times
- [x] Reliable session persistence

---

## 📞 SUPPORT & RESOURCES

### Team Roles

- **Rust Developer**: Phases 2, 7
- **TypeScript Developer**: Phases 3, 4, 5, 6, 7
- **UI/UX Developer**: Phase 8
- **QA Engineer**: Phase 7
- **Technical Writer**: Phase 7, 8

### External Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Tauri Plugin Development](https://tauri.app/v1/guides/building/plugin-guide)
- [Google Gemini API](https://ai.google.dev/docs)
- [Groq API Documentation](https://console.groq.com/docs)

### Internal Resources

- Existing agent implementation in `src/services/agent/`
- Tool registry in `src/services/agent/tools/`
- Current stores in `src/stores/`

---

## 🎯 CONCLUSION

This comprehensive plan provides a clear roadmap for implementing a world-class multi-agent system in Rainy Code IDE. The dual-core architecture leverages Rust's performance for critical operations while maintaining TypeScript's flexibility for orchestration.

The three specialized agents (Rainy, Claude Code, Abby Mode) provide comprehensive coverage of developer needs, from general coding assistance to advanced analysis to autonomous development.

With modern LangGraph 2025 features, robust error handling, and production-grade architecture, this system will position Rainy Code as a leader in AI-powered development tools.

**Let's build the future of AI-assisted development! 🚀**

---

**Document Version**: 1.0
**Last Updated**: November 14, 2025
**Status**: Ready for Implementation
**Next Review**: After Phase 2 Completion
