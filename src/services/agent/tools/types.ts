/**
 * Core Tool System Types
 *
 * Type definitions for the AI agent tool system, including tool definitions,
 * execution contexts, results, and permission models.
 */

import { z } from 'zod';

/**
 * Permission levels for tool execution
 */
export type PermissionLevel = 'user' | 'admin' | 'restricted';

/**
 * Tool execution status
 */
export type ToolExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

/**
 * Tool definition with type-safe input/output
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Unique tool identifier */
  name: string;

  /** Human-readable description for AI model */
  description: string;

  /** Zod schema for input validation */
  inputSchema: z.ZodType<TInput>;

  /** Tool category for organization */
  category: 'filesystem' | 'code' | 'terminal' | 'web' | 'git' | 'workspace' | 'custom';

  /** Required permission level */
  permissionLevel: PermissionLevel;

  /** Whether results can be cached */
  cacheable: boolean;

  /** Cache TTL in milliseconds (if cacheable) */
  cacheTtlMs?: number;

  /** Execution timeout in milliseconds */
  timeoutMs?: number;

  /** Maximum rate limit (calls per window) */
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };

  /** Tool execution function */
  execute: (input: TInput, context: ToolExecutionContext) => Promise<TOutput>;

  /** Optional validation function for extra checks */
  validate?: (input: TInput, context: ToolExecutionContext) => Promise<boolean>;

  /** Tool version for compatibility */
  version?: string;

  /** Whether tool supports parallel execution */
  supportsParallel?: boolean;
}

/**
 * Context provided to tool execution
 */
export interface ToolExecutionContext {
  /** Tool being executed */
  toolName: string;

  /** User ID executing the tool */
  userId: string;

  /** Agent session ID */
  sessionId: string;

  /** Workspace root path */
  workspaceRoot: string;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;

  /** Message history leading to this tool call */
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;

  /** Tool call ID from AI model */
  toolCallId?: string;

  /** Custom context data */
  experimental_context?: Record<string, unknown>;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult<T = unknown> {
  /** Whether execution succeeded */
  success: boolean;

  /** Tool output (if successful) */
  output?: T;

  /** Error message (if failed) */
  error?: string;

  /** Execution metadata */
  metadata: {
    /** Execution duration in milliseconds */
    duration: number;

    /** Whether result came from cache */
    cached: boolean;

    /** Permission level used */
    permissionLevel: PermissionLevel;

    /** Timestamp of execution */
    timestamp: number;

    /** Tool version used */
    version?: string;
  };
}

/**
 * Tool execution history entry
 */
export interface ToolExecutionHistory {
  /** Unique execution ID */
  id: string;

  /** Tool name */
  toolName: string;

  /** Input provided */
  input: unknown;

  /** Execution result */
  result: ToolExecutionResult;

  /** User who executed */
  userId: string;

  /** Session ID */
  sessionId: string;

  /** Timestamp */
  timestamp: number;

  /** Execution status */
  status: ToolExecutionStatus;
}

/**
 * Tool permission configuration
 */
export interface ToolPermission {
  /** Tool name */
  toolName: string;

  /** User ID */
  userId: string;

  /** Granted permission level */
  level: PermissionLevel;

  /** Whether permission is granted */
  granted: boolean;

  /** Expiration timestamp (optional) */
  expiresAt?: number;

  /** Grant timestamp */
  grantedAt: number;
}

/**
 * Rate limit tracking
 */
export interface RateLimitEntry {
  /** Tool name */
  toolName: string;

  /** User ID */
  userId: string;

  /** Call timestamps within current window */
  calls: number[];

  /** Window start time */
  windowStart: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  /** Cached data */
  data: T;

  /** Cache timestamp */
  timestamp: number;

  /** TTL in milliseconds */
  ttl: number;

  /** Cache key */
  key: string;
}

/**
 * Tool registry statistics
 */
export interface ToolRegistryStats {
  /** Total registered tools */
  totalTools: number;

  /** Tools by category */
  byCategory: Record<string, number>;

  /** Tools by permission level */
  byPermission: Record<PermissionLevel, number>;

  /** Total executions */
  totalExecutions: number;

  /** Cache hit rate */
  cacheHitRate: number;

  /** Average execution time */
  averageExecutionTime: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Log entry ID */
  id: string;

  /** Tool name */
  tool: string;

  /** User ID */
  user: string;

  /** Session ID */
  session: string;

  /** Whether execution succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Execution duration */
  duration: number;

  /** Permission level used */
  permissionLevel: PermissionLevel;

  /** Timestamp */
  timestamp: number;

  /** Input summary (sanitized) */
  inputSummary?: string;

  /** Output summary (sanitized) */
  outputSummary?: string;
}

/**
 * Tool batch execution request
 */
export interface ToolBatchRequest {
  /** Tools to execute */
  tools: Array<{
    toolName: string;
    input: unknown;
  }>;

  /** Whether to execute in parallel */
  parallel: boolean;

  /** Whether to stop on first failure */
  stopOnFailure: boolean;
}

/**
 * Tool batch execution result
 */
export interface ToolBatchResult {
  /** Individual results */
  results: ToolExecutionResult[];

  /** Overall success */
  success: boolean;

  /** Total duration */
  duration: number;

  /** Number of successful executions */
  successCount: number;

  /** Number of failed executions */
  failureCount: number;
}

/**
 * Tool validation error
 */
export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public validationErrors: z.ZodError,
    message?: string
  ) {
    super(message || `Tool validation failed for ${toolName}`);
    this.name = 'ToolValidationError';
  }
}

/**
 * Tool permission error
 */
export class ToolPermissionError extends Error {
  constructor(
    public toolName: string,
    public requiredLevel: PermissionLevel,
    public userLevel: PermissionLevel,
    message?: string
  ) {
    super(
      message ||
        `Permission denied for tool ${toolName}: requires ${requiredLevel}, user has ${userLevel}`
    );
    this.name = 'ToolPermissionError';
  }
}

/**
 * Tool rate limit error
 */
export class ToolRateLimitError extends Error {
  constructor(
    public toolName: string,
    public retryAfterMs: number,
    message?: string
  ) {
    super(
      message || `Rate limit exceeded for tool ${toolName}. Retry after ${retryAfterMs}ms`
    );
    this.name = 'ToolRateLimitError';
  }
}

/**
 * Tool timeout error
 */
export class ToolTimeoutError extends Error {
  constructor(
    public toolName: string,
    public timeoutMs: number,
    message?: string
  ) {
    super(message || `Tool ${toolName} execution timed out after ${timeoutMs}ms`);
    this.name = 'ToolTimeoutError';
  }
}

/**
 * Tool not found error
 */
export class ToolNotFoundError extends Error {
  constructor(
    public toolName: string,
    message?: string
  ) {
    super(message || `Tool not found: ${toolName}`);
    this.name = 'ToolNotFoundError';
  }
}
