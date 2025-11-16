# 🧪 Integration Testing Guide

**Phase 3 Completion - Rust-TypeScript Integration Tests**
**Date**: 2025-11-16
**Status**: Ready for Testing

---

## Overview

This guide provides comprehensive testing procedures for the Rust-TypeScript integration completed in Phase 3. All tests should pass before moving to Phase 4.

---

## Test Environment Setup

### Prerequisites

```bash
# Ensure dependencies are installed
pnpm install

# Rust backend should compile cleanly
cd src-tauri && cargo check

# Start Tauri in dev mode
pnpm tauri dev
```

### Browser Console Access

All tests can be run from the browser developer console:
1. Open Tauri app (`pnpm tauri dev`)
2. Open DevTools (F12)
3. Go to Console tab
4. Run test commands

---

## Test Suite

### Test 1: Rust Tool Loading ✅

**Purpose**: Verify all 8 Rust tools are loaded correctly

```typescript
// Import the Rust bridge
import { rustBridge } from './src/services/agent/langgraph/rustBridge';

// Initialize bridge
await rustBridge.initialize();

// Check tool count
const tools = rustBridge.getAllTools();
console.log(`✅ Loaded ${tools.length} tools`);

// Expected: 8 tools
// If less than 8, check Rust tool registration

// List all tool names
tools.forEach(tool => {
  console.log(`  - ${tool.name}: ${tool.description}`);
});

// Expected tools:
// ✓ read_file
// ✓ write_file
// ✓ list_directory
// ✓ execute_command
// ✓ git_status
// ✓ git_log
// ✓ workspace_structure
// ✓ search_files
```

**Expected Output**:
```
🔗 Initializing Rust tool bridge...
📦 Found 8 tools from Rust backend:
   ✓ read_file
   ✓ write_file
   ✓ list_directory
   ✓ execute_command
   ✓ git_status
   ✓ git_log
   ✓ workspace_structure
   ✓ search_files
✅ Rust tool bridge initialized with 8 tools
✅ Loaded 8 tools
```

**Pass Criteria**: ✅ All 8 tools loaded

---

### Test 2: Direct Tool Execution ✅

**Purpose**: Verify tools execute correctly via Rust backend

```typescript
// Import commands
import * as RustCommands from './src/services/agent/rust/commands';

// Test 1: List directory
const listResult = await RustCommands.executeTool('list_directory', {
  path: '.',
});

console.log('List Directory Result:', listResult);

// Expected:
// {
//   success: true,
//   output: [...array of files...],
//   executionTimeMs: <number>
// }

// Test 2: Read a file (package.json)
const readResult = await RustCommands.executeTool('read_file', {
  path: './package.json',
});

console.log('Read File Result:', readResult);

// Expected:
// {
//   success: true,
//   output: "<file contents>",
//   executionTimeMs: <number>
// }

// Test 3: Workspace structure
const structureResult = await RustCommands.executeTool('workspace_structure', {
  path: '.',
  maxDepth: 2,
});

console.log('Workspace Structure Result:', structureResult);

// Expected:
// {
//   success: true,
//   output: {...workspace structure...},
//   executionTimeMs: <number>
// }
```

**Expected Output**:
```
✅ All tools execute successfully
✅ execution_time_ms < 100ms for filesystem tools
✅ Results contain expected data
```

**Pass Criteria**:
- ✅ All tool executions return `success: true`
- ✅ Output data is present and correct
- ✅ Execution time is reasonable

---

### Test 3: LangGraph Integration ✅

**Purpose**: Verify LangGraph uses Rust tools correctly

```typescript
// Import graph factory
import { rustBridge } from './src/services/agent/langgraph/rustBridge';

// Initialize
await rustBridge.initialize();

// Get tools
const tools = rustBridge.getAllTools();

// Verify tools are LangChain DynamicTools
console.log('Tool type:', tools[0].constructor.name);
// Expected: "DynamicTool"

// Test tool invocation through LangChain interface
const readFileTool = rustBridge.getTool('read_file');
if (readFileTool) {
  const result = await readFileTool.invoke({
    input: JSON.stringify({ path: './package.json' })
  });

  console.log('LangChain tool invocation:', result);
  // Expected: File contents as string
}
```

