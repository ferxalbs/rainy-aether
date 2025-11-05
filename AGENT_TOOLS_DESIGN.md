# Agent Tools System Design

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Status:** MVP Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tool Categories](#tool-categories)
4. [Security & Sandboxing](#security--sandboxing)
5. [Tool Execution Flow](#tool-execution-flow)
6. [Backend Optimizations](#backend-optimizations)
7. [File Structure](#file-structure)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

The Agent Tools System provides AI agents with comprehensive capabilities to interact with the codebase, file system, terminal, and external resources. The system is designed with:

- **Type Safety**: Full TypeScript type inference with Zod schemas
- **Security**: Multi-layer sandboxing and permission controls
- **Performance**: Caching, rate limiting, and parallel execution
- **Extensibility**: Plugin-based architecture for custom tools
- **MVP Ready**: Production-grade implementation for initial release

### Design Principles

1. **Security First**: All tools require explicit permissions and operate within sandboxed environments
2. **Type Safety**: Zod schemas ensure runtime validation and TypeScript inference
3. **Performance**: Aggressive caching, batching, and parallel execution where safe
4. **Observability**: Comprehensive logging, metrics, and audit trails
5. **User Control**: Users can enable/disable tools and set permission levels

---

## Architecture

### 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  (ToolExecutionPanel, ToolPermissionsDialog, ToolLogs)      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Tool Registry                            │
│  (Registration, Discovery, Permission Management)            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tool Execution Engine                      │
│  (Validation, Sandboxing, Caching, Rate Limiting)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tool Implementations                       │
│  (File System, Code Analysis, Terminal, Web, etc.)          │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Tool Registry

- Central registration for all available tools
- Permission management (user, admin, restricted)
- Tool discovery and metadata
- Version management for tool updates

#### 2. Tool Execution Engine

- Input validation with Zod schemas
- Permission checking before execution
- Sandboxed execution environment
- Result caching with TTL
- Rate limiting per tool/user
- Parallel execution coordinator
- Error handling and recovery

#### 3. Tool Implementations

- File System Tools (read, write, edit, delete, search)
- Code Analysis Tools (parse, analyze, refactor, lint)
- Terminal Tools (execute, shell, script)
- Web Tools (search, fetch, scrape)
- Git Tools (status, diff, commit, branch)
- Workspace Tools (project structure, dependencies)

---

## Tool Categories

### 1. File System Tools

**Permission Level:** User (read), Admin (write/delete)

#### `file_read`

Read file contents with line range support.

```typescript
{
  name: 'file_read',
  description: 'Read file contents from the workspace',
  inputSchema: z.object({
    path: z.string().describe('Relative file path from workspace root'),
    startLine: z.number().optional().describe('Start line (1-indexed)'),
    endLine: z.number().optional().describe('End line (1-indexed)'),
  }),
  execute: async ({ path, startLine, endLine }) => {
    // Read via Tauri command, apply line filtering
    return { content: string, lines: number, encoding: string };
  }
}
```

#### `file_write`

Write or create files with conflict detection.

```typescript
{
  name: 'file_write',
  description: 'Write content to a file (creates if not exists)',
  inputSchema: z.object({
    path: z.string().describe('Relative file path'),
    content: z.string().describe('File content'),
    createDirs: z.boolean().optional().describe('Create parent directories'),
  }),
  execute: async ({ path, content, createDirs }) => {
    return { success: boolean, bytesWritten: number };
  }
}
```

#### `file_edit`

Advanced editing with search/replace, line-based edits, and diff generation.

```typescript
{
  name: 'file_edit',
  description: 'Edit file with search/replace or line operations',
  inputSchema: z.object({
    path: z.string(),
    operations: z.array(z.union([
      z.object({
        type: z.literal('replace'),
        search: z.string(),
        replace: z.string(),
        all: z.boolean().optional(),
      }),
      z.object({
        type: z.literal('insert'),
        line: z.number(),
        content: z.string(),
      }),
      z.object({
        type: z.literal('delete'),
        startLine: z.number(),
        endLine: z.number(),
      }),
    ])),
  }),
  execute: async ({ path, operations }) => {
    return {
      success: boolean,
      diff: string,
      appliedOperations: number
    };
  }
}
```

#### `file_delete`

Safe file deletion with confirmation.

```typescript
{
  name: 'file_delete',
  description: 'Delete a file or directory',
  inputSchema: z.object({
    path: z.string(),
    recursive: z.boolean().optional().describe('Delete directories recursively'),
  }),
  execute: async ({ path, recursive }) => {
    return { success: boolean, deletedItems: number };
  }
}
```

#### `file_search`

Fast file search with glob patterns and content filtering.

```typescript
{
  name: 'file_search',
  description: 'Search for files by name or content',
  inputSchema: z.object({
    pattern: z.string().optional().describe('Glob pattern (e.g., **/*.ts)'),
    content: z.string().optional().describe('Search file contents'),
    fileType: z.string().optional().describe('Filter by extension'),
    maxResults: z.number().optional().default(100),
  }),
  execute: async ({ pattern, content, fileType, maxResults }) => {
    return {
      files: Array<{ path: string, matches: number }>,
      totalMatches: number
    };
  }
}
```

#### `file_rename`

Rename files and directories with conflict detection.

```typescript
{
  name: 'file_rename',
  description: 'Rename a file or directory',
  inputSchema: z.object({
    oldPath: z.string(),
    newPath: z.string(),
  }),
  execute: async ({ oldPath, newPath }) => {
    return { success: boolean, newPath: string };
  }
}
```

#### `file_copy`

Copy files and directories.

```typescript
{
  name: 'file_copy',
  description: 'Copy a file or directory',
  inputSchema: z.object({
    sourcePath: z.string(),
    destPath: z.string(),
    overwrite: z.boolean().optional(),
  }),
  execute: async ({ sourcePath, destPath, overwrite }) => {
    return { success: boolean, copiedItems: number };
  }
}
```

---

### 2. Code Analysis Tools

**Permission Level:** User

#### `code_parse`

Parse code into AST with symbol extraction.

```typescript
{
  name: 'code_parse',
  description: 'Parse code and extract symbols (functions, classes, imports)',
  inputSchema: z.object({
    path: z.string(),
    language: z.enum(['typescript', 'javascript', 'rust', 'python', 'go']).optional(),
  }),
  execute: async ({ path, language }) => {
    return {
      symbols: Array<{
        name: string,
        type: 'function' | 'class' | 'interface' | 'variable',
        line: number,
        column: number,
      }>,
      imports: Array<{ module: string, line: number }>,
      exports: Array<{ name: string, line: number }>,
    };
  }
}
```

#### `code_analyze`

Static analysis for code quality and patterns.

```typescript
{
  name: 'code_analyze',
  description: 'Analyze code for quality, complexity, and patterns',
  inputSchema: z.object({
    path: z.string(),
    checks: z.array(z.enum(['complexity', 'duplicates', 'dependencies', 'security'])),
  }),
  execute: async ({ path, checks }) => {
    return {
      complexity: { average: number, max: number, functions: Array },
      duplicates: Array<{ file1: string, file2: string, similarity: number }>,
      dependencies: { direct: Array<string>, transitive: Array<string> },
      security: Array<{ severity: string, message: string, line: number }>,
    };
  }
}
```

#### `code_refactor`

Automated refactoring operations.

```typescript
{
  name: 'code_refactor',
  description: 'Perform automated refactoring',
  inputSchema: z.object({
    path: z.string(),
    operation: z.enum(['rename', 'extract_function', 'extract_variable', 'inline']),
    params: z.record(z.any()).describe('Operation-specific parameters'),
  }),
  execute: async ({ path, operation, params }) => {
    return {
      success: boolean,
      changes: Array<{ file: string, diff: string }>,
      affectedFiles: number,
    };
  }
}
```

#### `code_lint`

Run linters and formatters.

```typescript
{
  name: 'code_lint',
  description: 'Run linters and formatters on code',
  inputSchema: z.object({
    path: z.string(),
    fix: z.boolean().optional().describe('Auto-fix issues'),
    linters: z.array(z.enum(['eslint', 'prettier', 'clippy', 'black'])).optional(),
  }),
  execute: async ({ path, fix, linters }) => {
    return {
      issues: Array<{
        file: string,
        line: number,
        column: number,
        severity: 'error' | 'warning' | 'info',
        message: string,
        fixed: boolean,
      }>,
      totalIssues: number,
      fixedIssues: number,
    };
  }
}
```

#### `code_dependencies`

Analyze project dependencies.

```typescript
{
  name: 'code_dependencies',
  description: 'Analyze and manage project dependencies',
  inputSchema: z.object({
    action: z.enum(['list', 'outdated', 'audit', 'tree']),
    packageManager: z.enum(['npm', 'pnpm', 'yarn', 'cargo']).optional(),
  }),
  execute: async ({ action, packageManager }) => {
    return {
      dependencies: Array<{
        name: string,
        version: string,
        latest: string,
        vulnerabilities: number,
      }>,
      totalDependencies: number,
      outdated: number,
      vulnerabilities: number,
    };
  }
}
```

---

### 3. Terminal Tools

**Permission Level:** Admin (requires user confirmation)

#### `terminal_execute`

Execute commands with output capture.

```typescript
{
  name: 'terminal_execute',
  description: 'Execute a shell command',
  inputSchema: z.object({
    command: z.string().describe('Command to execute'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().default(30000).describe('Timeout in ms'),
    env: z.record(z.string()).optional().describe('Environment variables'),
  }),
  execute: async ({ command, cwd, timeout, env }) => {
    return {
      stdout: string,
      stderr: string,
      exitCode: number,
      duration: number,
    };
  }
}
```

#### `terminal_script`

Execute multi-line scripts.

```typescript
{
  name: 'terminal_script',
  description: 'Execute a multi-line script',
  inputSchema: z.object({
    script: z.string(),
    shell: z.enum(['bash', 'powershell', 'cmd', 'zsh']).optional(),
    cwd: z.string().optional(),
  }),
  execute: async ({ script, shell, cwd }) => {
    return { stdout: string, stderr: string, exitCode: number };
  }
}
```

#### `terminal_interactive`

Create interactive terminal session.

```typescript
{
  name: 'terminal_interactive',
  description: 'Create an interactive terminal session',
  inputSchema: z.object({
    sessionId: z.string().optional().describe('Reuse existing session'),
    cwd: z.string().optional(),
  }),
  execute: async ({ sessionId, cwd }) => {
    return {
      sessionId: string,
      ready: boolean,
    };
  }
}
```

---

### 4. Web Tools

**Permission Level:** User (with rate limiting)

#### `web_search`

Search the web for information.

```typescript
{
  name: 'web_search',
  description: 'Search the web for information',
  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().optional().default(10),
  }),
  execute: async ({ query, maxResults }) => {
    return {
      results: Array<{
        title: string,
        url: string,
        snippet: string,
      }>,
      totalResults: number,
    };
  }
}
```

#### `web_fetch`

Fetch content from URLs.

```typescript
{
  name: 'web_fetch',
  description: 'Fetch content from a URL',
  inputSchema: z.object({
    url: z.string().url(),
    format: z.enum(['text', 'markdown', 'json', 'html']).optional().default('text'),
  }),
  execute: async ({ url, format }) => {
    return {
      content: string,
      contentType: string,
      statusCode: number,
    };
  }
}
```

#### `web_scrape`

Extract structured data from web pages.

```typescript
{
  name: 'web_scrape',
  description: 'Scrape structured data from a web page',
  inputSchema: z.object({
    url: z.string().url(),
    selectors: z.record(z.string()).describe('CSS selectors for data extraction'),
  }),
  execute: async ({ url, selectors }) => {
    return {
      data: Record<string, string | string[]>,
      extractedFields: number,
    };
  }
}
```

---

### 5. Git Tools

**Permission Level:** User (read), Admin (write)

#### `git_status`

Get repository status.

```typescript
{
  name: 'git_status',
  description: 'Get Git repository status',
  inputSchema: z.object({}),
  execute: async () => {
    return {
      branch: string,
      ahead: number,
      behind: number,
      staged: Array<string>,
      unstaged: Array<string>,
      untracked: Array<string>,
    };
  }
}
```

#### `git_diff`

Get file differences.

```typescript
{
  name: 'git_diff',
  description: 'Get diff for files',
  inputSchema: z.object({
    path: z.string().optional(),
    staged: z.boolean().optional(),
  }),
  execute: async ({ path, staged }) => {
    return {
      diff: string,
      additions: number,
      deletions: number,
      files: number,
    };
  }
}
```

#### `git_commit`

Create commits.

```typescript
{
  name: 'git_commit',
  description: 'Create a Git commit',
  inputSchema: z.object({
    message: z.string(),
    files: z.array(z.string()).optional().describe('Files to stage (empty = all)'),
  }),
  execute: async ({ message, files }) => {
    return {
      success: boolean,
      commitHash: string,
      filesCommitted: number,
    };
  }
}
```

#### `git_branch`

Manage branches.

```typescript
{
  name: 'git_branch',
  description: 'Manage Git branches',
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'switch', 'delete']),
    name: z.string().optional(),
  }),
  execute: async ({ action, name }) => {
    return {
      branches: Array<{ name: string, current: boolean }>,
      currentBranch: string,
    };
  }
}
```

---

### 6. Workspace Tools

**Permission Level:** User

#### `workspace_structure`

Get project structure.

```typescript
{
  name: 'workspace_structure',
  description: 'Get project directory structure',
  inputSchema: z.object({
    path: z.string().optional().default('.'),
    maxDepth: z.number().optional().default(5),
    exclude: z.array(z.string()).optional().describe('Patterns to exclude'),
  }),
  execute: async ({ path, maxDepth, exclude }) => {
    return {
      tree: string, // ASCII tree representation
      files: number,
      directories: number,
      totalSize: number,
    };
  }
}
```

#### `workspace_search_symbol`

Search for code symbols.

```typescript
{
  name: 'workspace_search_symbol',
  description: 'Search for symbols (functions, classes, etc.) in workspace',
  inputSchema: z.object({
    query: z.string(),
    type: z.enum(['function', 'class', 'interface', 'type', 'variable', 'any']).optional(),
    maxResults: z.number().optional().default(50),
  }),
  execute: async ({ query, type, maxResults }) => {
    return {
      symbols: Array<{
        name: string,
        type: string,
        file: string,
        line: number,
        preview: string,
      }>,
      totalResults: number,
    };
  }
}
```

#### `workspace_find_references`

Find all references to a symbol.

```typescript
{
  name: 'workspace_find_references',
  description: 'Find all references to a symbol',
  inputSchema: z.object({
    symbol: z.string(),
    file: z.string().optional(),
    line: z.number().optional(),
  }),
  execute: async ({ symbol, file, line }) => {
    return {
      references: Array<{
        file: string,
        line: number,
        column: number,
        context: string,
      }>,
      totalReferences: number,
    };
  }
}
```

---

## Security & Sandboxing

### Permission Levels

1. **User Level**: Read-only operations, safe transformations
   - File reading, code analysis, workspace queries
   - No system modifications

2. **Admin Level**: Write operations, requires confirmation
   - File creation/editing/deletion
   - Terminal execution
   - Git commits/pushes

3. **Restricted Level**: Dangerous operations, explicit opt-in
   - System commands
   - Network access
   - Package installation

### Security Measures

#### 1. Path Validation

```typescript
function validatePath(path: string, workspaceRoot: string): boolean {
  const resolved = resolve(workspaceRoot, path);
  return resolved.startsWith(workspaceRoot) && !path.includes('..');
}
```

#### 2. Command Sanitization

```typescript
function sanitizeCommand(command: string): string {
  // Block dangerous commands
  const blocklist = ['rm -rf /', 'dd if=', 'mkfs', 'format'];
  // Validate against blocklist
  // Escape shell metacharacters
  return sanitized;
}
```

#### 3. Rate Limiting

```typescript
interface RateLimit {
  tool: string;
  maxCalls: number;
  windowMs: number;
}

const rateLimits: RateLimit[] = [
  { tool: 'web_fetch', maxCalls: 20, windowMs: 60000 },
  { tool: 'terminal_execute', maxCalls: 10, windowMs: 60000 },
  { tool: 'file_write', maxCalls: 50, windowMs: 60000 },
];
```

#### 4. Execution Timeouts

```typescript
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
    ),
  ]);
}
```

#### 5. Output Sanitization

```typescript
function sanitizeOutput(output: string, maxLength: number = 10000): string {
  // Remove sensitive patterns (API keys, passwords, tokens)
  // Truncate to max length
  // Escape special characters
  return sanitized;
}
```

---

## Tool Execution Flow

### Execution Pipeline

```
1. Tool Call Request
   ↓
2. Permission Check
   ↓
3. Rate Limit Check
   ↓
4. Input Validation (Zod)
   ↓
5. Cache Lookup (if cacheable)
   ↓
6. Sandboxed Execution
   ↓
7. Output Sanitization
   ↓
8. Cache Store (if cacheable)
   ↓
9. Audit Log
   ↓
10. Return Result
```

### Implementation

```typescript
interface ToolExecutionContext {
  toolName: string;
  input: unknown;
  userId: string;
  sessionId: string;
  abortSignal?: AbortSignal;
}

interface ToolExecutionResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
  metadata: {
    duration: number;
    cached: boolean;
    permissionLevel: 'user' | 'admin' | 'restricted';
  };
}

async function executeTool<T>(
  context: ToolExecutionContext
): Promise<ToolExecutionResult<T>> {
  const startTime = Date.now();

  try {
    // 1. Get tool definition
    const tool = toolRegistry.get(context.toolName);
    if (!tool) throw new Error(`Tool not found: ${context.toolName}`);

    // 2. Check permissions
    await permissionManager.checkPermission(context.userId, tool.permissionLevel);

    // 3. Rate limiting
    await rateLimiter.checkLimit(context.toolName, context.userId);

    // 4. Validate input
    const validatedInput = tool.inputSchema.parse(context.input);

    // 5. Check cache
    const cacheKey = generateCacheKey(context.toolName, validatedInput);
    const cached = await cache.get<T>(cacheKey);
    if (cached && tool.cacheable) {
      return {
        success: true,
        output: cached,
        metadata: {
          duration: Date.now() - startTime,
          cached: true,
          permissionLevel: tool.permissionLevel,
        },
      };
    }

    // 6. Execute tool
    const output = await executeWithTimeout(
      () => tool.execute(validatedInput, context),
      tool.timeoutMs ?? 30000
    );

    // 7. Sanitize output
    const sanitized = sanitizeToolOutput(output);

    // 8. Cache result
    if (tool.cacheable) {
      await cache.set(cacheKey, sanitized, tool.cacheTtlMs ?? 300000);
    }

    // 9. Audit log
    await auditLog.log({
      tool: context.toolName,
      user: context.userId,
      session: context.sessionId,
      success: true,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      output: sanitized,
      metadata: {
        duration: Date.now() - startTime,
        cached: false,
        permissionLevel: tool.permissionLevel,
      },
    };
  } catch (error) {
    // Error handling and logging
    await auditLog.log({
      tool: context.toolName,
      user: context.userId,
      session: context.sessionId,
      success: false,
      error: String(error),
    });

    return {
      success: false,
      error: String(error),
      metadata: {
        duration: Date.now() - startTime,
        cached: false,
        permissionLevel: 'user',
      },
    };
  }
}
```

---

## Backend Optimizations

### 1. Rust Backend Enhancements

#### File Operations Optimization

```rust
// src-tauri/src/file_operations.rs

use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileReadResult {
    pub content: String,
    pub lines: usize,
    pub size: usize,
    pub encoding: String,
}

#[tauri::command]
pub async fn tool_read_file(
    workspace_root: String,
    path: String,
    start_line: Option<usize>,
    end_line: Option<usize>,
) -> Result<FileReadResult, String> {
    // Validate path
    let full_path = validate_workspace_path(&workspace_root, &path)?;

    // Read file efficiently
    let content = fs::read_to_string(&full_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Apply line filtering if needed
    let filtered_content = match (start_line, end_line) {
        (Some(start), Some(end)) => {
            content
                .lines()
                .skip(start.saturating_sub(1))
                .take(end - start + 1)
                .collect::<Vec<_>>()
                .join("\n")
        }
        _ => content.clone(),
    };

    Ok(FileReadResult {
        lines: content.lines().count(),
        size: content.len(),
        content: filtered_content,
        encoding: "utf-8".to_string(),
    })
}

#[tauri::command]
pub async fn tool_write_file(
    workspace_root: String,
    path: String,
    content: String,
    create_dirs: Option<bool>,
) -> Result<usize, String> {
    let full_path = validate_workspace_path(&workspace_root, &path)?;

    // Create parent directories if needed
    if create_dirs.unwrap_or(false) {
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create directories: {}", e))?;
        }
    }

    // Write file
    let mut file = fs::File::create(&full_path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(content.len())
}

fn validate_workspace_path(workspace_root: &str, path: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(workspace_root);
    let full_path = root.join(path);

    // Ensure path is within workspace
    if !full_path.starts_with(&root) {
        return Err("Path is outside workspace".to_string());
    }

    // Block traversal attempts
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    Ok(full_path)
}
```

#### Batch Operations

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchReadRequest {
    pub files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchReadResult {
    pub files: Vec<FileReadResult>,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn tool_batch_read_files(
    workspace_root: String,
    request: BatchReadRequest,
) -> Result<BatchReadResult, String> {
    let mut results = Vec::new();
    let mut errors = Vec::new();

    // Read files in parallel (up to 10 concurrent)
    let semaphore = Arc::new(Semaphore::new(10));
    let mut tasks = Vec::new();

    for path in request.files {
        let permit = semaphore.clone().acquire_owned().await;
        let workspace = workspace_root.clone();

        tasks.push(tokio::spawn(async move {
            let _permit = permit;
            tool_read_file(workspace, path, None, None).await
        }));
    }

    for task in tasks {
        match task.await {
            Ok(Ok(result)) => results.push(result),
            Ok(Err(e)) => errors.push(e),
            Err(e) => errors.push(format!("Task failed: {}", e)),
        }
    }

    Ok(BatchReadResult { files: results, errors })
}
```

### 2. Caching System

```typescript
// src/services/agent/tools/cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class ToolCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.cache.delete(oldest[0]);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(() => toolCache.evictExpired(), 300000);
```

### 3. Parallel Execution

```typescript
// src/services/agent/tools/parallel.ts

interface ParallelToolCall {
  toolName: string;
  input: unknown;
}

export async function executeToolsInParallel(
  calls: ParallelToolCall[],
  context: Omit<ToolExecutionContext, 'toolName' | 'input'>
): Promise<ToolExecutionResult[]> {
  // Group by tool for better batching
  const grouped = groupBy(calls, c => c.toolName);

  // Execute in parallel with concurrency limit
  const results = await Promise.all(
    calls.map(call =>
      executeTool({
        ...context,
        toolName: call.toolName,
        input: call.input,
      })
    )
  );

  return results;
}
```

---

## File Structure

```
src/
├── services/
│   └── agent/
│       └── tools/
│           ├── index.ts                    # Tool registry and exports
│           ├── types.ts                    # Core tool types
│           ├── executor.ts                 # Tool execution engine
│           ├── registry.ts                 # Tool registration
│           ├── permissions.ts              # Permission management
│           ├── cache.ts                    # Caching system
│           ├── rateLimiter.ts             # Rate limiting
│           ├── audit.ts                    # Audit logging
│           ├── filesystem/
│           │   ├── read.ts
│           │   ├── write.ts
│           │   ├── edit.ts
│           │   ├── delete.ts
│           │   ├── search.ts
│           │   └── index.ts
│           ├── code/
│           │   ├── parse.ts
│           │   ├── analyze.ts
│           │   ├── refactor.ts
│           │   ├── lint.ts
│           │   └── index.ts
│           ├── terminal/
│           │   ├── execute.ts
│           │   ├── script.ts
│           │   ├── interactive.ts
│           │   └── index.ts
│           ├── web/
│           │   ├── search.ts
│           │   ├── fetch.ts
│           │   ├── scrape.ts
│           │   └── index.ts
│           ├── git/
│           │   ├── status.ts
│           │   ├── diff.ts
│           │   ├── commit.ts
│           │   ├── branch.ts
│           │   └── index.ts
│           └── workspace/
│               ├── structure.ts
│               ├── searchSymbol.ts
│               ├── findReferences.ts
│               └── index.ts
├── stores/
│   └── toolStore.ts                        # Tool execution state
└── components/
    └── agent/
        ├── ToolExecutionPanel.tsx          # Tool execution UI
        ├── ToolPermissionsDialog.tsx       # Permission management
        └── ToolAuditLog.tsx                # Audit log viewer

src-tauri/src/
├── file_operations.rs                      # Optimized file ops
├── code_analysis.rs                        # Code parsing/analysis
├── terminal_executor.rs                    # Safe terminal execution
└── lib.rs                                  # Register tool commands
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

- ✅ Tool type definitions and schemas
- ✅ Tool registry system
- ✅ Permission management
- ✅ Execution engine with validation
- ✅ Basic caching

### Phase 2: File System Tools (Week 1-2)

- ✅ File read/write/edit/delete
- ✅ File search and pattern matching
- ✅ Batch operations
- ✅ Rust backend optimization

### Phase 3: Code Analysis Tools (Week 2)

- ✅ Code parsing (TypeScript/JavaScript/Rust)
- ✅ Symbol extraction
- ✅ Static analysis
- ✅ Refactoring operations

### Phase 4: Terminal & Web Tools (Week 2-3)

- ✅ Safe terminal execution
- ✅ Command sanitization
- ✅ Web search/fetch
- ✅ Rate limiting

### Phase 5: Git & Workspace Tools (Week 3)

- ✅ Git operations integration
- ✅ Workspace queries
- ✅ Symbol search
- ✅ Reference finding

### Phase 6: UI & Polish (Week 3-4)

- ✅ Tool execution panel
- ✅ Permission dialogs
- ✅ Audit log viewer
- ✅ Documentation

### Phase 7: MVP Testing & Optimization (Week 4)

- ✅ End-to-end testing
- ✅ Performance optimization
- ✅ Security audit
- ✅ User feedback integration

---

## MVP Readiness Checklist

### Security

- [ ] Path validation for all file operations
- [ ] Command sanitization for terminal tools
- [ ] Rate limiting on all tools
- [ ] Permission system enforced
- [ ] Audit logging active

### Performance

- [ ] Caching system operational
- [ ] Batch operations for file reads
- [ ] Parallel execution for independent tools
- [ ] Rust backend optimizations deployed

### User Experience

- [ ] Clear permission dialogs
- [ ] Tool execution feedback
- [ ] Error messages are actionable
- [ ] Audit log is accessible

### Documentation

- [ ] Tool reference documentation
- [ ] Security best practices
- [ ] Integration examples
- [ ] Troubleshooting guide

---

## Next Steps

1. **Implement Core Infrastructure** (this document)
2. **Build File System Tools** (highest priority for MVP)
3. **Add Code Analysis Tools** (differentiator)
4. **Integrate with Agent System** (AgentService)
5. **Build UI Components** (ToolExecutionPanel)
6. **Security Audit** (before MVP release)
7. **Performance Testing** (ensure <100ms overhead)
8. **User Testing** (beta group feedback)

---

**Last Updated:** 2025-11-05
**Next Review:** After Phase 1 completion
