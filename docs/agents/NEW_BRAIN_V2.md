# Rainy Brain V2 - Next Steps

## Current State (V1 Complete ✅)

| Phase | Status | Components |
|-------|--------|------------|
| Tools | ✅ | 18 tools + 15 aliases |
| Agents | ✅ | 5 specialized (Planner, Coder, Reviewer, Terminal, Docs) |
| Workflows | ✅ | 3 Inngest durable workflows |
| Frontend | ✅ | BrainService, useBrainTask hook |
| Progress UI | ✅ | 3 components |

---

## V2 Roadmap

### 🎯 Phase 6: Optimization & Performance

**Caching Layer**
- [ ] Add Redis/SQLite cache for tool results
- [ ] LRU cache for file contents
- [ ] Cache workspace info (invalidate on file changes)

**Batching**
- [ ] Smart tool batching (parallel reads)
- [ ] Debounced writes
- [ ] Batch API calls to sidecar

**Token Optimization**
- [ ] Compress context for LLM
- [ ] Summarize long file contents
- [ ] Limit directory tree depth intelligently

---

### 🧠 Phase 7: Advanced Agents

**Specialist Agents**
- [ ] **Architect** - System design, architecture decisions
- [ ] **Debugger** - Error analysis, stack traces
- [ ] **Tester** - Test generation, coverage
- [ ] **Migrator** - Code migrations, refactors

**Agent Memory**
- [ ] Persistent agent memory (SQLite)
- [ ] Session history across restarts
- [ ] Learn from user feedback

**Multi-Agent Collaboration**
- [ ] Agent-to-agent communication
- [ ] Task decomposition
- [ ] Parallel agent execution

---

### 🔌 Phase 8: Tool Ecosystem

**New Tools**
- [ ] `web_search` - Search documentation
- [ ] `image_analyze` - Analyze screenshots
- [ ] `database_query` - SQLite/Postgres
- [ ] `api_call` - REST API execution
- [ ] `documentation_fetch` - Fetch library docs

**Custom User Tools**
- [ ] User-defined tools (YAML config)
- [ ] Tool marketplace integration
- [ ] MCP server tools

---

### 🌐 Phase 9: Cloud & Collaboration

**Cloud Sync**
- [ ] Sync agent history to cloud
- [ ] Share agent sessions
- [ ] Team agent configurations

**Remote Execution**
- [ ] Cloud sidecar option
- [ ] Distributed tool execution
- [ ] GPU-accelerated tasks

---

### 🎨 Phase 10: Enhanced UI

**Chat Improvements**
- [ ] Streaming markdown rendering
- [ ] Code diffs inline
- [ ] File tree navigator in chat
- [ ] Voice input

**Progress Visualization**
- [ ] Gantt-style task timeline
- [ ] Agent activity graph
- [ ] Tool execution heatmap

**Customization**
- [ ] Custom agent personas
- [ ] Prompt templates
- [ ] Keyboard shortcuts

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Redis cache | High | Medium | P1 |
| Agent memory | High | High | P1 |
| web_search tool | Medium | Low | P2 |
| Multi-agent | High | High | P2 |
| Cloud sync | Medium | High | P3 |

---

## Technical Debt

- [ ] Remove unused `@tauri-apps/api` from sidecar bundle
- [ ] Add unit tests for tool handlers
- [ ] Integration tests for agent workflows
- [ ] Performance benchmarks
- [ ] Error handling audit

---

## Usage Notes

**Where is the Progress UI displayed?**

The new components should be integrated into `AgentChatWindow.tsx`:

```tsx
// In message rendering loop
{message.toolCalls && message.toolCalls.length > 0 && (
  <ToolExecutionList tools={message.toolCalls} />
)}

// In header/sidebar
<BrainStatusIndicator showLabel />
```

**Components location:** `src/components/agents/`
- `BrainStatusIndicator.tsx`
- `TaskProgress.tsx`
- `ToolExecutionList.tsx`