**Expected Output**:
```
✅ Tools are LangChain DynamicTools
✅ Tools invoke successfully through LangChain interface
✅ Results are correctly formatted as strings
```

**Pass Criteria**:
- ✅ Tools are instanceof DynamicTool
- ✅ Tool invocation returns string results
- ✅ No errors during invocation

---

### Test 4: RainyAgent Initialization ✅

**Purpose**: Verify RainyAgent initializes correctly

```typescript
// Import RainyAgent
import { RainyAgent } from './src/services/agents/rainy/RainyAgent';

// Create agent
const rainy = new RainyAgent({
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
});

console.log('Created RainyAgent:', rainy.name, rainy.id);

// Initialize with API key
await rainy.initialize({
  apiKey: 'YOUR_GROQ_API_KEY', // Replace with actual key
  workspaceRoot: '.',
  userId: 'test-user',
});

console.log('✅ RainyAgent initialized');

// Check capabilities
const hasCodeGen = rainy.hasCapability('code-generation');
const hasGit = rainy.hasCapability('git-operations');

console.log('Capabilities:', { hasCodeGen, hasGit });
// Expected: both true

// Get enabled tools
const tools = rainy.getEnabledTools();
console.log('Enabled tools:', tools.length);
// Expected: 8 tools
```

**Expected Output**:
```
Created RainyAgent: Rainy rainy
🤖 Initializing Rainy...
✅ Rust session created: <session-id>
✅ Rust tool bridge initialized
✅ LangGraph agent initialized
✅ Rainy fully initialized
✅ RainyAgent initialized
Capabilities: { hasCodeGen: true, hasGit: true }
Enabled tools: 8
```

**Pass Criteria**:
- ✅ No initialization errors
- ✅ Rust session created
- ✅ LangGraph agent created
- ✅ All tools available

---

### Test 5: End-to-End Agent Execution ✅

**Purpose**: Full integration test with actual agent response

```typescript
import { RainyAgent } from './src/services/agents/rainy/RainyAgent';

// Create and initialize
const rainy = new RainyAgent();
await rainy.initialize({
  apiKey: 'YOUR_GROQ_API_KEY',
  workspaceRoot: '.',
});

// Test 1: Fast mode (simple query)
console.log('🚀 Testing Fast Mode...');
const fastResponse = await rainy.sendMessage(
  'List all files in the current directory',
  { fastMode: true }
);

console.log('Fast Mode Response:', fastResponse);
console.log('Execution Time:', fastResponse.metadata.executionTimeMs, 'ms');
console.log('Tools Used:', fastResponse.metadata.toolsExecuted);

// Expected:
// - success: true
// - content: has response text
// - toolCalls: array with list_directory
// - executionTimeMs: < 200ms

// Test 2: Smart mode (complex task)
console.log('🧠 Testing Smart Mode...');
const smartResponse = await rainy.sendMessage(
  'Read package.json and tell me the project name',
  { fastMode: false }
);

console.log('Smart Mode Response:', smartResponse);
console.log('Execution Time:', smartResponse.metadata.executionTimeMs, 'ms');
console.log('Tools Used:', smartResponse.metadata.toolsExecuted);

// Expected:
// - success: true
// - content: mentions the project name
// - toolCalls: array with read_file
// - executionTimeMs: < 500ms

// Test 3: Auto mode (automatic mode selection)
console.log('🤖 Testing Auto Mode...');
const autoResponse = await rainy.sendMessage(
  'What files are in src folder?'
);

console.log('Auto Mode Response:', autoResponse);
// Should auto-select fast mode for this simple query

// Cleanup
await rainy.dispose();
console.log('✅ All tests complete');
```

