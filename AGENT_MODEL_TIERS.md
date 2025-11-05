# Agent Model Tiers & Pricing Guide

**Last Updated**: November 2025
**Provider**: Groq (Initial Implementation)

---

## Overview

Rainy Aether's agent system features a **tiered model system** to balance performance, features, and cost. Each tier is optimized for specific use cases.

---

## Tier Classification

### 🔥 MAX Tier - Ultra-Premium

**For**: Complex analysis, autonomous agents, parallel tool execution

Ultra-premium models with cutting-edge features:

- **Massive context windows** (256k+ tokens)
- **Parallel tool calls** (execute multiple tools simultaneously)
- **Structured output** (JSON schema, guaranteed format)
- **Advanced reasoning** (multi-step planning)

**Best For**:

- Analyzing entire large codebases
- Multi-file refactoring
- Complex autonomous workflows
- Parallel agent execution
- Tool orchestration

**Trade-offs**:

- Higher cost per token
- Slightly higher latency (~1-1.5s first token)
- Best ROI for complex tasks

---

### 💎 PREMIUM Tier - High Performance

**For**: General-purpose development, advanced coding

High-quality models with excellent capabilities:

- **Large context windows** (128k tokens)
- **Standard tool calling**
- **Strong reasoning**
- **Broad knowledge**

**Best For**:

- General development tasks
- Code generation and analysis
- Multi-turn conversations
- Complex explanations

**Trade-offs**:

- Moderate cost
- Good latency (~0.8-1s first token)
- Excellent balance

---

### ⭐ QUALITY Tier - Best Balance

**For**: Complex tasks without needing max features

Well-rounded models offering great value:

- **Large context windows** (128k tokens)
- **Tool calling support**
- **Good reasoning**
- **Lower cost than premium**

**Best For**:

- Complex coding tasks
- Multi-turn reasoning
- Code review and analysis
- General assistance

**Trade-offs**:

- Similar performance to premium
- Lower cost
- Great for most use cases

---

### ⚖️ BALANCED Tier - Efficient Performance

**For**: General coding, explanations

Efficient models with good capabilities:

- **Medium context windows** (32k tokens)
- **Tool calling**
- **Mixture of experts architecture**

**Best For**:

- General coding assistance
- Code explanations
- Analysis tasks
- Documentation

**Trade-offs**:

- Very efficient
- Good performance
- Lower cost

---

### ⚡ SPEED Tier - Ultra-Fast

**For**: Quick queries, autocomplete, simple tasks

Lightning-fast models optimized for speed:

- **Large context** (128k tokens)
- **Sub-second responses** (<500ms first token)
- **Tool calling**
- **Very low cost**

**Best For**:

- Quick questions
- Autocomplete
- Simple code snippets
- Rapid iterations
- Testing

**Trade-offs**:

- Lower reasoning capability
- Best for simple tasks
- Extremely fast

---

### 💰 COST Tier - Budget-Friendly

**For**: Testing, learning, simple queries

Most economical option:

- **Small context** (8k tokens)
- **No tool calling**
- **Good for basic tasks**
- **Lowest cost**

**Best For**:

- Learning and experimentation
- Simple queries
- Testing workflows
- Budget-conscious usage

**Trade-offs**:

- Limited features
- Smaller context
- Best for simple use cases

---

## Model Comparison Table

| Model | Tier | Context | Output | Tools | Parallel | JSON | Cost/1k (in/out) | Latency | Speed |
|-------|------|---------|--------|-------|----------|------|------------------|---------|-------|
| **Kimi K2 Instruct** | MAX | 256k | 16k | ✅ | ✅ | ✅ | $0.002/$0.004 | ~1.5s | 80 tok/s |
| **Llama 4 Maverick 17B** | MAX | 128k | 32k | ✅ | ✅ | ✅ | $0.0015/$0.003 | ~1.2s | 100 tok/s |
| **Llama 3.3 70B** | PREMIUM | 128k | 32k | ✅ | ❌ | ❌ | $0.00059/$0.00079 | ~0.8s | 120 tok/s |
| **Llama 3.1 70B** | QUALITY | 128k | 32k | ✅ | ❌ | ❌ | $0.00059/$0.00079 | ~0.85s | 115 tok/s |
| **Mixtral 8x7B** | BALANCED | 32k | 32k | ✅ | ❌ | ❌ | $0.00024/$0.00024 | ~0.7s | 130 tok/s |
| **Llama 3.1 8B** | SPEED | 128k | 8k | ✅ | ❌ | ❌ | $0.00005/$0.00008 | ~0.3s | 200 tok/s |
| **Gemma 2 9B** | COST | 8k | 8k | ❌ | ❌ | ❌ | $0.0002/$0.0002 | ~0.5s | 150 tok/s |

