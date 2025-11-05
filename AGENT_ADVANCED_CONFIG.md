# Advanced Agent Configuration Guide

**Last Updated**: November 2025

---

## Overview

This guide covers advanced configuration options for the Rainy Aether agent system, including parallel tool execution, structured output, and performance optimization.

---

## Configuration Interface

```typescript
interface AgentConfig {
  // === Core Parameters ===
  temperature: number;           // 0.0-2.0, randomness in responses
  maxTokens: number;             // Maximum tokens to generate
  topP?: number;                 // 0.0-1.0, nucleus sampling
  frequencyPenalty?: number;     // -2.0 to 2.0, reduce repetition
  presencePenalty?: number;      // -2.0 to 2.0, encourage diversity
  seed?: number;                 // For reproducible outputs

  // === Advanced Features ===
  parallelToolCalls?: boolean;     // Enable parallel tool execution
  maxToolCalls?: number;           // Limit tool call rounds
  toolTimeout?: number;            // Timeout for tool execution (ms)
  user?: string;                   // User identifier for tracking

  // === Structured Output ===
  responseFormat?: 'text' | 'json_object' | 'json_schema';
  responseSchema?: Record<string, unknown>; // JSON schema for validation

  // === System ===
  systemPrompt?: string;           // System instructions
}
```

---

## Core Parameters

### Temperature

**Range**: 0.0 - 2.0
**Default**: 0.7

Controls randomness in responses:

- **0.0 - 0.3**: Deterministic, focused, factual
- **0.4 - 0.7**: Balanced, natural conversation
- **0.8 - 1.2**: Creative, varied responses
- **1.3 - 2.0**: Very creative, experimental

**Examples**:

```typescript
// Code generation (precise)
config: { temperature: 0.2 }

// Creative writing
config: { temperature: 1.0 }

// Brainstorming
config: { temperature: 1.5 }
```

---

### maxTokens

**Range**: 1 - model.maxOutputTokens
**Default**: 4096

Maximum tokens in response. Choose based on task:

| Task Type | Recommended maxTokens |
|-----------|---------------------|
| Quick query | 500-1000 |
| Code snippet | 1000-2000 |
| Function with docs | 2000-4000 |
| Complex refactoring | 4000-8000 |
| Entire file generation | 8000-16000 |
| Multi-file analysis | 16000+ (MAX tier) |

**Important**: Higher maxTokens = higher cost and latency

```typescript
// Optimize for cost
config: { maxTokens: 1000 }

// Allow comprehensive response
config: { maxTokens: 8000 }

// MAX tier only
config: { maxTokens: 16384 }
```

---

### topP (Nucleus Sampling)

**Range**: 0.0 - 1.0
**Default**: 1.0

Alternative to temperature for controlling randomness:

- **0.1**: Very focused, top 10% probability tokens
- **0.5**: Moderately focused
- **0.9**: Diverse but coherent
- **1.0**: Full distribution

**Use with temperature**:

```typescript
// Highly focused
config: {
  temperature: 0.3,
  topP: 0.5,
}

// Creative but coherent
config: {
  temperature: 0.9,
  topP: 0.95,
}
```

---

### Frequency Penalty

**Range**: -2.0 to 2.0
**Default**: 0.0

Penalizes tokens based on frequency in output:

- **Positive values**: Reduce repetition
- **Negative values**: Allow more repetition
- **0**: No penalty

```typescript
// Reduce repetitive code patterns
config: { frequencyPenalty: 0.5 }

// Avoid code duplication
config: { frequencyPenalty: 1.0 }
```

---

### Presence Penalty

**Range**: -2.0 to 2.0
**Default**: 0.0

Penalizes tokens based on presence in output:

- **Positive values**: Encourage topic diversity
- **Negative values**: Allow focusing on topic
- **0**: No penalty

```typescript
// Encourage exploring multiple approaches
config: { presencePenalty: 0.6 }

// Stay focused on one topic
config: { presencePenalty: -0.3 }
```

---

## Advanced Features

### Parallel Tool Calls

**Type**: boolean
**Default**: true (if model supports)
**Models**: MAX tier only

Enables simultaneous execution of multiple tools:

```typescript
// Enable parallel execution (MAX tier)
config: {
  parallelToolCalls: true,
  maxToolCalls: 20,
  toolTimeout: 60000, // 60 seconds
}

// Example: Analyze 5 files simultaneously
await agentService.sendMessage({
  sessionId,
  content: 'Analyze files A, B, C, D, E in parallel',
  config: { parallelToolCalls: true },
  tools: [
    {
      name: 'analyze_file',
      description: 'Analyze a source file',
      parameters: { /* schema */ },
    },
  ],
});
```

**Benefits**:

- 5-10x faster for batch operations
- Better for complex workflows
- Reduces total API calls

