/**
 * Tool Executor Integration
 *
 * Bridges the agent system with the tool execution framework.
 * Handles tool calling from AI agents, execution, error handling, and result rendering.
 */

import { executeTool } from '@/services/agent/tools/executor';
import { getPermissionManager } from '@/services/agent/tools/permissions';
import { getAuditLogger } from '@/services/agent/tools/audit';
import { getToolRegistry } from '@/services/agent/tools/registry';
import type { ToolCall } from './providers/base';
import type { ToolExecutionContext } from '@/services/agent/tools/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tool execution result for rendering
 */
export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  formattedOutput: string;
}

/**
 * Tool execution options
 */
export interface ExecuteToolOptions {
  sessionId: string;
  userId?: string;
  workspaceRoot?: string;
  onProgress?: (update: ToolProgressUpdate) => void;
}

/**
 * Progress updates during tool execution
 */
export interface ToolProgressUpdate {
  toolName: string;
  status: 'starting' | 'executing' | 'complete' | 'error';
  message?: string;
  progress?: number;
}

/**
 * Batch execution result
 */
export interface BatchExecutionResult {
  results: ToolExecutionResult[];
  allSucceeded: boolean;
  totalDuration: number;
}

// ============================================================================
// TOOL EXECUTOR INTEGRATION
// ============================================================================

/**
 * Executes a single tool call from the AI agent
 */