---

## Feature Matrix

### Advanced Features by Tier

| Feature | MAX | PREMIUM | QUALITY | BALANCED | SPEED | COST |
|---------|-----|---------|---------|----------|-------|------|
| **Context Window** | 128-256k | 128k | 128k | 32k | 128k | 8k |
| **Tool Calling** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Parallel Tools** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Structured Output** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **JSON Mode** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Streaming** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Max Output** | 16-32k | 32k | 32k | 32k | 8k | 8k |

---

## Use Case Recommendations

### When to Use MAX Tier

✅ **Use MAX when**:

- Analyzing codebases with 1000+ files
- Running parallel autonomous agents
- Need guaranteed JSON output format
- Complex multi-file refactoring
- Tool orchestration workflows
- Budget is not primary concern

❌ **Skip MAX when**:

- Simple queries or single-file edits
- Cost optimization is priority
- Standard tools are sufficient

**Example**: "Analyze this entire Next.js codebase, identify performance bottlenecks, and create a refactoring plan with parallel file modifications"

---

### When to Use PREMIUM Tier

✅ **Use PREMIUM when**:

- General development work
- Complex code generation
- Need strong reasoning
- Multi-turn conversations
- Good balance of cost/performance

❌ **Skip PREMIUM when**:

- Need advanced features (use MAX)
- Budget is tight (use QUALITY/SPEED)

**Example**: "Create a React component with TypeScript, proper error handling, and comprehensive tests"

---

### When to Use QUALITY Tier

✅ **Use QUALITY when**:

- Complex tasks with cost awareness
- Multi-turn reasoning needed
- Standard features sufficient
- Best value proposition

❌ **Skip QUALITY when**:

- Need cutting-edge features
- Ultra-fast response required

**Example**: "Review this pull request and suggest improvements"

---

### When to Use SPEED Tier

✅ **Use SPEED when**:

- Quick questions
- Autocomplete suggestions
- Simple code snippets
- Rapid prototyping
- Response time critical

❌ **Skip SPEED when**:

- Complex reasoning needed
- Large context required

**Example**: "What's the TypeScript syntax for generics?"

---

## Cost Optimization Strategies

### 1. Tier Cascading

Start with SPEED tier, escalate to higher tiers as needed:

```typescript
// Pseudo-code
async function smartQuery(question: string) {
  // Try SPEED tier first
  const response = await sendToAgent('speed', question);

  // If response is uncertain, escalate
  if (response.confidence < 0.8) {
    return await sendToAgent('quality', question);
  }

  return response;
}
```

### 2. Context-Aware Selection

```typescript
function selectTier(codebaseSize: number, complexity: 'simple' | 'complex') {
  if (codebaseSize > 1000 && complexity === 'complex') return 'max';
  if (complexity === 'complex') return 'premium';
  if (codebaseSize > 500) return 'quality';
  return 'speed';
}
```

### 3. Batching with MAX Tier

Use MAX tier for batch operations to leverage parallel tools:

```typescript
// Instead of 5 sequential calls to PREMIUM
// Use 1 call to MAX with parallel tool execution
await agentService.sendMessage({
  model: 'max',
  config: { parallelToolCalls: true },
  content: 'Analyze all 5 files and refactor simultaneously',
});
```

---

## Cost Examples

### Example 1: Simple Query (SPEED tier)

**Task**: "Explain async/await in JavaScript"

- Input tokens: ~50
- Output tokens: ~500
- Cost: $0.00005 × 0.05 + $0.00008 × 0.5 = **$0.00004** (~$0.04/1000 queries)

### Example 2: Code Generation (QUALITY tier)

**Task**: "Create a React component with tests"

- Input tokens: ~200
- Output tokens: ~2000
- Cost: $0.00059 × 0.2 + $0.00079 × 2 = **$0.00180** (~$1.80/1000 generations)

### Example 3: Codebase Analysis (MAX tier)

**Task**: "Analyze entire codebase and refactor 10 files in parallel"

- Input tokens: ~50,000 (large context)
- Output tokens: ~10,000 (comprehensive)
- Cost: $0.002 × 50 + $0.004 × 10 = **$0.14** (~$140/1000 analyses)

**Note**: MAX tier is expensive per call but can replace dozens of smaller calls through parallelization.

---

## Configuration Examples

### Speed-Optimized (Fast Iteration)

```typescript
const config: AgentConfig = {
  temperature: 0.3, // More deterministic
  maxTokens: 2000, // Shorter responses
  parallelToolCalls: false, // Not needed
};

// Use with SPEED tier
await createSession({
  modelId: 'llama-3.1-8b-instant',
  config,
});
```

