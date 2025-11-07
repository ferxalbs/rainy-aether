# LangGraph Testing Guide

**Complete Testing & Validation Guide for LangGraph Integration**

**Date:** 2025-11-05
**Status:** Production Ready
**Default Provider:** Groq (llama-3.3-70b-versatile)

---

## Quick Start Testing

### 1. Enable LangGraph

**Method A: Via Code (Recommended for Testing)**

```typescript
// In browser console or initialization code
import { setLangGraphFeatureFlag } from '@/services/agent/langgraph/featureFlag';
await setLangGraphFeatureFlag(true);
console.log('LangGraph enabled!');
```

**Method B: Via Environment Variable**

```bash
# Set environment variable before starting
VITE_AGENT_LANGGRAPH_ENABLED=true pnpm tauri dev
```

**Method C: Via Settings UI (If Implemented)**
Navigate to Settings → Agent → Enable LangGraph

---

## 2. Basic Functionality Test

### Test 1: Simple Conversation (No Tools)

```typescript
const agentService = getAgentService();
await agentService.initialize('/path/to/workspace');

const sessionId = await agentService.createSession({
  name: 'LangGraph Test - No Tools',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
  systemPrompt: 'You are a helpful AI assistant.',
});

await agentService.sendMessage({
  sessionId,
  content: 'Hello! Can you introduce yourself?',
  onToken: (token) => console.log('Token:', token),
  onComplete: (message) => console.log('Complete:', message.content),
  enableTools: false, // Disable tools for this test
});
```

**Expected Behavior:**

- ✅ Streaming tokens appear incrementally in console
- ✅ Full message appears on completion
- ✅ No tool calls
- ✅ Response time < 3 seconds
- ✅ Token count displayed in UI

---

### Test 2: Tool Execution

```typescript
const sessionId = await agentService.createSession({
  name: 'LangGraph Test - With Tools',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
  systemPrompt: 'You are a helpful coding assistant with access to file system tools.',
});

await agentService.sendMessage({
  sessionId,
  content: 'List all TypeScript files in the src directory',
  onToken: (token) => console.log('Token:', token),
  onComplete: (message) => console.log('Complete:', message.content),
  onToolCall: (toolName, result) => {
    console.log(`Tool executed: ${toolName}`, result.success);
  },
  enableTools: true,
  workspaceRoot: '/path/to/your/project',
});
```

**Expected Behavior:**

- ✅ Agent thinks about which tool to use
- ✅ Tool progress updates appear in UI
- ✅ Tool executes successfully
- ✅ Agent summarizes tool results
- ✅ Final response includes file list
- ✅ Tool execution logged in console

---

### Test 3: Multi-Turn Conversation

```typescript
// First message
await agentService.sendMessage({
  sessionId,
  content: 'What is the weather like?',
});

// Second message (context should be retained)
await agentService.sendMessage({
  sessionId,
  content: 'What did I just ask you?',
});
```

**Expected Behavior:**

- ✅ Second response references first question
- ✅ Conversation history maintained
- ✅ Context from previous turn preserved
- ✅ Checkpoint persistence working

---

## 3. Advanced Testing

### Test 4: Stream Processing Validation

```typescript
const tokens: string[] = [];
let fullContent = '';

await agentService.sendMessage({
  sessionId,
  content: 'Write a short poem about coding',
  onToken: (token) => {
    tokens.push(token);
    fullContent += token;
    console.log(`Token ${tokens.length}:`, token);
  },
  onComplete: (message) => {
    console.log('Streamed content:', fullContent);
    console.log('Final content:', message.content);
    console.log('Tokens received:', tokens.length);
    console.log('Content match:', fullContent === message.content);
  },
});
```

**Expected Behavior:**

- ✅ Tokens arrive incrementally (not all at once)
- ✅ `fullContent === message.content` (no loss/duplication)
- ✅ Token count > 10 (streaming is working)
- ✅ No console errors

---

### Test 5: Error Handling

```typescript
// Test with invalid API key
await agentService.createSession({
  name: 'Error Test',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
});

// Manually set invalid key (if possible)
// credentialService.storeApiKey('groq', 'invalid-key');

await agentService.sendMessage({
  sessionId,
  content: 'Test error handling',
  onError: (error) => {
    console.log('Error caught:', error.message);
  },
});
```

**Expected Behavior:**

- ✅ Error callback triggered
- ✅ Error message displayed in UI
- ✅ Incomplete message cleaned up
- ✅ Session state restored
- ✅ No app crash

---

### Test 6: Cost Tracking