export async function executeToolCall(
  toolCall: ToolCall,
  options: ExecuteToolOptions
): Promise<ToolExecutionResult> {
  const { sessionId, userId = 'default-user', workspaceRoot, onProgress } = options;
  const startTime = Date.now();

  // Notify starting
  onProgress?.({
    toolName: toolCall.name,
    status: 'starting',
    message: `Starting ${toolCall.name}...`,
  });

  try {
    // Build execution context (with input as part of the context)
    const context = {
      toolName: toolCall.name,
      sessionId,
      userId,
      workspaceRoot: workspaceRoot || '',
      input: toolCall.arguments,
    } as ToolExecutionContext & { input: Record<string, unknown> };

    // Notify executing
    onProgress?.({
      toolName: toolCall.name,
      status: 'executing',
      message: `Executing ${toolCall.name}...`,
    });

    // Execute the tool
    const result = await executeTool(context);

    const duration = Date.now() - startTime;

    // Format output for display
    const formattedOutput = formatToolOutput(toolCall.name, result.output);

    // Notify complete
    onProgress?.({
      toolName: toolCall.name,
      status: 'complete',
      message: `Completed ${toolCall.name}`,
      progress: 100,
    });

    return {
      toolName: toolCall.name,
      success: result.success,
      output: result.output,
      error: result.error,
      duration,
      formattedOutput,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Notify error
    onProgress?.({
      toolName: toolCall.name,
      status: 'error',
      message: errorMessage,
    });

    return {
      toolName: toolCall.name,
      success: false,
      error: errorMessage,
      duration,
      formattedOutput: `Error: ${errorMessage}`,
    };
  }
}

/**
 * Executes multiple tool calls in sequence or parallel
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  options: ExecuteToolOptions,
  parallel: boolean = false
): Promise<BatchExecutionResult> {
  const startTime = Date.now();

  let results: ToolExecutionResult[];

  if (parallel) {
    // Execute all tools in parallel
    results = await Promise.all(toolCalls.map((call) => executeToolCall(call, options)));
  } else {
    // Execute tools sequentially
    results = [];
    for (const call of toolCalls) {
      const result = await executeToolCall(call, options);
      results.push(result);

      // Stop on first failure if not parallel
      if (!result.success) {
        break;
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  const allSucceeded = results.every((r) => r.success);

  return {
    results,
    allSucceeded,
    totalDuration,
  };
}

/**
 * Retry a failed tool execution
 */
export async function retryToolExecution(
  toolCall: ToolCall,
  options: ExecuteToolOptions,
  maxRetries: number = 3
): Promise<ToolExecutionResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    options.onProgress?.({
      toolName: toolCall.name,
      status: 'executing',
      message: `Attempt ${attempt} of ${maxRetries}...`,
    });

    const result = await executeToolCall(toolCall, options);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  return {
    toolName: toolCall.name,
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
    duration: 0,
    formattedOutput: `Error: Failed after ${maxRetries} retries`,
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

/**
 * Format tool output for display in chat
 */
function formatToolOutput(toolName: string, output: unknown): string {
  if (output === null || output === undefined) {
    return 'No output';
  }

  // Handle different tool categories
  if (toolName.startsWith('file_')) {
    return formatFileToolOutput(toolName, output);
  } else if (toolName.startsWith('git_')) {
    return formatGitToolOutput(toolName, output);
  } else if (toolName.startsWith('workspace_')) {
    return formatWorkspaceToolOutput(toolName, output);
  } else if (toolName.startsWith('terminal_')) {
    return formatTerminalToolOutput(toolName, output);
  }

  // Default JSON formatting
  return JSON.stringify(output, null, 2);
}

/**
 * Format file system tool output
 */
function formatFileToolOutput(toolName: string, output: any): string {
  switch (toolName) {
    case 'file_read':
      if (output.content && output.content.length > 1000) {
        return `Read ${output.lineCount} lines (${output.content.length} characters)\n\n${output.content.slice(0, 500)}...\n\n[Truncated for display]`;
      }
      return output.content || '';

    case 'file_write':
      return `✓ Wrote ${output.bytesWritten} bytes to ${output.path}`;

    case 'file_edit':
      return `✓ Applied ${output.edits?.length || 0} edit(s) to ${output.path}\n\nChanges:\n${output.diff || 'No diff available'}`;

    case 'file_delete':
      return `✓ Deleted ${output.itemsDeleted} item(s)`;

    case 'file_rename':
      return `✓ Renamed: ${output.oldPath} → ${output.newPath}`;

    case 'file_copy':
      return `✓ Copied ${output.itemsCopied} item(s) from ${output.source} to ${output.destination}`;

    case 'file_search':
      const results = output.results || [];
      if (results.length === 0) {
        return 'No matches found';
      }
      return `Found ${results.length} match(es):\n\n${results
        .slice(0, 10)
        .map((r: any) => `• ${r.path}${r.line ? `:${r.line}` : ''}`)
        .join('\n')}${results.length > 10 ? `\n\n... and ${results.length - 10} more` : ''}`;

    default:
      return JSON.stringify(output, null, 2);
  }
}

/**
 * Format git tool output
 */
function formatGitToolOutput(toolName: string, output: any): string {
  switch (toolName) {
    case 'git_status':
      const status = [];
      if (output.branch) status.push(`Branch: ${output.branch}`);
      if (output.staged?.length) status.push(`${output.staged.length} staged`);
      if (output.unstaged?.length) status.push(`${output.unstaged.length} unstaged`);
      if (output.untracked?.length) status.push(`${output.untracked.length} untracked`);
      return status.join(', ') || 'Working directory clean';

    case 'git_diff':
      if (output.diff && output.diff.length > 1000) {
        return `Diff: ${output.filesChanged} file(s), +${output.insertions} -${output.deletions}\n\n${output.diff.slice(0, 500)}...\n\n[Truncated for display]`;
      }
      return output.diff || 'No changes';

    case 'git_commit':
      return `✓ Created commit: ${output.sha?.slice(0, 7)}\n${output.message}`;

    case 'git_branch':
      if (output.branches) {
        return `Branches:\n${output.branches.map((b: any) => `${b.current ? '* ' : '  '}${b.name}`).join('\n')}`;
      }
      return `✓ ${output.message || 'Branch operation completed'}`;

    case 'git_checkout':
      return `✓ Switched to ${output.target}`;

    default:
      return JSON.stringify(output, null, 2);
  }
}

/**
 * Format workspace tool output
 */
function formatWorkspaceToolOutput(toolName: string, output: any): string {
  switch (toolName) {
    case 'workspace_structure':
      return output.tree || '';

    case 'workspace_search_symbol':
      const symbols = output.symbols || [];
      if (symbols.length === 0) {
        return 'No symbols found';
      }
      return `Found ${symbols.length} symbol(s):\n\n${symbols
        .slice(0, 10)
        .map((s: any) => `• ${s.type} ${s.name} in ${s.file}:${s.line}`)
        .join('\n')}${symbols.length > 10 ? `\n\n... and ${symbols.length - 10} more` : ''}`;

    case 'workspace_find_references':
      const refs = output.references || [];
      if (refs.length === 0) {
        return 'No references found';
      }
      return `Found ${refs.length} reference(s):\n\n${refs
        .slice(0, 10)
        .map((r: any) => `• ${r.file}:${r.line} - ${r.context}`)
        .join('\n')}${refs.length > 10 ? `\n\n... and ${refs.length - 10} more` : ''}`;

    default:
      return JSON.stringify(output, null, 2);
  }
}

/**
 * Format terminal tool output
 */
function formatTerminalToolOutput(toolName: string, output: any): string {
  switch (toolName) {
    case 'terminal_execute':
      const stdout = output.stdout || '';
      const stderr = output.stderr || '';
      let result = '';

      if (stdout) {
        result += stdout.length > 1000 ? stdout.slice(0, 1000) + '\n[Truncated]' : stdout;
      }

      if (stderr) {
        result += '\n\n[STDERR]\n' + (stderr.length > 500 ? stderr.slice(0, 500) + '\n[Truncated]' : stderr);
      }

      return result || 'Command executed successfully (no output)';

    case 'terminal_list_sessions':
      const sessions = output.sessions || [];
      if (sessions.length === 0) {
        return 'No active terminal sessions';
      }
      return `Active sessions:\n${sessions.map((s: any) => `• ${s.id} (${s.shell}) - ${s.state}`).join('\n')}`;

    case 'terminal_kill':
      return `✓ Terminated session ${output.sessionId}`;

    default:
      return JSON.stringify(output, null, 2);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a tool requires permission elevation
 */
export async function checkToolPermission(
  toolName: string,
  userId: string
): Promise<{ allowed: boolean; requiredLevel?: string }> {
  const permissionManager = getPermissionManager();
  const registry = getToolRegistry();

  const tool = registry.get(toolName);
  if (!tool) {
    return { allowed: false };
  }

  try {
    const hasPermission = await permissionManager.checkPermission(userId, tool);
    return { allowed: hasPermission };
  } catch (error) {
    return {
      allowed: false,
      requiredLevel: tool.permissionLevel,
    };
  }
}

/**
 * Get audit log for a session
 */
export function getSessionAuditLog(sessionId: string) {
  const auditLogger = getAuditLogger();
  return auditLogger.getAllLogs().filter((log) => log.session === sessionId);
}

/**
 * Get tool execution statistics for a session
 */
export function getSessionToolStats(sessionId: string) {
  const logs = getSessionAuditLog(sessionId);

  return {
    totalExecutions: logs.length,
    successfulExecutions: logs.filter((l) => l.success).length,
    failedExecutions: logs.filter((l) => !l.success).length,
    totalDuration: logs.reduce((sum, log) => sum + log.duration, 0),
    averageDuration: logs.length > 0 ? logs.reduce((sum, log) => sum + log.duration, 0) / logs.length : 0,
    toolUsage: logs.reduce(
      (acc, log) => {
        acc[log.tool] = (acc[log.tool] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}
