# Dual-Agent System

**Complete Dual-Agent Architecture Documentation**

**Date:** 2025-11-06
**Status:** Production Ready
**Default Agent:** Agent 1 (Custom)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Agent Profiles](#agent-profiles)
4. [Configuration System](#configuration-system)
5. [Usage Guide](#usage-guide)
6. [Routing Logic](#routing-logic)
7. [Metrics & Comparison](#metrics--comparison)
8. [Migration Strategies](#migration-strategies)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

---

## Overview

Rainy Aether implements a **dual-agent architecture** that allows seamless switching between two fundamentally different AI agent implementations:

- **Agent 1 (Custom)**: Lightweight AI SDK-based implementation, optimized for speed
- **Agent 2 (LangGraph)**: Advanced ReAct agent with conversation memory and complex reasoning

### Why Dual-Agent?

**Flexibility**: Choose the right tool for the task
- Simple queries → Agent 1 (faster)
- Complex tasks → Agent 2 (smarter)

**Risk Mitigation**: Fallback if one agent fails
- Production stability with backup system
- Gradual migration path

**A/B Testing**: Real-world performance comparison
- Side-by-side metrics
- User preference tracking
- Data-driven decisions

**Future-Proof**: Easy to deprecate either agent
- Remove Agent 1 (AI SDK) later
- OR remove Agent 2 (LangGraph) if needed
- No vendor lock-in

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
│  AgentView.tsx, ChatInterface.tsx, AgentSettings.tsx         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Configuration Layer                         │
│  agentConfigStore.ts (React hooks + Tauri Store)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  AgentService.ts (dual-agent routing logic)                 │
└─────────────────────────────────────────────────────────────┘
                    ↙                    ↘
    ┌────────────────────┐      ┌──────────────────────┐
    │   Agent 1 Path     │      │   Agent 2 Path       │
    │   (AI SDK)         │      │   (LangGraph)        │
    │                    │      │                      │
    │ • Direct provider  │      │ • ReAct agent        │
    │ • Sequential tools │      │ • MemorySaver        │
    │ • No memory        │      │ • Multi-turn context │
    └────────────────────┘      └──────────────────────┘
                    ↘                    ↙
              ┌──────────────────────────┐
              │   Provider/Tool Layer     │
              │  Multi-provider + Tools   │
              └──────────────────────────┘
```

### File Structure

```
src/
├── types/
│   └── agentConfig.ts                    # Type definitions
├── stores/
│   ├── agentStore.ts                     # Session/message state
│   └── agentConfigStore.ts               # Agent configuration state
├── services/
│   └── agent/
│       ├── agentService.ts               # Dual-agent routing
│       ├── providerManager.ts            # Provider abstraction
│       ├── toolExecutor.ts               # Tool execution
│       └── langgraph/
│           ├── runner.ts                 # LangGraph entry point
│           ├── graphFactory.ts           # ReAct agent creation
│           ├── modelFactory.ts           # Multi-provider models
│           ├── tools.ts                  # Tool adapter layer
│           └── types.ts                  # LangGraph types
└── components/
    └── ide/
        ├── AgentView.tsx                 # Agent UI
        └── AgentSettings.tsx             # Configuration UI (future)

docs/
├── DUAL_AGENT_SYSTEM.md                  # This file
├── LANGGRAPH_MIGRATION.md                # LangGraph details
└── LANGGRAPH_TESTING_GUIDE.md            # Testing procedures
```

---

## Agent Profiles

### Agent 1 (Custom)

**Name:** Agent 1 (Custom)
**Description:** Custom-built agent with AI SDK foundation. Optimized for speed and simplicity.
**Version:** 1.0.0
**Status:** Stable ✅

**Features:**
- ✅ Streaming: Fast token streaming
- ✅ Tools: Sequential tool execution
- ❌ Memory: No conversation memory
- ❌ Multi-turn: Stateless conversations
- ✅ Parallel Tools: Limited support
- ❌ Reasoning: Direct responses
- ❌ Human-in-Loop: Not supported

**Pros:**
- Fast and lightweight
- Simple architecture
- Proven stability
- Direct provider integration
- Lower latency

**Cons:**
- No conversation memory
- Limited reasoning capabilities
- No multi-agent support
- Manual state management
- Limited extensibility

**Best For:**
- Quick responses
- Simple queries
- Single-turn interactions
- Performance-critical scenarios
- Minimal complexity requirements

---

### Agent 2 (LangGraph)

**Name:** Agent 2 (LangGraph)
**Description:** Advanced ReAct agent powered by LangGraph. Built for complex reasoning and multi-agent workflows.
**Version:** 1.0.0
**Status:** Beta 🧪

**Features:**
- ✅ Streaming: Token-by-token streaming
- ✅ Tools: Parallel tool execution + ReAct loops
- ✅ Memory: MemorySaver for conversation persistence
- ✅ Multi-turn: Full conversation context
- ✅ Parallel Tools: Advanced orchestration
- ✅ Reasoning: ReAct pattern (Thought → Action → Observation)
- ✅ Human-in-Loop: Interrupt support (future)

**Pros:**
- Conversation memory (checkpointing)
- ReAct reasoning pattern
- Multi-agent orchestration ready
- Advanced tool execution
- Human-in-the-loop support
- Plan-and-execute patterns
- Self-correction capabilities
- Extensible architecture

**Cons:**
- Slightly higher latency
- More complex architecture
- Larger memory footprint
- Beta status
- Requires Node.js polyfills in browser

**Best For:**
- Complex multi-step tasks
- Conversational interactions
- Tool-heavy workflows
- Research and analysis
- Autonomous development
- Multi-agent scenarios

---

## Configuration System

### AgentSettings Interface

```typescript
export interface AgentSettings {
  // Global agent selection
  defaultAgent: AgentType; // 'agent1' | 'agent2'

  // Agent 1 (Custom) Settings
  agent1: {
    enabled: boolean;
    config: {
      maxRetries: number;           // Retry attempts on failure
      timeout: number;              // Request timeout (ms)
      streamBufferSize: number;     // Token buffer size
      toolExecutionMode: 'sequential' | 'parallel';
      costTracking: boolean;        // Track token costs
      debugLogging: boolean;        // Enable debug logs
    };
  };

  // Agent 2 (LangGraph) Settings
  agent2: {
    enabled: boolean;
    config: {
      // Core LangGraph settings
      checkpointing: boolean;       // Enable conversation memory
      checkpointStorage: 'memory' | 'postgres' | 'redis';
      streamMode: 'values' | 'updates' | 'messages' | 'debug';

      // ReAct Agent settings
      maxIterations: number;        // Max reasoning loops
      agentType: 'react' | 'plan-execute' | 'reflection';
      reasoningVerbosity: 'minimal' | 'normal' | 'verbose';

      // Tool execution
      toolTimeout: number;          // Tool timeout (ms)
      maxParallelTools: number;     // Max concurrent tools
      toolRetryStrategy: 'none' | 'exponential' | 'linear';

      // Performance
      cacheEnabled: boolean;        // Enable LLM response caching
      cacheTTL: number;             // Cache time-to-live (ms)
      batchSize: number;            // Batch request size

      // Advanced
      interruptBefore: string[];    // Node names to interrupt before
      interruptAfter: string[];     // Node names to interrupt after
      customEvents: boolean;        // Emit custom events
      telemetry: boolean;           // Collect telemetry

      // Experimental
      multiAgent: boolean;          // Enable multi-agent orchestration
      hierarchicalAgents: boolean;  // Enable hierarchical agents
      selfCorrection: boolean;      // Enable self-correction
      planningDepth: number;        // Planning recursion depth
    };
  };

  // Comparison & Testing
  comparison: {
    enabled: boolean;               // Track comparisons
    mode: 'side-by-side' | 'sequential' | 'automatic';
    metricsTracking: boolean;       // Collect metrics
    autoSwitch: boolean;            // Auto-switch to better agent
    autoSwitchThreshold: number;    // Performance threshold (0-1)
  };

  // Telemetry & Analytics
  telemetry: {
    enabled: boolean;               // Collect telemetry
    collectMetrics: boolean;        // Track performance metrics
    sendAnalytics: boolean;         // Send to analytics endpoint
    metricsEndpoint?: string;       // Optional endpoint URL
  };
}
```

### Default Settings

```typescript
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  defaultAgent: 'agent1', // Start with stable agent

  agent1: {
    enabled: true,
    config: {
      maxRetries: 3,
      timeout: 30000,
      streamBufferSize: 1024,
      toolExecutionMode: 'sequential',
      costTracking: true,
      debugLogging: false,
    },
  },

  agent2: {
    enabled: true,
    config: {
      checkpointing: true,
      checkpointStorage: 'memory',
      streamMode: 'values',

      maxIterations: 10,
      agentType: 'react',
      reasoningVerbosity: 'normal',

      toolTimeout: 30000,
      maxParallelTools: 3,
      toolRetryStrategy: 'exponential',

      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      batchSize: 1,

      interruptBefore: [],
      interruptAfter: [],
      customEvents: true,
      telemetry: true,

      multiAgent: false,
      hierarchicalAgents: false,
      selfCorrection: false,
      planningDepth: 3,
    },
  },

  comparison: {
    enabled: false,
    mode: 'side-by-side',
    metricsTracking: true,
    autoSwitch: false,
    autoSwitchThreshold: 0.2, // 20% performance difference
  },

  telemetry: {
    enabled: true,
    collectMetrics: true,
    sendAnalytics: false,
    metricsEndpoint: undefined,
  },
};
```

---

## Usage Guide

### Initialization

```typescript
import { agentConfigActions } from '@/stores/agentConfigStore';
import { getAgentService } from '@/services/agent/agentService';

// Initialize agent configuration (called once at app startup)
await agentConfigActions.initialize();

// Initialize agent service
const agentService = getAgentService();
await agentService.initialize('/path/to/workspace');
```

### Selecting an Agent

```typescript
// Select Agent 1 (Custom)
agentConfigActions.selectAgent('agent1');

// Select Agent 2 (LangGraph)
agentConfigActions.selectAgent('agent2');

// Get currently selected agent
const selectedAgent = agentConfigStore.getSelectedAgent();
console.log('Current agent:', selectedAgent); // 'agent1' or 'agent2'
```

### Using React Hooks

```typescript
import { useAgentConfig, useAgentSettings, useSelectedAgent } from '@/stores/agentConfigStore';

function AgentSettingsPanel() {
  const { settings, metrics, comparisons } = useAgentConfig();
  const selectedAgent = useSelectedAgent();

  return (
    <div>
      <h2>Current Agent: {selectedAgent === 'agent1' ? 'Agent 1 (Custom)' : 'Agent 2 (LangGraph)'}</h2>
      <p>Agent 1 Enabled: {settings.agent1.enabled ? 'Yes' : 'No'}</p>
      <p>Agent 2 Enabled: {settings.agent2.enabled ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Updating Configuration

```typescript
// Update Agent 1 configuration
agentConfigActions.updateAgent1Config({
  maxRetries: 5,
  timeout: 60000,
  debugLogging: true,
});

// Update Agent 2 configuration
agentConfigActions.updateAgent2Config({
  maxIterations: 15,
  reasoningVerbosity: 'verbose',
  multiAgent: true,
  selfCorrection: true,
});

// Toggle agents
agentConfigActions.toggleAgentEnabled('agent1', false);
agentConfigActions.toggleAgentEnabled('agent2', true);

// Update comparison settings
agentConfigActions.updateComparisonSettings({
  enabled: true,
  mode: 'side-by-side',
  autoSwitch: true,
  autoSwitchThreshold: 0.15,
});
```

### Sending Messages

```typescript
const sessionId = await agentService.createSession({
  name: 'Test Session',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
  systemPrompt: 'You are a helpful coding assistant.',
});

// Send message (routing happens automatically based on selected agent)
await agentService.sendMessage({
  sessionId,
  content: 'Explain the difference between React.memo and useMemo',
  onToken: (token) => console.log('Token:', token),
  onComplete: (message) => console.log('Complete:', message.content),
  enableTools: true,
});

// Console output will show which agent was used:
// [AgentService] Using Agent 1 (Custom) - explicitly selected
// OR
// [AgentService] Using Agent 2 (LangGraph) - explicitly selected
```

---

## Routing Logic

AgentService automatically determines which agent to use based on a **priority system**:

### Priority 1: Explicit Selection (if enabled)

```typescript
// If user explicitly selected Agent 2 AND Agent 2 is enabled
if (selectedAgent === 'agent2' && settings.agent2.enabled) {
  useAgent2 = true;
}

// If user explicitly selected Agent 1 AND Agent 1 is enabled
else if (selectedAgent === 'agent1' && settings.agent1.enabled) {
  useAgent2 = false;
}
```

### Priority 2: Fallback (if selected agent is disabled)

```typescript
// If Agent 1 selected but disabled, fallback to Agent 2 (if enabled)
else if (selectedAgent === 'agent1' && !settings.agent1.enabled && settings.agent2.enabled) {
  useAgent2 = true;
  console.log('Fallback to Agent 2 - Agent 1 disabled');
}

// If Agent 2 selected but disabled, fallback to Agent 1 (if enabled)
else if (selectedAgent === 'agent2' && !settings.agent2.enabled && settings.agent1.enabled) {
  useAgent2 = false;
  console.log('Fallback to Agent 1 - Agent 2 disabled');
}
```

### Priority 3: Legacy Feature Flag (backward compatibility)

```typescript
// Support old LangGraph feature flag for backward compatibility
else if (canUseLangGraph() && settings.agent2.enabled) {
  useAgent2 = true;
  console.log('Using Agent 2 - feature flag enabled');
}
```

### Routing Visualization

```
┌─────────────────────────────────────────────────────────────┐
│               sendMessage() called                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────┐
        │ Get settings and selected agent   │
        └───────────────────────────────────┘
                            ↓
        ┌────────────────────────────────────────────────┐
        │ Priority 1: Check explicit selection           │
        │ - selectedAgent === 'agent2' && enabled?       │
        │ - selectedAgent === 'agent1' && enabled?       │
        └────────────────────────────────────────────────┘
                    ↙                        ↘
            Match found?                 No match
                  ↓                            ↓
        ┌───────────────────┐    ┌──────────────────────────┐
        │  Route to agent   │    │ Priority 2: Check fallback│
        └───────────────────┘    │ - Selected disabled?      │
                                 │ - Other agent enabled?    │
                                 └──────────────────────────┘
                                         ↙            ↘
                                   Match found?    No match
                                        ↓               ↓
                            ┌───────────────────┐  ┌─────────────────┐
                            │  Route to agent   │  │ Priority 3:     │
                            └───────────────────┘  │ Feature flag    │
                                                   └─────────────────┘
                                                           ↓
                                                   ┌───────────────────┐
                                                   │  Route to agent   │
                                                   └───────────────────┘
```

---

## Metrics & Comparison

### Recording Metrics

```typescript
import { agentConfigActions } from '@/stores/agentConfigStore';

// Record metrics after message completion
agentConfigActions.recordMetrics({
  agentType: 'agent2',
  sessionId: 'session-123',
  latency: {
    firstToken: 250,      // ms to first token
    totalResponse: 3200,  // ms to completion
    toolExecution: 800,   // ms in tool execution
  },
  tokens: {
    prompt: 150,
    completion: 420,
    total: 570,
  },
  cost: 0.00285,
  successRate: 1.0,
  errorRate: 0.0,
  toolSuccessRate: 1.0,
  streamingQuality: 95,  // 0-100
  responseQuality: 90,   // 0-100
  timestamp: Date.now(),
});
```

### Comparing Agents

```typescript
// Record comparison result
agentConfigActions.recordComparison({
  sessionId: 'comparison-123',
  prompt: 'Explain recursion',
  agent1Result: {
    response: '...',
    metrics: { /* Agent 1 metrics */ },
    success: true,
  },
  agent2Result: {
    response: '...',
    metrics: { /* Agent 2 metrics */ },
    success: true,
  },
  comparison: {
    winner: 'agent2',
    latencyDiff: -200,      // Agent 2 was 200ms faster
    costDiff: 0.0005,       // Agent 2 cost $0.0005 more
    qualityDiff: 15,        // Agent 2 scored 15 points higher
    recommendation: 'Use Agent 2 for complex reasoning tasks',
  },
  timestamp: Date.now(),
});
```

### Viewing Metrics

```typescript
// Get all metrics for an agent
const agent2Metrics = agentConfigStore.getMetrics('agent2');

// Get aggregated statistics
const stats = agentConfigStore.getAggregatedMetrics('agent2');
console.log('Average latency:', stats.avgLatency);
console.log('Total cost:', stats.totalCost);
console.log('Success rate:', stats.successRate);

// Get comparison statistics
const comparisonStats = agentConfigStore.getComparisonStats();
console.log('Agent 1 wins:', comparisonStats.agent1Wins);
console.log('Agent 2 wins:', comparisonStats.agent2Wins);
console.log('Ties:', comparisonStats.ties);
```

---

## Migration Strategies

### Strategy 1: Keep Both Agents (Recommended)

**Use Case:** Maximize flexibility, different agents for different tasks

**Implementation:**
- Keep both Agent 1 and Agent 2 enabled
- Use Agent 1 for simple queries (faster)
- Use Agent 2 for complex tasks (smarter)
- Provide UI toggle for users to switch

**Pros:**
- Maximum flexibility
- Best tool for each job
- User preference respected
- No vendor lock-in

**Cons:**
- Larger bundle size
- More maintenance overhead
- Potential confusion for users

---

### Strategy 2: Phase Out Agent 1 (AI SDK)

**Use Case:** Agent 2 (LangGraph) proves superior in all scenarios

**Implementation:**
1. **Week 1-2**: Enable comparison mode, collect metrics
2. **Week 3-4**: Default to Agent 2, keep Agent 1 as fallback
3. **Month 2**: Disable Agent 1, remove from UI
4. **Month 3**: Remove AI SDK dependencies, cleanup code

**Pros:**
- Simpler architecture (single agent)
- Smaller bundle size
- Less maintenance
- Advanced features (memory, reasoning)

**Cons:**
- Slightly higher latency
- Larger memory footprint
- Beta stability concerns

---

### Strategy 3: Phase Out Agent 2 (LangGraph)

**Use Case:** Agent 1 proves sufficient, LangGraph overhead not justified

**Implementation:**
1. **Week 1-2**: Test Agent 1 extensively
2. **Week 3-4**: Default to Agent 1, disable Agent 2
3. **Month 2**: Remove LangGraph from UI
4. **Month 3**: Remove LangGraph dependencies, cleanup code

**Pros:**
- Simpler architecture
- Lower latency
- Smaller bundle size
- Proven stability

**Cons:**
- No conversation memory
- Limited reasoning
- No multi-agent support
- Less extensible

---

## API Reference

### agentConfigActions

```typescript
// Initialize
await agentConfigActions.initialize();

// Settings Management
agentConfigActions.updateSettings(settings: Partial<AgentSettings>);
agentConfigActions.setDefaultAgent(agent: AgentType);
agentConfigActions.selectAgent(agent: AgentType);

// Agent Configuration
agentConfigActions.toggleAgentEnabled(agent: AgentType, enabled: boolean);
agentConfigActions.updateAgent1Config(config: Partial<Agent1Config>);
agentConfigActions.updateAgent2Config(config: Partial<Agent2Config>);
agentConfigActions.updateComparisonSettings(settings: Partial<ComparisonSettings>);
agentConfigActions.updateTelemetrySettings(settings: Partial<TelemetrySettings>);

// Metrics
agentConfigActions.recordMetrics(metrics: AgentMetrics);
agentConfigActions.clearMetrics(agent?: AgentType);

// Comparisons
agentConfigActions.recordComparison(comparison: AgentComparison);
agentConfigActions.clearComparisons();
```

### agentConfigStore

```typescript
// State Access
agentConfigStore.subscribe(listener: () => void): () => void;
agentConfigStore.getState(): AgentConfigState;
agentConfigStore.getSettings(): AgentSettings;
agentConfigStore.getSelectedAgent(): AgentType;
agentConfigStore.getAgentProfile(agent: AgentType): AgentProfile;

// Metrics
agentConfigStore.getMetrics(agent: AgentType): AgentMetrics[];
agentConfigStore.getAggregatedMetrics(agent: AgentType): AggregatedMetrics;

// Comparisons
agentConfigStore.getAllComparisons(): AgentComparison[];
agentConfigStore.getLatestComparison(): AgentComparison | null;
agentConfigStore.getComparisonStats(): ComparisonStats;
```

### React Hooks

```typescript
// Get full state
function useAgentConfig(): AgentConfigState;

// Get settings only
function useAgentSettings(): AgentSettings;

// Get selected agent only
function useSelectedAgent(): AgentType;
```

---

## Best Practices

### 1. Start with Agent 1 (Default)

Agent 1 is stable and fast. Use it for initial testing and simple queries.

```typescript
// Default configuration (Agent 1)
const sessionId = await agentService.createSession({
  name: 'Quick Test',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
});
```

### 2. Use Agent 2 for Complex Tasks

Switch to Agent 2 for multi-turn conversations and complex reasoning.

```typescript
// Switch to Agent 2 for complex work
agentConfigActions.selectAgent('agent2');

// Multi-turn conversation with memory
await agentService.sendMessage({
  sessionId,
  content: 'What are the key principles of React?',
});

// Context is preserved!
await agentService.sendMessage({
  sessionId,
  content: 'Can you elaborate on the first principle?',
});
```

### 3. Enable Metrics for Decision Making

Track performance to make informed decisions about which agent to use.

```typescript
agentConfigActions.updateTelemetrySettings({
  enabled: true,
  collectMetrics: true,
});

agentConfigActions.updateComparisonSettings({
  enabled: true,
  metricsTracking: true,
});
```

### 4. Test Both Agents with Same Queries

Run identical queries through both agents to compare results.

```typescript
// Test Agent 1
agentConfigActions.selectAgent('agent1');
await agentService.sendMessage({ sessionId, content: testQuery });

// Test Agent 2
agentConfigActions.selectAgent('agent2');
await agentService.sendMessage({ sessionId, content: testQuery });

// Compare metrics
const stats = agentConfigStore.getComparisonStats();
```

### 5. Provide User Control

Let users choose their preferred agent based on their needs.

```typescript
// Settings UI component
function AgentSelector() {
  const selectedAgent = useSelectedAgent();

  return (
    <select
      value={selectedAgent}
      onChange={(e) => agentConfigActions.selectAgent(e.target.value)}
    >
      <option value="agent1">Agent 1 (Fast)</option>
      <option value="agent2">Agent 2 (Smart)</option>
    </select>
  );
}
```

### 6. Monitor Console Logs

AgentService logs which agent is being used for each request.

```
[AgentService] Using Agent 1 (Custom) - explicitly selected
[AgentService] Using Agent 2 (LangGraph) - explicitly selected
[AgentService] Fallback to Agent 2 (LangGraph) - Agent 1 disabled
```

### 7. Handle Edge Cases

Ensure graceful fallback when agents are disabled.

```typescript
// Check if any agent is available
const settings = agentConfigStore.getSettings();
if (!settings.agent1.enabled && !settings.agent2.enabled) {
  throw new Error('No agents available. Please enable at least one agent.');
}
```

---

## Summary

The **Dual-Agent System** provides:

✅ **Flexibility**: Choose the right agent for each task
✅ **Reliability**: Automatic fallback if one agent fails
✅ **Performance**: Track metrics to optimize usage
✅ **Future-Proof**: Easy to deprecate either agent later
✅ **User Control**: Let users select their preferred agent

**Next Steps:**
1. Test both agents with your use cases
2. Collect metrics and performance data
3. Decide on migration strategy (keep both, phase out one)
4. Implement UI for agent selection (optional)

**Questions?**
- See [LANGGRAPH_MIGRATION.md](./LANGGRAPH_MIGRATION.md) for Agent 2 details
- See [LANGGRAPH_TESTING_GUIDE.md](./LANGGRAPH_TESTING_GUIDE.md) for testing procedures
- Check console logs for routing decisions

**Ready to use!** 🚀