```typescript
const session = agentActions.getSession(sessionId);
console.log('Session stats:', {
  totalTokens: session.totalTokens,
  totalCost: session.totalCost,
  messages: session.messages.length,
});

// After sending multiple messages
await agentService.sendMessage({ sessionId, content: 'Message 1' });
await agentService.sendMessage({ sessionId, content: 'Message 2' });
await agentService.sendMessage({ sessionId, content: 'Message 3' });

const updatedSession = agentActions.getSession(sessionId);
console.log('Updated stats:', {
  totalTokens: updatedSession.totalTokens,
  totalCost: updatedSession.totalCost,
  costIncrease: updatedSession.totalCost - session.totalCost,
});
```

**Expected Behavior:**

- ✅ Token count increases with each message
- ✅ Cost calculation accurate for Groq
- ✅ Cost displayed in UI
- ✅ Per-message token count tracked

---

## 4. Performance Testing

### Test 7: Latency Benchmark

```typescript
const tests = [
  'Hello',
  'What is 2+2?',
  'Explain quantum computing in one sentence',
];

for (const prompt of tests) {
  const start = Date.now();

  await agentService.sendMessage({
    sessionId,
    content: prompt,
    onComplete: () => {
      const latency = Date.now() - start;
      console.log(`Prompt: "${prompt}" | Latency: ${latency}ms`);
    },
  });
}
```

**Expected Performance:**

- ✅ First token: < 500ms
- ✅ Short response (< 50 tokens): < 2 seconds
- ✅ Medium response (< 200 tokens): < 5 seconds
- ✅ No blocking UI during streaming

---

### Test 8: Concurrent Requests

```typescript
const sessions = await Promise.all([
  agentService.createSession({ providerId: 'groq', modelId: 'llama-3.3-70b-versatile' }),
  agentService.createSession({ providerId: 'groq', modelId: 'llama-3.3-70b-versatile' }),
  agentService.createSession({ providerId: 'groq', modelId: 'llama-3.3-70b-versatile' }),
]);

await Promise.all(
  sessions.map((id, idx) =>
    agentService.sendMessage({
      sessionId: id,
      content: `Concurrent test ${idx + 1}`,
    })
  )
);
```

**Expected Behavior:**

- ✅ All requests complete successfully
- ✅ No race conditions
- ✅ Each session independent
- ✅ Memory usage reasonable

---

## 5. Tool System Testing

### Test 9: File System Tools

```typescript
await agentService.sendMessage({
  sessionId,
  content: 'Read the package.json file and tell me the project name',
  enableTools: true,
  workspaceRoot: process.cwd(),
});
```

**Expected Tools Used:**

- ✅ `read_file` tool called
- ✅ File content retrieved
- ✅ Response includes project name
- ✅ Tool progress displayed

---

### Test 10: Git Tools

```typescript
await agentService.sendMessage({
  sessionId,
  content: 'Show me the current git status',
  enableTools: true,
  workspaceRoot: process.cwd(),
});
```

**Expected Tools Used:**

- ✅ `git_status` tool called
- ✅ Git status retrieved
- ✅ Changes listed in response
- ✅ Tool execution successful

---

## 6. Comparison Testing

### Test 11: LangGraph vs AI SDK

**Setup:**

```typescript
// Test 1: LangGraph enabled
await setLangGraphFeatureFlag(true);
const langgraphSession = await agentService.createSession({
  name: 'LangGraph Test',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
});

await agentService.sendMessage({
  sessionId: langgraphSession,
  content: 'Explain recursion in simple terms',
});

// Test 2: LangGraph disabled (AI SDK)
await setLangGraphFeatureFlag(false);
const aiSdkSession = await agentService.createSession({
  name: 'AI SDK Test',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
});

await agentService.sendMessage({
  sessionId: aiSdkSession,
  content: 'Explain recursion in simple terms',
});
```

**Compare:**

- Response quality
- Streaming smoothness
- Tool execution behavior
- Token usage
- Response time
- Memory usage

---

## 7. Debugging & Troubleshooting

### Enable Debug Logging

```typescript
// Set localStorage flag
localStorage.setItem('DEBUG_LANGGRAPH', 'true');

// Or add to console
window.DEBUG_LANGGRAPH = true;
```

### Check Feature Flag Status

```typescript
import { isLangGraphEnabled } from '@/services/agent/langgraph/featureFlag';

console.log('LangGraph enabled:', isLangGraphEnabled());
```

### Inspect Stream Events