**Expected Output**:
```
🚀 Testing Fast Mode...
🦀 Fast mode: Executing via Rust backend
Fast Mode Response: { success: true, content: "...", ... }
Execution Time: 150 ms
Tools Used: ["list_directory"]

🧠 Testing Smart Mode...
🧠 Smart mode: Executing via LangGraph with Rust tools
🔧 Executing Rust tool: read_file
Smart Mode Response: { success: true, content: "...", ... }
Execution Time: 450 ms
Tools Used: ["read_file"]

🤖 Testing Auto Mode...
🚀 Auto-selected Fast Mode for simple query
...

🗑️ Rainy disposed
✅ All tests complete
```

**Pass Criteria**:
- ✅ Fast mode executes in < 200ms
- ✅ Smart mode executes in < 500ms
- ✅ Both modes return successful responses
- ✅ Tools are executed correctly
- ✅ Auto mode selects appropriate mode
- ✅ Disposal works without errors

---

### Test 6: Metrics and Memory ✅

**Purpose**: Verify metrics tracking and memory management

```typescript
import { RainyAgent } from './src/services/agents/rainy/RainyAgent';

const rainy = new RainyAgent();
await rainy.initialize({ apiKey: 'YOUR_API_KEY' });

// Send a few messages
await rainy.sendMessage('List files', { fastMode: true });
await rainy.sendMessage('Read package.json', { fastMode: true });

// Get metrics
const metrics = await rainy.getMetrics();
console.log('Agent Metrics:', metrics);

// Expected:
// {
//   totalRequests: >= 2,
//   successfulRequests: >= 2,
//   totalTokens: > 0,
//   totalCostUsd: > 0,
//   ...
// }

// Get memory stats
const memoryStats = await rainy.getMemoryStats();
console.log('Memory Stats:', memoryStats);

// Expected:
// {
//   messageCount: >= 4, // (2 user + 2 assistant)
//   totalTokens: > 0,
//   utilization: < 1.0,
//   ...
// }

// Get history
const history = await rainy.getHistory(5);
console.log('Conversation History:', history.length);

// Expected: >= 4 messages

await rainy.dispose();
```

**Expected Output**:
```
Agent Metrics: {
  totalRequests: 2,
  successfulRequests: 2,
  totalTokens: 1234,
  totalCostUsd: 0.0012,
  ...
}

Memory Stats: {
  messageCount: 4,
  totalTokens: 1234,
  maxTokens: 8192,
  utilization: 0.15,
  ...
}

Conversation History: 4
```

**Pass Criteria**:
- ✅ Metrics are tracked correctly
- ✅ Memory stats are accurate
- ✅ History retrieval works
- ✅ Token counting is reasonable

---

## Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Acceptable | Failing |
|--------|--------|-----------|---------|
| **Tool Loading** | < 100ms | < 500ms | > 500ms |
| **Tool Execution** (filesystem) | < 50ms | < 100ms | > 100ms |
| **Tool Execution** (terminal) | < 500ms | < 1s | > 1s |
| **Fast Mode Response** | < 200ms | < 500ms | > 500ms |
| **Smart Mode Response** | < 500ms | < 1s | > 1s |
| **Agent Initialization** | < 1s | < 2s | > 2s |

### Benchmark Script

```typescript
import { RainyAgent } from './src/services/agents/rainy/RainyAgent';
import * as RustCommands from './src/services/agent/rust/commands';

async function runBenchmarks() {
  console.log('📊 Running Performance Benchmarks...\n');

  // Benchmark 1: Tool Execution
  const start1 = Date.now();
  await RustCommands.executeTool('list_directory', { path: '.' });
  const time1 = Date.now() - start1;
  console.log(`✓ Tool Execution: ${time1}ms (target: <50ms)`);

  // Benchmark 2: Agent Initialization
  const start2 = Date.now();
  const rainy = new RainyAgent();
  await rainy.initialize({ apiKey: 'YOUR_API_KEY' });
  const time2 = Date.now() - start2;
  console.log(`✓ Agent Initialization: ${time2}ms (target: <1s)`);

  // Benchmark 3: Fast Mode
  const start3 = Date.now();
  await rainy.sendMessage('List files', { fastMode: true });
  const time3 = Date.now() - start3;
  console.log(`✓ Fast Mode: ${time3}ms (target: <200ms)`);

  // Benchmark 4: Smart Mode
  const start4 = Date.now();
  await rainy.sendMessage('Read package.json', { fastMode: false });
  const time4 = Date.now() - start4;
  console.log(`✓ Smart Mode: ${time4}ms (target: <500ms)`);

  await rainy.dispose();

  console.log('\n✅ Benchmarks Complete');
}

// Run benchmarks
runBenchmarks();
```