### Quality-Optimized (Best Balance)

```typescript
const config: AgentConfig = {
  temperature: 0.7,
  maxTokens: 8000,
  parallelToolCalls: false,
  topP: 0.95,
};

// Use with QUALITY tier
await createSession({
  modelId: 'llama-3.1-70b-versatile',
  config,
});
```

### MAX-Optimized (Advanced Features)

```typescript
const config: AgentConfig = {
  temperature: 0.8, // More creative
  maxTokens: 16384, // Maximum output
  parallelToolCalls: true, // Enable parallel execution
  maxToolCalls: 20, // Allow many tool calls
  responseFormat: 'json_object', // Structured output
  user: 'user-123', // Tracking
};

// Use with MAX tier
await createSession({
  modelId: 'moonshotai/kimi-k2-instruct-0905',
  config,
});
```

---

## Parallel Tools Example (MAX Tier Only)

```typescript
// Define tools
const tools = [
  {
    name: 'analyze_file',
    description: 'Analyze a source file',
    parameters: { /* schema */ },
  },
  {
    name: 'refactor_file',
    description: 'Refactor a file',
    parameters: { /* schema */ },
  },
  {
    name: 'run_tests',
    description: 'Execute tests',
    parameters: { /* schema */ },
  },
];

// Send message with parallel tools enabled
await agentService.sendMessage({
  sessionId,
  content: 'Analyze files A, B, C and refactor them simultaneously',
  config: {
    parallelToolCalls: true, // KEY: Enables parallel execution
    maxToolCalls: 10,
  },
  tools, // Provide available tools
});

// Model will execute multiple tool calls IN PARALLEL:
// - analyze_file(A), analyze_file(B), analyze_file(C)
// - refactor_file(A), refactor_file(B), refactor_file(C)
// All happening simultaneously instead of sequentially
```

---

## Performance Comparison

### Sequential vs Parallel Execution

**Scenario**: Refactor 5 files

**PREMIUM Tier (Sequential)**:

- Call 1: Analyze file 1 (~2s)
- Call 2: Refactor file 1 (~3s)
- Call 3-10: Repeat for 5 files
- **Total time**: ~25 seconds
- **Cost**: 5 × $0.002 = $0.01

**MAX Tier (Parallel)**:

- Call 1: Analyze ALL 5 files in parallel (~2s)
- Call 2: Refactor ALL 5 files in parallel (~3s)
- **Total time**: ~5 seconds (5x faster!)
- **Cost**: 1 × $0.14 = $0.14

**When Parallel Wins**: Complex workflows, multiple files, time-sensitive tasks
**When Sequential Wins**: Simple tasks, cost optimization, single-file edits

---

## Tier Migration Guide

### From COST to SPEED

When you need tool calling:

```typescript
// Before
model: 'gemma2-9b-it' // No tools

// After
model: 'llama-3.1-8b-instant' // Tools + faster
```

### From SPEED to QUALITY

When you need better reasoning:

```typescript
// Before (simple)
model: 'llama-3.1-8b-instant'

// After (complex)
model: 'llama-3.1-70b-versatile'
```

### From QUALITY to MAX

When you need advanced features:

```typescript
// Before
model: 'llama-3.1-70b-versatile'
config: { parallelToolCalls: false }

// After
model: 'moonshotai/kimi-k2-instruct-0905'
config: {
  parallelToolCalls: true,
  responseFormat: 'json_object',
  maxTokens: 16384,
}
```

---

## Best Practices

### 1. Start Small, Scale Up

Begin with SPEED/COST tier, upgrade only when needed

### 2. Use MAX for Batch Operations

Leverage parallel tools to replace multiple calls

### 3. Configure maxTokens Appropriately

Don't over-provision:

- Simple queries: 500-1000 tokens
- Code generation: 2000-4000 tokens
- Complex analysis: 8000-16000 tokens

### 4. Enable Parallel Tools Only When Needed

Adds overhead if not utilized

### 5. Monitor Costs

Track usage by tier to optimize spend

---

## Future Roadmap

### Planned Additions

**More Providers**:

- OpenAI (GPT-4, GPT-4 Turbo)
- Anthropic (Claude 3.5 Sonnet, Opus)
- Rainy API (custom Enosis Labs models)

**Additional Tiers**:

- **ENTERPRISE**: On-premise models
- **CUSTOM**: Fine-tuned models

**Enhanced Features**:

- Auto-tier selection based on task
- Cost prediction before execution
- Tier recommendation engine

---

**Last Updated**: November 2025
**Next Review**: December 2025

For questions or suggestions, see [AGENT_IMPLEMENTATION_GUIDE.md](AGENT_IMPLEMENTATION_GUIDE.md)
