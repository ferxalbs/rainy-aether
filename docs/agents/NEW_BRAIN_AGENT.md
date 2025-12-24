# 🧠 RAINY BRAIN - Production Agent System

> **Goal**: A scalable, durable AI coding assistant with multi-agent orchestration, parallel tool execution, and long-running workflow support.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RAINY AETHER IDE                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Agent UI  │◄──►│ BrainClient │◄──►│   WebSocket Bridge      │  │
│  │  (React)    │    │  (Service)  │    │   (Real-time IPC)       │  │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘  │
│                                                    │                │
│  ┌─────────────────────────────────────────────────┼─────────────┐  │
│  │                    TAURI CORE                   │             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┴───────────┐ │  │
│  │  │ File System  │  │  Terminal    │  │  Tool Executor      │ │  │
│  │  │   Commands   │  │  Commands    │  │  (Rust ↔ Node)      │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/SSE
┌─────────────────────────────────────────────────────────────────────┐
│                      BRAIN SIDECAR (Node.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    ORCHESTRATION LAYER                       │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ Task Router  │  │ Agent Pool   │  │ Execution Queue  │   │    │
│  │  │ (Intent →    │  │ (Parallel    │  │ (Priority FIFO)  │   │    │
│  │  │  Agent)      │  │  Agents)     │  │                  │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AGENT NETWORK (AgentKit)                  │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │    │
│  │  │Planner │ │ Coder  │ │Reviewer│ │Terminal│ │  Docs  │    │    │
│  │  │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │    │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    INNGEST DURABILITY                        │    │
│  │  • Automatic retries    • Step checkpoints                   │    │
│  │  • Event-driven         • Long-running (hours)               │    │
│  │  • Parallel steps       • State persistence                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Tool Execution Engine
**Priority: CRITICAL | Duration: 2 days**

### 1.1 Unified Tool System
Single tool definition usable by both frontend and AgentKit:

```typescript
// src/services/agents/tools/schema.ts
interface UnifiedTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  executor: 'tauri' | 'node' | 'hybrid';
  timeout: number;
  retryable: boolean;
  parallel: boolean;  // Can run with other tools simultaneously
}
```

### 1.2 Parallel Tool Execution
```typescript
// Execute independent tools in parallel
const results = await toolExecutor.batch([
  { tool: 'read_file', args: { path: 'src/a.ts' } },
  { tool: 'read_file', args: { path: 'src/b.ts' } },
  { tool: 'read_file', args: { path: 'src/c.ts' } },
], { parallel: true, maxConcurrency: 5 });
```

### 1.3 Tool Categories
| Category | Tools | Executor | Parallel |
|----------|-------|----------|----------|
| **Read** | `read_file`, `list_dir`, `search_code` | Tauri | ✅ Yes |
| **Write** | `write_file`, `edit_file`, `create_file` | Tauri | ❌ Sequential |
| **Execute** | `run_command`, `run_tests` | Tauri | ⚠️ Configurable |
| **Git** | `git_status`, `git_commit`, `git_diff` | Tauri | ✅ Yes |
| **Analysis** | `get_diagnostics`, `analyze_code` | Hybrid | ✅ Yes |

---

## Phase 2: Agent Network
**Priority: HIGH | Duration: 3 days**

### 2.1 Agent Specializations

```typescript
// Lightweight agent definitions
const agents = {
  planner: createAgent({
    name: 'planner',
    model: 'fast',  // Uses cheap/fast model
    systemPrompt: PLANNER_PROMPT,
    tools: ['read_directory_tree', 'search_code', 'read_file'],
    maxIterations: 3,
  }),
  
  coder: createAgent({
    name: 'coder',
    model: 'smart',  // Uses powerful model
    systemPrompt: CODER_PROMPT,
    tools: ['read_file', 'edit_file', 'create_file', 'write_file'],
    maxIterations: 10,
  }),
  
  reviewer: createAgent({
    name: 'reviewer',
    model: 'fast',
    systemPrompt: REVIEWER_PROMPT,
    tools: ['read_file', 'get_diagnostics', 'search_code'],
    maxIterations: 5,
  }),
  
  terminal: createAgent({
    name: 'terminal',
    model: 'fast',
    systemPrompt: TERMINAL_PROMPT,
    tools: ['run_command', 'run_tests'],
    maxIterations: 5,
  }),
};
```

### 2.2 Smart Router
```typescript
// Intent classification → Agent selection
function routeTask(task: string, context: Context): AgentPipeline {
  const intent = classifyIntent(task);
  
  switch (intent.type) {
    case 'create_project':
      return pipeline([agents.planner, agents.coder, agents.terminal, agents.reviewer]);
    
    case 'edit_code':
      return pipeline([agents.coder, agents.reviewer]);
    
    case 'run_command':
      return single(agents.terminal);
    
    case 'explain_code':
      return single(agents.coder);  // Read-only mode
    
    default:
      return single(agents.coder);
  }
}
```

### 2.3 Agent Handoff Protocol
```typescript
interface AgentHandoff {
  from: string;
  to: string;
  context: {
    filesModified: string[];
    currentState: string;
    remainingTasks: string[];
  };
  reason: string;
}
```

---

## Phase 3: Inngest Workflows
**Priority: HIGH | Duration: 2 days**

### 3.1 Core Workflow: Task Execution
```typescript
const executeTask = inngest.createFunction(
  { id: 'brain/execute-task', retries: 3 },
  { event: 'brain/task.requested' },
  async ({ event, step }) => {
    const { task, context, options } = event.data;
    
    // Step 1: Plan (checkpointed)
    const plan = await step.run('plan', async () => {
      return await agents.planner.execute(task, context);
    });
    
    // Step 2: Execute each step (parallel when possible)
    const results = await step.run('execute', async () => {
      return await executePlan(plan, agents.coder);
    });
    
    // Step 3: Validate
    const validation = await step.run('validate', async () => {
      return await agents.reviewer.validate(results);
    });
    
    // Step 4: Fix if needed (retry logic)
    if (!validation.passed) {
      await step.run('fix', async () => {
        return await agents.coder.fix(validation.issues);
      });
    }
    
    return { success: true, results, validation };
  }
);
```

### 3.2 Long-Running Project Creation
```typescript
const createProject = inngest.createFunction(
  { id: 'brain/create-project', retries: 2 },
  { event: 'brain/project.create' },
  async ({ event, step }) => {
    // Each step is automatically checkpointed
    const structure = await step.run('1-plan-structure', ...);
    const files = await step.run('2-create-files', ...);
    const deps = await step.run('3-install-deps', ...);
    const config = await step.run('4-configure', ...);
    const test = await step.run('5-run-tests', ...);
    const docs = await step.run('6-generate-docs', ...);
    
    return { projectPath: event.data.path, success: true };
  }
);
```

### 3.3 Event Types
```typescript
type BrainEvents = {
  'brain/task.requested': { task: string; context: Context; };
  'brain/task.progress': { taskId: string; step: number; total: number; message: string; };
  'brain/task.completed': { taskId: string; result: any; };
  'brain/task.failed': { taskId: string; error: string; recoverable: boolean; };
  'brain/project.create': { template: string; name: string; options: any; };
};
```

---

## Phase 4: Communication Layer
**Priority: HIGH | Duration: 2 days**

### 4.1 WebSocket Bridge (Tauri ↔ Sidecar)
```typescript
// Bidirectional tool execution
// Sidecar → Tauri: Execute tool
// Tauri → Sidecar: Tool result

interface ToolMessage {
  id: string;
  type: 'tool_call' | 'tool_result' | 'stream' | 'error';
  tool?: string;
  args?: Record<string, any>;
  result?: any;
  error?: string;
}
```

### 4.2 SSE for Progress Updates
```typescript
// Frontend subscribes to task progress
GET /api/brain/tasks/{taskId}/stream

// Events:
data: {"type":"step","step":1,"total":5,"message":"Planning structure..."}
data: {"type":"tool","tool":"create_file","status":"pending"}
data: {"type":"tool","tool":"create_file","status":"success"}
data: {"type":"step","step":2,"total":5,"message":"Creating files..."}
data: {"type":"complete","result":{...}}
```

### 4.3 API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/brain/execute` | POST | Start new task |
| `/api/brain/tasks/{id}` | GET | Get task status |
| `/api/brain/tasks/{id}/stream` | GET | SSE stream |
| `/api/brain/tasks/{id}/cancel` | POST | Cancel task |
| `/api/brain/tasks/{id}/resume` | POST | Resume from checkpoint |

---

## Phase 5: Frontend Integration
**Priority: MEDIUM | Duration: 2 days**

### 5.1 BrainService
```typescript
class BrainService {
  async execute(task: string, options?: TaskOptions): Promise<TaskHandle> {
    const response = await fetch('/api/brain/execute', {
      method: 'POST',
      body: JSON.stringify({ task, context: this.getContext(), options }),
    });
    return new TaskHandle(response.taskId, this);
  }
  
  stream(taskId: string, callbacks: StreamCallbacks): () => void {
    const es = new EventSource(`/api/brain/tasks/${taskId}/stream`);
    es.onmessage = (e) => callbacks.onUpdate(JSON.parse(e.data));
    return () => es.close();
  }
}
```

### 5.2 React Hook
```typescript
function useBrainTask() {
  const [task, setTask] = useState<TaskState | null>(null);
  
  const execute = async (prompt: string) => {
    const handle = await brainService.execute(prompt);
    setTask({ id: handle.id, status: 'running', steps: [] });
    
    brainService.stream(handle.id, {
      onStep: (step) => setTask(t => ({ ...t, steps: [...t.steps, step] })),
      onComplete: (result) => setTask(t => ({ ...t, status: 'complete', result })),
      onError: (error) => setTask(t => ({ ...t, status: 'error', error })),
    });
  };
  
  return { task, execute, cancel: () => brainService.cancel(task?.id) };
}
```

---

## Phase 6: Optimization & Scaling
**Priority: MEDIUM | Duration: 2 days**

### 6.1 Caching Layer
```typescript
// Cache expensive operations
const cache = {
  directoryTree: new LRUCache({ maxAge: 60000 }),  // 1 min
  fileContents: new LRUCache({ maxAge: 30000 }),   // 30 sec
  diagnostics: new LRUCache({ maxAge: 10000 }),    // 10 sec
};
```

### 6.2 Batch Operations
```typescript
// Instead of 100 individual read_file calls
await toolExecutor.batchRead(files, { chunkSize: 20 });
```

### 6.3 Model Selection Strategy
| Task Type | Model | Reason |
|-----------|-------|--------|
| Planning | gemini-flash | Fast, cheap |
| Code Generation | gemini-pro / claude | Quality matters |
| Review | gemini-flash | Fast iteration |
| Simple Commands | llama-3.1-8b (Groq) | Ultra-fast |

---

## File Structure

```
src/services/agents/
├── server/                    # Sidecar (Node.js)
│   ├── index.ts              # Hono app entry
│   ├── routes/
│   │   ├── brain.ts          # /api/brain/* endpoints
│   │   └── inngest.ts        # Inngest handler
│   ├── agents/
│   │   ├── base.ts           # Base agent class
│   │   ├── planner.ts
│   │   ├── coder.ts
│   │   ├── reviewer.ts
│   │   └── terminal.ts
│   ├── tools/
│   │   ├── schema.ts         # Unified tool definitions
│   │   ├── executor.ts       # Tool execution engine
│   │   └── bridge.ts         # Tauri communication
│   ├── workflows/
│   │   ├── executeTask.ts
│   │   ├── createProject.ts
│   │   └── refactorCode.ts
│   └── lib/
│       ├── router.ts         # Intent router
│       ├── cache.ts          # Caching layer
│       └── streaming.ts      # SSE utilities
│
├── brain/                     # Frontend integration
│   ├── BrainService.ts       # API client
│   ├── types.ts              # TypeScript types
│   └── hooks/
│       └── useBrainTask.ts
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Simple task latency | < 3 seconds |
| Multi-file edit | < 15 seconds |
| Project creation (5 files) | < 60 seconds |
| Project creation (20+ files) | < 5 minutes |
| Tool execution overhead | < 50ms per tool |
| Max concurrent tools | 10 |
| Max task duration | 1 hour |
| Checkpoint interval | Every step |

---

## Implementation Order

1. **Phase 1** → Tool Execution Engine (foundation)
2. **Phase 4** → Communication Layer (needed for tools)
3. **Phase 2** → Agent Network (core functionality)
4. **Phase 3** → Inngest Workflows (durability)
5. **Phase 5** → Frontend Integration (user experience)
6. **Phase 6** → Optimization (polish)

---

## Next: Start Phase 1
Create the unified tool system and parallel execution engine.
