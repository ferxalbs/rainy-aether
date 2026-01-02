# Agent System Migration Plan

> **Status**: In Progress  
> **Target**: Move from legacy `agent/` to new `agents/server/` architecture  
> **Timeline**: Post v0.5.0 release

---

## Overview

The Rainy Aether agent system is transitioning from a **frontend-centric provider model** to a **server-side AgentKit architecture**. This migration brings:

- **Durability**: Inngest step functions for reliable execution
- **Scalability**: Server-side processing, not browser-bound
- **MCP Integration**: Native Model Context Protocol support
- **Multi-Agent**: Coordinated agent networks with routing

---

## Current Architecture

### Legacy System (`src/services/agent/`)

| Component | File | Purpose |
|-----------|------|---------|
| Providers | `providers/index.ts` | Model factory, configs |
| Gemini | `providers/gemini.ts` | Gemini API client |
| Groq | `providers/groq.ts` | Groq API client |
| Tools | `ToolRegistry.ts` | 71KB tool definitions |
| Service | `AgentService.ts` | Frontend agent orchestration |
| Prompts | `agentSystemPrompt.ts` | System prompts |
| History | `AgentHistoryService.ts` | Conversation persistence |
| Token | `TokenCounter.ts` | Token counting |

### New System (`src/services/agents/server/`)

| Component | File | Purpose |
|-----------|------|---------|
| Network | `agents/network.ts` | AgentKit network factory |
| Prompts | `agents/prompts.ts` | Dynamic system prompts |
| MCP Agents | `agents/mcp-agents.ts` | Context7-enabled agents |
| Tools | `tools/agentkit.ts` | Zod-validated tools |
| Executor | `tools/executor.ts` | Parallel execution, caching |
| MCP Client | `mcp/client.ts` | MCP server connections |
| Streaming | `streaming/events.ts` | SSE event types |
| Workflows | `workflows/inngest.ts` | Durable task execution |

---

## Migration Items

### Phase A: Provider Consolidation

**What**: Merge `agent/providers/` into `agents/server/`

| Legacy | New | Notes |
|--------|-----|-------|
| `providers/gemini.ts` | Use AgentKit `gemini()` | AgentKit handles API calls |
| `providers/groq.ts` | Use AgentKit `openai()` with baseUrl | Groq is OpenAI-compatible |
| `providers/index.ts` | `agents/network.ts` MODELS | Model IDs only |
| `providers/base.ts` | Not needed | AgentKit provides abstraction |
| `providers/retryUtils.ts` | Inngest step retries | Built into workflows |

**Why**:
- AgentKit abstracts provider details
- Inngest provides retry/durability
- Less code to maintain

### Phase B: Tool Migration

**What**: Consolidate `ToolRegistry.ts` into `tools/`

| Legacy | New | Notes |
|--------|-----|-------|
| `ToolRegistry.ts` (71KB) | `tools/schema.ts` + `tools/agentkit.ts` | Zod schemas, AgentKit format |
| Frontend tool calls | Server-side execution | Via Tauri bridge |
| `toolUtils.ts` | `tools/bridge.ts` | Handler registration |

**Why**:
- Zod provides runtime validation
- AgentKit `createTool` is type-safe
- Server execution is more reliable

### Phase C: Agent Unification

**What**: Replace legacy agents with AgentKit agents

| Legacy | New | Notes |
|--------|-----|-------|
| `brain/agents/*.ts` | `server/agents/network.ts` | Using `createAgent()` |
| `AgentService.ts` | `routes/brain.ts` + Inngest | HTTP API + durable workflows |
| Custom routing | AgentKit router | State-based decisions |

**Why**:
- AgentKit provides multi-agent orchestration
- State-based routing is more flexible
- Inngest ensures task completion

### Phase D: Model Adapter Removal

**What**: Remove `brain/modelAdapter.ts`

| Legacy | New | Notes |
|--------|-----|-------|
| `createInferenceAdapter()` | Direct AgentKit usage | No adapter needed |
| `selectModelForTask()` | `MODELS` in network.ts | Simple config |
| Metrics tracking | Inngest observability | Built-in monitoring |

**Why**:
- AgentKit handles inference
- Inngest provides observability
- Simpler architecture

---

## Model ID Reference

These model IDs should remain consistent across both systems during migration:

```typescript
// From src/services/agent/providers/index.ts
const PROVIDER_MODELS = {
  'gemini-flash-latest': 'gemini-3-flash-preview',
  'gemini-3-pro-thinking-high': 'gemini-3-pro-preview',
  'llama-3.3-70b': 'llama-3.3-70b-versatile',
};

// For AgentKit (src/services/agents/server/agents/network.ts)
const AGENTKIT_MODELS = {
  default: 'gemini-3-flash-preview',
  fast: 'gemini-3-flash-preview',
  smart: 'gemini-3-pro-preview',
};
```

---

## Files to Delete Post-Migration

After full migration, these files can be removed:

```
src/services/agent/
├── providers/           # Replaced by AgentKit
│   ├── base.ts
│   ├── gemini.ts
│   ├── groq.ts
│   └── index.ts
├── AgentService.ts      # Replaced by server routes
├── ToolRegistry.ts      # Replaced by tools/schema.ts
└── toolUtils.ts         # Replaced by tools/bridge.ts

src/services/agents/brain/
├── modelAdapter.ts      # No longer needed
└── network.ts           # Replaced by server/agents/network.ts
```

---

## Migration Checklist

- [ ] Phase A: Provider consolidation
  - [ ] Map all model IDs
  - [ ] Update thinking mode configs
  - [ ] Remove provider classes
- [ ] Phase B: Tool migration
  - [ ] Add missing tools to agentkit.ts
  - [ ] Verify Zod schemas match
  - [ ] Delete ToolRegistry.ts
- [ ] Phase C: Agent unification
  - [ ] Migrate brain/agents/* to server
  - [ ] Update AgentService callers
  - [ ] Remove legacy agent classes
- [ ] Phase D: Cleanup
  - [ ] Remove modelAdapter.ts
  - [ ] Remove brain/network.ts
  - [ ] Update all imports
- [ ] Testing
  - [ ] All tools execute correctly
  - [ ] MCP connections work
  - [ ] Streaming events flow
  - [ ] Inngest workflows complete

---

## Notes

- Keep legacy system functional until new system is fully tested
- Frontend components may need updates to call server API
- Consider backwards-compatible API routes during transition
