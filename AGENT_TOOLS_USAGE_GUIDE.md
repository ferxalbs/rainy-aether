# Agent Tools System - Usage Guide

**Version:** 1.0.0
**Status:** Production Ready
**Date:** 2025-11-05

---

## Overview

The Agent Tools System enables AI agents in Rainy Aether to autonomously interact with your codebase through a comprehensive set of 18 production-ready tools. The system is fully integrated with the Agents View UI and provides real-time visibility into tool executions.

---

## Quick Start

### 1. Access Agent Mode

- Open Rainy Aether
- Navigate to the **Agents** view (icon in the left sidebar)
- You'll see the Agent Mode interface with a session sidebar

### 2. Create Your First Session

1. **Select a Provider**: Choose from Groq (free), OpenAI, or Anthropic in the sidebar
2. **Select a Model**: Pick a model like "Llama 3.3 70B" or "GPT-4 Turbo"
3. **Click "New Session"**: This creates an agent session with tool access

### 3. Start Chatting

Try these example prompts to see the agent use tools:

```
"Read the package.json file and tell me what dependencies we have"
"Show me the current Git status"
"Search for all TODO comments in the codebase"
"Create a new React component called UserProfile"
```

The agent will automatically use the appropriate tools and show you the results in real-time.

---

## Available Tools

### File System Tools (7 tools)

#### `file_read`

**Permission:** User
**Description:** Read file contents with optional line range
**Example Prompt:** "Read the src/main.ts file"

**Input:**

```typescript
{
  path: string;          // File path
  startLine?: number;    // Optional start line (1-indexed)
  endLine?: number;      // Optional end line
}
```

#### `file_write`