**Trade-offs**:

- Higher cost per call
- Only available on MAX tier
- Adds complexity

---

### maxToolCalls

**Type**: number
**Default**: 10

Limits the number of tool call rounds:

```typescript
// Simple task
config: { maxToolCalls: 3 }

// Complex multi-step workflow
config: { maxToolCalls: 20 }

// Prevent runaway tool calls
config: { maxToolCalls: 5 }
```

**Best Practices**:

- Set based on expected complexity
- Lower for cost optimization
- Higher for autonomous agents

---

### toolTimeout

**Type**: number (milliseconds)
**Default**: 30000 (30s)

Maximum time for tool execution:

```typescript
// Quick tools (file reads)
config: { toolTimeout: 10000 } // 10s

// Standard tools
config: { toolTimeout: 30000 } // 30s

// Long-running (builds, tests)
config: { toolTimeout: 120000 } // 2 minutes
```

---

### Structured Output

#### JSON Object Mode

**Models**: MAX tier only

Forces response to be valid JSON:

```typescript
config: {
  responseFormat: 'json_object',
}

// Example response:
// {
//   "analysis": "...",
//   "suggestions": ["...", "..."],
//   "confidence": 0.95
// }
```

#### JSON Schema Mode

**Models**: MAX tier only

Guarantees response matches specific schema:

```typescript
config: {
  responseFormat: 'json_schema',
  responseSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            completed: { type: 'boolean' },
          },
          required: ['name', 'completed'],
        },
      },
    },
    required: ['title', 'description', 'priority', 'tasks'],
  },
}

// Response GUARANTEED to match schema
```

**Use Cases**:

- Extracting structured data
- API response generation
- Database record creation
- Configuration file generation

---

## Configuration Presets

### Quick Query (Speed-Optimized)

```typescript
const quickQueryConfig: AgentConfig = {
  temperature: 0.3,
  maxTokens: 1000,
  topP: 0.8,
  parallelToolCalls: false,
};

// Use with SPEED tier
await createSession({
  modelId: 'llama-3.1-8b-instant',
  config: quickQueryConfig,
});
```

---

### Code Generation (Balanced)

```typescript
const codeGenConfig: AgentConfig = {
  temperature: 0.5,
  maxTokens: 4000,
  topP: 0.9,
  frequencyPenalty: 0.3, // Reduce repetitive patterns
  presencePenalty: 0.1,
};

// Use with QUALITY tier
await createSession({
  modelId: 'llama-3.1-70b-versatile',
  config: codeGenConfig,
});
```

---

### Creative Brainstorming

```typescript
const creativConfig: AgentConfig = {
  temperature: 1.2,
  maxTokens: 6000,
  topP: 0.95,
  presencePenalty: 0.6, // Encourage diversity
  frequencyPenalty: 0.5, // Reduce repetition
};

// Use with PREMIUM tier
await createSession({
  modelId: 'llama-3.3-70b-versatile',
  config: creativeConfig,
});
```

---

### Autonomous Agent (MAX Tier)

```typescript
const autonomousConfig: AgentConfig = {
  temperature: 0.7,
  maxTokens: 16384,
  parallelToolCalls: true,
  maxToolCalls: 30,
  toolTimeout: 120000,
  responseFormat: 'json_object',
  user: 'agent-session-123',
};

// Use with MAX tier
await createSession({
  modelId: 'moonshotai/kimi-k2-instruct-0905',
  config: autonomousConfig,
  systemPrompt: 'You are an autonomous coding agent...',
});
```

---

### Structured Data Extraction (MAX Tier)

```typescript
const extractionConfig: AgentConfig = {
  temperature: 0.2, // Deterministic
  maxTokens: 8000,
  responseFormat: 'json_schema',
  responseSchema: {
    type: 'object',
    properties: {
      functions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            params: { type: 'array', items: { type: 'string' } },
            returnType: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'params', 'returnType'],
        },
      },
    },
    required: ['functions'],
  },
};

// Extract function signatures from code
await agentService.sendMessage({
  sessionId,
  content: 'Extract all function signatures from this TypeScript file',
  config: extractionConfig,
});
```

---

## Dynamic Configuration

### Adjust Based on Task Complexity

```typescript
function getConfigForTask(task: string): AgentConfig {
  const complexity = estimateComplexity(task);

  if (complexity === 'simple') {
    return {
      temperature: 0.3,
      maxTokens: 1000,
    };
  } else if (complexity === 'medium') {
    return {
      temperature: 0.6,
      maxTokens: 4000,
    };
  } else {
    return {
      temperature: 0.8,
      maxTokens: 16384,
      parallelToolCalls: true,
    };
  }
}
```

---

### Adjust Based on User Preferences