---

## Troubleshooting

### Issue: "Rust tool bridge not initialized"

**Cause**: Bridge wasn't initialized before use
**Solution**:
```typescript
import { rustBridge } from './src/services/agent/langgraph/rustBridge';
await rustBridge.initialize();
```

### Issue: Tool execution returns `success: false`

**Cause**: Invalid parameters or file paths
**Solution**: Check tool parameters match expected schema

### Issue: Agent initialization fails

**Cause**: Missing API key or invalid provider
**Solution**: Ensure API key is set and provider is valid

### Issue: "Command not found" when executing tools

**Cause**: Tauri command not registered
**Solution**: Check `src-tauri/src/lib.rs` has `agent_execute_tool` registered

### Issue: TypeScript import errors

**Cause**: Path aliases not configured
**Solution**: Check `tsconfig.json` has proper path mappings

---

## Success Criteria Checklist

Before marking Phase 3 as complete, ensure:

### Functional Tests
- [ ] All 8 Rust tools load correctly
- [ ] Direct tool execution works via Tauri commands
- [ ] LangGraph uses Rust tools (not TypeScript tools)
- [ ] RainyAgent initializes without errors
- [ ] Fast mode executes and returns results
- [ ] Smart mode executes and returns results
- [ ] Auto mode selects appropriate mode
- [ ] Metrics are tracked correctly
- [ ] Memory management works
- [ ] Disposal/cleanup works

### Performance Tests
- [ ] Tool execution < 100ms (filesystem)
- [ ] Fast mode response < 200ms
- [ ] Smart mode response < 500ms
- [ ] Agent initialization < 1s

### Code Quality
- [ ] No TypeScript compilation errors
- [ ] No Rust compilation errors (except expected GTK warnings)
- [ ] All imports resolve correctly
- [ ] No unused variables or functions
- [ ] Error handling is comprehensive

### Documentation
- [ ] All new code has JSDoc comments
- [ ] Architecture is documented
- [ ] Usage examples are provided
- [ ] Troubleshooting guide is complete

---

## Next Steps After Testing

Once all tests pass:

1. ✅ **Commit Phase 3**: Commit all TypeScript changes
2. ✅ **Push to Remote**: Push to the integration branch
3. ✅ **Update Documentation**: Ensure all docs are up to date
4. ✅ **Create PR**: Prepare for code review
5. ✅ **Phase 4 Planning**: Begin planning advanced features

---

## Test Results Template

```markdown
# Phase 3 Integration Test Results

**Date**: YYYY-MM-DD
**Tester**: Name
**Environment**: Tauri Dev / Production

## Test Results

- [ ] Test 1: Rust Tool Loading - PASS/FAIL
- [ ] Test 2: Direct Tool Execution - PASS/FAIL
- [ ] Test 3: LangGraph Integration - PASS/FAIL
- [ ] Test 4: RainyAgent Initialization - PASS/FAIL
- [ ] Test 5: End-to-End Execution - PASS/FAIL
- [ ] Test 6: Metrics and Memory - PASS/FAIL

## Performance Benchmarks

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Tool Loading | Xms | <100ms | PASS/FAIL |
| Tool Execution | Xms | <100ms | PASS/FAIL |
| Fast Mode | Xms | <200ms | PASS/FAIL |
| Smart Mode | Xms | <500ms | PASS/FAIL |

## Issues Found

1. [Issue description]
2. [Issue description]

## Notes

[Any additional observations]

## Conclusion

Phase 3: READY FOR PRODUCTION / NEEDS FIXES
```

---

**Ready to test!** Follow the test suite above to verify the complete Rust-TypeScript integration. 🚀