**Permission:** Admin
**Description:** Write content to a file (creates if doesn't exist)
**Example Prompt:** "Create a new file called README.md with basic project info"

**Input:**

```typescript
{
  path: string;     // File path
  content: string;  // File content
}
```

#### `file_edit`

**Permission:** Admin
**Description:** Edit file with replace, insert, or delete operations
**Example Prompt:** "Replace 'Hello' with 'Hi' in greeting.ts"

**Input:**

```typescript
{
  path: string;
  edits: Array<{
    type: 'replace' | 'insert' | 'delete';
    search?: string;        // For replace
    replace?: string;       // For replace
    line?: number;          // For insert/delete
    content?: string;       // For insert
    lineCount?: number;     // For delete
  }>;
}
```

#### `file_delete`

**Permission:** Admin
**Description:** Delete files or directories
**Example Prompt:** "Delete the old-component.tsx file"

**Input:**

```typescript
{
  path: string;      // File or directory path
  recursive?: boolean; // For directories
}
```

#### `file_rename`

**Permission:** Admin
**Description:** Rename or move files/directories
**Example Prompt:** "Rename old-name.ts to new-name.ts"

**Input:**

```typescript
{
  oldPath: string;
  newPath: string;
}
```

#### `file_copy`

**Permission:** Admin
**Description:** Copy files or directories
**Example Prompt:** "Copy config.json to config.backup.json"

**Input:**

```typescript
{
  source: string;
  destination: string;
  recursive?: boolean; // For directories
}
```

#### `file_search`

**Permission:** User
**Description:** Search files by glob pattern and/or content
**Example Prompt:** "Find all TypeScript files containing 'useState'"

**Input:**

```typescript
{
  pattern?: string;      // Glob pattern (e.g., "**/*.ts")
  content?: string;      // Search content
  caseSensitive?: boolean;
  maxResults?: number;   // Default: 100
}
```

### Git Tools (5 tools)

#### `git_status`

**Permission:** User
**Description:** Get current Git status
**Example Prompt:** "What's the Git status?"

**Input:**

```typescript
{
  path: string; // Repository path (usually workspace root)
}
```

#### `git_diff`

**Permission:** User
**Description:** Get diff for files
**Example Prompt:** "Show me the diff for src/main.ts"

**Input:**

```typescript
{
  path: string;    // Repository path
  file?: string;   // Specific file (optional)
  staged?: boolean; // Diff staged changes
}
```

#### `git_commit`

**Permission:** Admin
**Description:** Create a Git commit
**Example Prompt:** "Commit all staged files with message 'Add new feature'"

**Input:**

```typescript
{
  path: string;         // Repository path
  message: string;      // Commit message
  stageAll?: boolean;   // Stage all changes first
  authorName?: string;
  authorEmail?: string;
}
```

#### `git_branch`

**Permission:** Admin
**Description:** List, create, or delete branches
**Example Prompt:** "Create a new branch called feature/user-auth"

**Input:**

```typescript
{
  path: string;
  action: 'list' | 'create' | 'delete';
  branchName?: string;  // For create/delete
  force?: boolean;      // For delete
}
```

#### `git_checkout`

**Permission:** Admin
**Description:** Switch branches or restore files
**Example Prompt:** "Switch to the develop branch"

**Input:**

```typescript
{
  path: string;
  target: string;       // Branch name or file path
  createBranch?: boolean;
}
```

### Workspace Tools (3 tools)

#### `workspace_structure`

**Permission:** User
**Description:** Get ASCII tree of directory structure
**Example Prompt:** "Show me the src directory structure"

**Input:**

```typescript
{
  path?: string;        // Directory path (default: workspace root)
  maxDepth?: number;    // Default: 5
  includeFiles?: boolean; // Default: true
}
```

#### `workspace_search_symbol`

**Permission:** User
**Description:** Search for symbols (functions, classes, etc.)
**Example Prompt:** "Find all functions named handleClick"

**Input:**

```typescript
{
  query: string;        // Symbol name
  type?: 'function' | 'class' | 'interface' | 'variable' | 'type';
  path?: string;        // Limit to specific path
}
```

#### `workspace_find_references`

**Permission:** User
**Description:** Find all references to a symbol
**Example Prompt:** "Find all places where UserService is used"

**Input:**

```typescript
{
  symbol: string;       // Symbol name
  path?: string;        // Limit to specific path
  includeDeclaration?: boolean; // Include declaration
}
```

### Terminal Tools (3 tools)

#### `terminal_execute`

**Permission:** Restricted
**Description:** Execute terminal commands (with security controls)
**Example Prompt:** "Run npm test"

**Input:**

```typescript
{
  command: string;      // Command to execute
  cwd?: string;         // Working directory
  timeout?: number;     // Timeout in ms (default: 30000)
  shell?: string;       // Shell to use
}
```

**Security Controls:**

- Command blocklist (rm -rf /, format, shutdown, etc.)
- Dangerous pattern detection
- Output size limits (1MB)
- Timeout enforcement
- Requires explicit user approval

#### `terminal_list_sessions`

**Permission:** User
**Description:** List all terminal sessions
**Example Prompt:** "Show me active terminal sessions"

**Input:**

```typescript
{
  includeExited?: boolean; // Include terminated sessions
}
```

#### `terminal_kill`

**Permission:** Restricted
**Description:** Terminate a terminal session
**Example Prompt:** "Kill terminal session abc-123"

**Input:**

```typescript
{
  sessionId: string;   // Session ID to terminate
  force?: boolean;     // Force termination
}
```

---

## Permission System

The Agent Tools System has a three-level permission system:

### Permission Levels

1. **User** (🟢 Green) - Read-only operations
   - Safe for autonomous agents
   - No destructive actions
   - Examples: file_read, git_status, workspace_structure

2. **Admin** (🟡 Yellow) - Write operations
   - Modifies files and repository
   - Requires confirmation for destructive actions
   - Examples: file_write, file_edit, git_commit

3. **Restricted** (🔴 Red) - Potentially dangerous
   - Terminal execution
   - Maximum trust required
   - Explicit user approval needed
   - Examples: terminal_execute, terminal_kill

### Managing Permissions

1. **Global Permission Level**: Set in the Tools Panel → Permissions tab
2. **Permission Elevation**: If an agent requests a higher permission, you'll see a dialog
3. **Time-Limited Grants**: Permissions can be granted for specific durations (15min, 1hr, 4hr, 8hr, or session)

---

## Agent Tools Panel

Access the Tools Panel by clicking the **"Tools"** button in the Agent Workspace header.

### Tabs

#### 1. Executions

- Real-time view of tool executions
- Shows tool name, status, duration, and results
- Expandable cards for detailed input/output
- Auto-updates every second

#### 2. Permissions

- Set global permission level (User/Admin/Restricted)
- View permission system explanation
- Control tool access

#### 3. Audit Log

- Comprehensive log of all tool executions
- Filter by success/failure
- Search by tool name, user, or content
- Sort by timestamp, duration, or tool name
- Export as JSON or CSV

#### 4. Statistics

- Total executions
- Success/failure counts
- Tools by category
- Registered tools list

---

## Example Workflows

### 1. Code Review Workflow

```
You: "Review the src/components/UserProfile.tsx file and suggest improvements"

Agent will:
1. Use file_read to read the file
2. Analyze the code
3. Suggest improvements with specific line references
```

### 2. Feature Implementation

```
You: "Create a new UserSettings component with state management"

Agent will:
1. Use file_write to create UserSettings.tsx
2. Use file_write to create UserSettings.test.tsx
3. Use workspace_structure to verify file placement
4. Provide implementation details
```

### 3. Git Workflow

```
You: "Stage all changes, commit with message 'Add user authentication', and push"

Agent will:
1. Use git_status to see changes
2. Use git_commit with stageAll=true
3. Inform about the commit
4. (Note: git_push requires explicit user command)
```

### 4. Debugging Workflow

```
You: "Find all console.log statements in the codebase"

Agent will:
1. Use file_search with content="console.log"
2. List all occurrences with file paths and line numbers
3. Optionally suggest using a proper logging library
```

---

## Best Practices

### For Users

1. **Start Small**: Test with read-only operations first (file_read, git_status)
2. **Review Tool Results**: Check the Tools Panel → Executions tab to see what tools did
3. **Grant Permissions Wisely**: Start with "User" level, elevate only when needed
4. **Use Specific Prompts**: "Read src/main.ts" is better than "Show me the code"
5. **Monitor Audit Log**: Check the Audit Log tab periodically for unusual activity

### For Agents

The system automatically provides these instructions to agents:

1. **Use Tools Appropriately**: Read files before editing them
2. **Batch Operations**: Group related operations when possible
3. **Error Handling**: If a tool fails, explain why and suggest alternatives
4. **Security**: Never bypass permission checks or execute dangerous commands
5. **Transparency**: Always tell the user what tools you're using and why

---

## Security Features

### Built-in Protections

1. **Rate Limiting**
   - File writes: 50 per minute
   - Terminal executions: 10 per minute
   - Git commits: 10 per minute

2. **Critical Path Protection**
   - Cannot delete: package.json, .git/, node_modules/, etc.
   - Protected branches: main, master, develop

3. **Command Blocklist**
   - Blocked: rm -rf /, format, shutdown, reboot, fork bombs
   - Pattern detection for dangerous commands

4. **Output Limits**
   - Terminal output: 1MB maximum
   - File read: Configurable limits
   - Search results: 100 results by default

5. **Audit Logging**
   - Every tool execution logged
   - Includes timestamp, user, input, output, duration
   - Export capability for compliance

---

## Troubleshooting

### Agent Not Using Tools

**Problem**: Agent responds without using tools
**Solution**:

- Ensure model supports tool calling (check model capabilities)
- Be more specific in your request: "Use the file_read tool to read src/main.ts"
- Check if provider is configured correctly

### Permission Denied

**Problem**: "Permission denied" error
**Solution**:

- Check global permission level in Tools Panel → Permissions
- Grant temporary elevation when prompted
- Verify you have file system permissions

### Tool Execution Failed

**Problem**: Tool execution shows error in Audit Log
**Solution**:

- Check error message in Executions or Audit Log tab
- Verify file paths are correct (relative to workspace root)
- Ensure files/directories exist before operations
- Check network connectivity for Git operations

### Slow Tool Execution

**Problem**: Tools taking a long time
**Solution**:

- Check file sizes (large file reads take longer)
- Verify Git repository isn't too large
- Check network for Git operations
- Consider using more specific search patterns

---

## Advanced Usage

### Custom System Prompts

When creating a session, you can customize the system prompt:

```typescript
await agentService.createSession({
  name: 'Code Review Bot',
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
  systemPrompt: `You are a senior code reviewer with expertise in TypeScript and React.
  Focus on code quality, performance, and best practices.
  Use the available tools to read and analyze code before providing feedback.`
});
```

### Programmatic Tool Usage

You can use tools programmatically from your own code:

```typescript
import { executeTool } from '@/services/agent/tools/executor';

const result = await executeTool({
  toolName: 'file_read',
  userId: 'user-1',
  sessionId: 'session-1',
  workspaceRoot: '/path/to/workspace',
  input: {
    path: 'src/main.ts',
    startLine: 1,
    endLine: 50
  }
});

console.log(result.output);
```

### Custom Tool Development

To add new tools:

1. Create a new file in `src/services/agent/tools/[category]/`
2. Define the tool using the `ToolDefinition` interface
3. Register it in the category's `index.ts`
4. Tools are automatically available to agents

See `AGENT_TOOLS_DESIGN.md` for detailed architecture.

---

## API Reference

### AgentService

```typescript
import { getAgentService } from '@/services/agent/agentService';

const service = getAgentService();

// Send message with tools enabled
await service.sendMessage({
  sessionId: 'session-1',
  content: 'Read the package.json file',
  enableTools: true,  // Default: true
  workspaceRoot: workspace?.path,
  onToolCall: (toolName, result) => {
    console.log(`Tool ${toolName} executed:`, result);
  }
});
```

### Tool Executor

```typescript
import { executeToolCall, retryToolExecution } from '@/services/agent/toolExecutor';

// Execute single tool
const result = await executeToolCall(
  { id: '1', name: 'file_read', arguments: { path: 'src/main.ts' } },
  {
    sessionId: 'session-1',
    userId: 'user-1',
    workspaceRoot: '/workspace',
    onProgress: (update) => console.log(update)
  }
);

// With automatic retry
const resultWithRetry = await retryToolExecution(toolCall, options, 3);
```

### Permission Manager

```typescript
import { getPermissionManager } from '@/services/agent/tools/permissions';

const pm = getPermissionManager();

// Set global level
pm.setGlobalPermissionLevel('admin');

// Grant tool permission
pm.grantToolPermission('user-1', 'file_write', 'admin', 3600000); // 1 hour

// Check permission
const hasPermission = await pm.checkPermission('user-1', tool);
```

---

## FAQ

**Q: Can the agent access files outside the workspace?**
A: No, all file operations are restricted to the workspace root for security.

**Q: Are tool executions logged?**
A: Yes, every execution is logged in the Audit Log with full details.

**Q: Can I disable specific tools?**
A: Currently, tools are enabled/disabled by permission level. Per-tool control is planned for v2.

**Q: What happens if a tool times out?**
A: The tool execution is cancelled and an error is returned to the agent. Default timeout is 30 seconds.

**Q: Can multiple agents use tools simultaneously?**
A: Yes, tools support parallel execution when the `supportsParallel` flag is true.

**Q: How do I export audit logs?**
A: Tools Panel → Audit Log → Click "JSON" or "CSV" button to export.

---

## What's Next (Version 2)

Planned enhancements for Agent Tools v2:

- **Code Analysis Tools**: AST parsing, complexity metrics, type checking
- **Web Tools**: HTTP requests, web scraping, API testing
- **Database Tools**: Query execution, schema inspection
- **Testing Tools**: Test generation, coverage analysis
- **Refactoring Tools**: Automated refactoring operations
- **Multi-Agent Coordination**: Up to 8 agents working in parallel
- **Voice Mode**: Voice-controlled agent interactions
- **MCP Integration**: Model Context Protocol support

---

## Support & Feedback

- **Documentation**: See `AGENT_TOOLS_DESIGN.md` for architecture details
- **Implementation Status**: See `AGENT_TOOLS_IMPLEMENTATION_STATUS.md`
- **Issues**: Report bugs in the GitHub repository
- **Questions**: Ask in the community Discord

---

**Last Updated:** 2025-11-05
**Version:** 1.0.0 - Production Ready