```typescript
interface UserPreferences {
  verbosity: 'concise' | 'detailed' | 'comprehensive';
  creativity: 'conservative' | 'balanced' | 'creative';
  speed: 'fast' | 'balanced' | 'thorough';
}

function getUserConfig(prefs: UserPreferences): AgentConfig {
  const maxTokensMap = {
    concise: 1000,
    detailed: 4000,
    comprehensive: 8000,
  };

  const temperatureMap = {
    conservative: 0.3,
    balanced: 0.7,
    creative: 1.2,
  };

  return {
    temperature: temperatureMap[prefs.creativity],
    maxTokens: maxTokensMap[prefs.verbosity],
    // Speed preference affects model tier selection
  };
}
```

---

## Performance Optimization

### Token Budget Management

```typescript
class TokenBudget {
  private used = 0;
  private limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  canAfford(tokens: number): boolean {
    return this.used + tokens <= this.limit;
  }

  allocate(task: string): number {
    const estimates = {
      simple: 1000,
      medium: 4000,
      complex: 8000,
    };

    const estimated = estimates[estimateComplexity(task)];
    if (this.canAfford(estimated)) {
      this.used += estimated;
      return estimated;
    }

    return Math.max(500, this.limit - this.used);
  }
}

// Usage
const budget = new TokenBudget(50000); // 50k token budget
const maxTokens = budget.allocate(task);
```

---

### Caching System Prompts

```typescript
const systemPrompts = {
  codingAssistant: 'You are a helpful coding assistant...',
  codeReviewer: 'You are an experienced code reviewer...',
  refactoringExpert: 'You specialize in code refactoring...',
};

function createOptimizedSession(type: keyof typeof systemPrompts) {
  return agentActions.createSession({
    systemPrompt: systemPrompts[type],
    // System prompt is sent only once per session
  });
}
```

---

## Error Handling

### Timeout Handling

```typescript
async function sendWithRetry(options: SendMessageOptions) {
  const config = options.config || {};

  try {
    await agentService.sendMessage({
      ...options,
      config: {
        ...config,
        toolTimeout: 30000,
      },
    });
  } catch (error) {
    if (error.message.includes('timeout')) {
      // Retry with longer timeout
      await agentService.sendMessage({
        ...options,
        config: {
          ...config,
          toolTimeout: 60000,
        },
      });
    } else {
      throw error;
    }
  }
}
```

---

### Tool Call Limiting

```typescript
function createSafeConfig(userConfig: Partial<AgentConfig>): AgentConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    maxToolCalls: Math.min(userConfig.maxToolCalls || 10, 50), // Cap at 50
    toolTimeout: Math.min(userConfig.toolTimeout || 30000, 300000), // Cap at 5 min
  };
}
```

---

## Best Practices

### 1. Start Conservative

Begin with lower maxTokens and temperature, increase as needed

### 2. Use Structured Output for Extraction

When parsing data, use json_schema mode for reliability

### 3. Enable Parallel Tools for Batch Operations

Leverage MAX tier for simultaneous file operations

### 4. Set Appropriate Timeouts

Balance between allowing time and preventing hangs

### 5. Track Usage

Monitor token usage to optimize configuration

### 6. Profile Different Configs

A/B test configurations to find optimal settings

---

## Testing Configurations

### Configuration Test Suite

```typescript
const testConfigs = {
  minimal: { temperature: 0.1, maxTokens: 500 },
  standard: { temperature: 0.7, maxTokens: 4000 },
  maximum: { temperature: 1.5, maxTokens: 16384, parallelToolCalls: true },
};

for (const [name, config] of Object.entries(testConfigs)) {
  const result = await testConfiguration(config);
  console.log(`${name}: ${result.quality}, ${result.cost}, ${result.latency}`);
}
```

---

## Migration Guide

### From Default to Advanced

```typescript
// Before (default)
await createSession({
  modelId: 'llama-3.3-70b-versatile',
});

// After (optimized)
await createSession({
  modelId: 'llama-3.3-70b-versatile',
  config: {
    temperature: 0.6,
    maxTokens: 6000,
    topP: 0.9,
    frequencyPenalty: 0.3,
  },
});
```

### Enabling Advanced Features

```typescript
// Before (standard)
config: {
  temperature: 0.7,
  maxTokens: 4000,
}

// After (MAX tier with parallel tools)
model: 'moonshotai/kimi-k2-instruct-0905',
config: {
  temperature: 0.7,
  maxTokens: 16384,
  parallelToolCalls: true,
  responseFormat: 'json_object',
}
```

---

**Last Updated**: November 2025
**See Also**:

- [AGENT_MODEL_TIERS.md](AGENT_MODEL_TIERS.md) - Model tier guide
- [AGENT_IMPLEMENTATION_GUIDE.md](AGENT_IMPLEMENTATION_GUIDE.md) - Implementation guide
