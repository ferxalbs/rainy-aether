/**
 * Tool Execution Engine
 *
 * Core execution engine for running tools with validation, caching, rate limiting,
 * security controls, and comprehensive error handling.
 */

import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolBatchRequest,
  ToolBatchResult,
} from './types';
import {
  ToolValidationError,
  ToolTimeoutError,
} from './types';
import { getToolRegistry } from './registry';
import { getPermissionManager } from './permissions';
import { getToolCache } from './cache';
import { getRateLimiter } from './rateLimiter';
import { getAuditLogger } from './audit';

/**
 * Execute tool with timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  toolName: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new ToolTimeoutError(toolName, timeoutMs)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Sanitize tool output (remove sensitive data)
 */
function sanitizeOutput<T>(output: T): T {
  if (typeof output !== 'object' || output === null) {
    return output;
  }

  // Clone to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(output));

  // Recursively remove sensitive fields
  function sanitizeObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    const sensitiveKeys = ['password', 'token', 'apiKey', 'api_key', 'secret', 'privateKey'];

    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '***';
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  }

  sanitizeObject(sanitized);
  return sanitized as T;
}

/**
 * Execute a single tool
 */
export async function executeTool<T = unknown>(
  context: ToolExecutionContext
): Promise<ToolExecutionResult<T>> {
  const startTime = Date.now();
  const registry = getToolRegistry();
  const permissionManager = getPermissionManager();
  const cache = getToolCache();
  const rateLimiter = getRateLimiter();
  const audit = getAuditLogger();

  let permissionLevel: 'user' | 'admin' | 'restricted' = 'user';

  try {
    // 1. Get tool definition
    const tool = registry.getOrThrow(context.toolName);
    permissionLevel = tool.permissionLevel;

    // 2. Check permissions
    await permissionManager.checkPermission(context.userId, tool);

    // 3. Validate input
    let validatedInput: unknown;
    try {
      validatedInput = tool.inputSchema.parse((context as any).input || {});
    } catch (error: any) {
      throw new ToolValidationError(tool.name, error);
    }

    // 4. Check rate limiting
    await rateLimiter.checkLimit(tool, context.userId);

    // 5. Check cache (if tool is cacheable)
    if (tool.cacheable) {
      const cacheKey = cache.generateKey(tool.name, validatedInput);
      const cached = cache.get<T>(cacheKey);

      if (cached !== null) {
        const result: ToolExecutionResult<T> = {
          success: true,
          output: cached,
          metadata: {
            duration: Date.now() - startTime,
            cached: true,
            permissionLevel: tool.permissionLevel,
            timestamp: Date.now(),
            version: tool.version,
          },
        };

        // Log to audit
        await audit.log(context, result, tool.permissionLevel);

        return result;
      }
    }

    // 6. Optional custom validation
    if (tool.validate) {
      const isValid = await tool.validate(validatedInput, context);
      if (!isValid) {
        throw new Error('Custom validation failed');
      }
    }

    // 7. Execute tool with timeout
    const timeoutMs = tool.timeoutMs ?? 30000;
    const output = await executeWithTimeout(
      () => tool.execute(validatedInput, context),
      timeoutMs,
      tool.name
    );

    // 8. Sanitize output
    const sanitized = sanitizeOutput(output);

    // 9. Cache result (if cacheable)
    if (tool.cacheable) {
      const cacheKey = cache.generateKey(tool.name, validatedInput);
      const cacheTtl = tool.cacheTtlMs ?? 300000; // 5 minutes default
      cache.set(cacheKey, sanitized, cacheTtl);
    }

    // 10. Record execution in registry
    registry.recordExecution(tool.name, Date.now() - startTime);

    // 11. Build result
    const result: ToolExecutionResult<T> = {
      success: true,
      output: sanitized as T,
      metadata: {
        duration: Date.now() - startTime,
        cached: false,
        permissionLevel: tool.permissionLevel,
        timestamp: Date.now(),
        version: tool.version,
      },
    };

    // 12. Log to audit
    await audit.log(context, result, tool.permissionLevel);

    return result;
  } catch (error: any) {
    // Error handling
    const result: ToolExecutionResult<T> = {
      success: false,
      error: error.message || String(error),
      metadata: {
        duration: Date.now() - startTime,
        cached: false,
        permissionLevel,
        timestamp: Date.now(),
      },
    };

    // Log error to audit
    await audit.log(context, result, permissionLevel);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[ToolExecutor] Error executing tool ${context.toolName}:`, error);
    }

    return result;
  }
}

/**
 * Execute multiple tools in batch
 */
export async function executeToolBatch(
  request: ToolBatchRequest,
  baseContext: Omit<ToolExecutionContext, 'toolName'>
): Promise<ToolBatchResult> {
  const startTime = Date.now();
  const results: ToolExecutionResult[] = [];

  if (request.parallel) {
    // Execute all tools in parallel
    const promises = request.tools.map(({ toolName, input }) =>
      executeTool({
        ...baseContext,
        toolName,
        input,
      } as ToolExecutionContext)
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  } else {
    // Execute tools sequentially
    for (const { toolName, input } of request.tools) {
      const result = await executeTool({
        ...baseContext,
        toolName,
        input,
      } as ToolExecutionContext);

      results.push(result);

      // Stop on failure if configured
      if (request.stopOnFailure && !result.success) {
        break;
      }
    }
  }

  // Calculate statistics
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  return {
    results,
    success: failureCount === 0,
    duration: Date.now() - startTime,
    successCount,
    failureCount,
  };
}

/**
 * Get tool execution statistics
 */
export function getExecutionStats() {
  const registry = getToolRegistry();
  const cache = getToolCache();
  const rateLimiter = getRateLimiter();
  const audit = getAuditLogger();

  return {
    registry: registry.getStats(),
    cache: cache.getStats(),
    rateLimiter: rateLimiter.getStats(),
    audit: audit.getStats(),
  };
}

/**
 * Clear all tool system caches and state (for testing)
 */
export function clearToolSystem(): void {
  getToolCache().clear();
  getRateLimiter().clear();
  getAuditLogger().clear();
  console.log('[ToolExecutor] Cleared tool system state');
}