```typescript
// Add this temporarily to agentService.ts sendMessageWithLangGraph
for await (const chunk of stream) {
  console.log('[DEBUG] Stream chunk:', JSON.stringify(chunk, null, 2));
  // ... existing code
}
```

### Monitor Memory Usage

```typescript
// Before test
const before = performance.memory?.usedJSHeapSize || 0;

// Run test
await agentService.sendMessage({ ... });

// After test
const after = performance.memory?.usedJSHeapSize || 0;
console.log('Memory delta:', ((after - before) / 1024 / 1024).toFixed(2), 'MB');
```

---

## 8. Known Issues & Workarounds

### Issue 1: Stream Not Updating

**Symptoms:**

- Content appears all at once (not streaming)
- onToken callback never called

**Solution:**

```typescript
// Check stream mode in graphFactory.ts
streamMode: 'values' as const // Should be 'values', not array
```

### Issue 2: Tools Not Executing

**Symptoms:**

- Agent mentions tool but doesn't execute
- No tool progress updates

**Check:**

1. `enableTools: true` in sendMessage
2. `workspaceRoot` provided
3. Tools registered: `getToolRegistry().listAll()`

### Issue 3: Context Not Retained

**Symptoms:**

- Agent forgets previous messages
- Each message treated as new conversation

**Check:**

```typescript
// In graphFactory.ts, verify:
checkpointSaver: checkpointer // MemorySaver instance

// And in streamConfig:
thread_id: config.threadId // Must be consistent
```

---

## 9. Performance Benchmarks

### Target Metrics (Groq llama-3.3-70b-versatile)

| Metric | Target | Acceptable | Needs Work |
|--------|--------|------------|------------|
| First Token | < 200ms | < 500ms | > 500ms |
| Tokens/sec | > 50 | > 30 | < 30 |
| Tool Latency | < 1s | < 2s | > 2s |
| Memory/Session | < 5MB | < 10MB | > 10MB |
| Cost/1k tokens | $0.05 | $0.10 | > $0.10 |

---

## 10. Automated Test Suite (Future)

### Unit Tests

```typescript
// tests/langgraph/modelFactory.test.ts
describe('ModelFactory', () => {
  it('should create Groq model', () => {
    const model = createLangGraphChatModel({
      providerId: 'groq',
      modelId: 'llama-3.3-70b-versatile',
      apiKey: 'test-key',
      config: {},
    });
    expect(model).toBeInstanceOf(ChatGroq);
  });
});
```

### Integration Tests

```typescript
// tests/langgraph/integration.test.ts
describe('LangGraph Integration', () => {
  it('should stream responses', async () => {
    const tokens = [];
    await agentService.sendMessage({
      sessionId,
      content: 'Test',
      onToken: (t) => tokens.push(t),
    });
    expect(tokens.length).toBeGreaterThan(0);
  });
});
```

---

## 11. Production Readiness Checklist

### Before Enabling in Production

- [ ] All tests passing (1-10)
- [ ] Performance benchmarks met
- [ ] Error handling validated
- [ ] Memory leaks checked
- [ ] Cost tracking accurate
- [ ] Tool execution verified
- [ ] Multi-turn context working
- [ ] Checkpoint persistence tested
- [ ] Browser compatibility verified
- [ ] Tauri environment tested

### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor token usage and costs
- [ ] Track response times
- [ ] Monitor memory usage
- [ ] Log tool execution failures

---

## 12. Rollout Plan

### Phase 1: Internal (Current)

- Feature flag OFF by default
- Manual opt-in for testing
- 1-2 developers testing

### Phase 2: Beta (Week 1)

- Feature flag ON for beta users
- 10-20 users
- Collect feedback

### Phase 3: Gradual Rollout (Week 2-4)

- 25% → 50% → 75% → 100%
- Monitor metrics at each step
- Ready to rollback if needed

### Phase 4: Full Migration (Month 2)

- Feature flag ON for all
- Remove AI SDK dependencies
- LangGraph as sole orchestrator

---

## Summary

This testing guide provides **comprehensive validation** of the LangGraph integration. Follow the tests in order, starting with basic functionality and progressing to advanced scenarios.

**Priority Tests:**

1. Test 1: Basic conversation ✅
2. Test 2: Tool execution ✅
3. Test 3: Multi-turn context ✅
4. Test 7: Performance benchmark ✅
5. Test 11: Comparison with AI SDK ✅

**Questions?** See [LANGGRAPH_MIGRATION.md](./LANGGRAPH_MIGRATION.md) for architecture details.

**Ready to test!** 🚀
