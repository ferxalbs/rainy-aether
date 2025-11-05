/**
 * Tool Audit Logger
 *
 * Comprehensive audit logging for tool executions, security, and compliance.
 */

import type {
  AuditLogEntry,
  ToolExecutionContext,
  ToolExecutionResult,
  PermissionLevel,
} from './types';

// Re-export AuditLogEntry type
export type { AuditLogEntry } from './types';

/**
 * Audit logger
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number;
  private persistToStorage: boolean;

  constructor(maxLogs: number = 10000, persistToStorage: boolean = true) {
    this.maxLogs = maxLogs;
    this.persistToStorage = persistToStorage;

    // Load persisted logs if enabled
    if (persistToStorage) {
      this.loadLogs();
    }
  }

  /**
   * Log tool execution
   */
  async log(
    context: ToolExecutionContext,
    result: ToolExecutionResult,
    permissionLevel: PermissionLevel
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      tool: context.toolName,
      user: context.userId,
      session: context.sessionId,
      success: result.success,
      error: result.error,
      duration: result.metadata.duration,
      permissionLevel,
      timestamp: result.metadata.timestamp,
      inputSummary: this.sanitizeInput(context),
      outputSummary: result.success ? this.sanitizeOutput(result.output) : undefined,
    };

    this.logs.push(entry);

    // Evict oldest if at capacity
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Persist to storage
    if (this.persistToStorage) {
      await this.persistLogs();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[AuditLog]', entry);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize input for logging (remove sensitive data)
   */
  private sanitizeInput(context: ToolExecutionContext): string {
    try {
      const input = JSON.stringify(context);
      // Remove potential API keys, passwords, tokens
      const sanitized = input
        .replace(/("api[_-]?key"\s*:\s*)"[^"]+"/gi, '$1"***"')
        .replace(/("password"\s*:\s*)"[^"]+"/gi, '$1"***"')
        .replace(/("token"\s*:\s*)"[^"]+"/gi, '$1"***"')
        .replace(/("secret"\s*:\s*)"[^"]+"/gi, '$1"***"');

      // Truncate if too long
      return sanitized.length > 500 ? sanitized.substring(0, 497) + '...' : sanitized;
    } catch {
      return '[Unable to sanitize input]';
    }
  }

  /**
   * Sanitize output for logging
   */
  private sanitizeOutput(output: unknown): string {
    try {
      const outputStr = JSON.stringify(output);
      // Truncate large outputs
      return outputStr.length > 1000 ? outputStr.substring(0, 997) + '...' : outputStr;
    } catch {
      return '[Unable to sanitize output]';
    }
  }

  /**
   * Get all logs
   */
  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs for user
   */
  getLogsByUser(userId: string): AuditLogEntry[] {
    return this.logs.filter(log => log.user === userId);
  }

  /**
   * Get logs for tool
   */
  getLogsByTool(toolName: string): AuditLogEntry[] {
    return this.logs.filter(log => log.tool === toolName);
  }

  /**
   * Get logs for session
   */
  getLogsBySession(sessionId: string): AuditLogEntry[] {
    return this.logs.filter(log => log.session === sessionId);
  }

  /**
   * Get logs by time range
   */
  getLogsByTimeRange(startTime: number, endTime: number): AuditLogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Get failed executions
   */
  getFailedExecutions(): AuditLogEntry[] {
    return this.logs.filter(log => !log.success);
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.logs.length;
    const successful = this.logs.filter(log => log.success).length;
    const failed = total - successful;

    const byTool: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const byPermission: Record<PermissionLevel, number> = {
      user: 0,
      admin: 0,
      restricted: 0,
    };

    let totalDuration = 0;

    for (const log of this.logs) {
      byTool[log.tool] = (byTool[log.tool] || 0) + 1;
      byUser[log.user] = (byUser[log.user] || 0) + 1;
      byPermission[log.permissionLevel]++;
      totalDuration += log.duration;
    }

    const averageDuration = total > 0 ? totalDuration / total : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      averageDuration,
      byTool,
      byUser,
      byPermission,
    };
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = [];
    if (this.persistToStorage) {
      this.persistLogs();
    }
  }

  /**
   * Clear logs older than timestamp
   */
  clearOlderThan(timestamp: number): number {
    const initialLength = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= timestamp);
    const cleared = initialLength - this.logs.length;

    if (cleared > 0 && this.persistToStorage) {
      this.persistLogs();
    }

    return cleared;
  }

  /**
   * Load logs from storage
   */
  private async loadLogs(): Promise<void> {
    try {
      const stored = localStorage.getItem('tool-audit-logs');
      if (stored) {
        this.logs = JSON.parse(stored);
        console.log(`[AuditLogger] Loaded ${this.logs.length} logs from storage`);
      }
    } catch (error) {
      console.error('[AuditLogger] Failed to load logs from storage:', error);
    }
  }

  /**
   * Persist logs to storage
   */
  private async persistLogs(): Promise<void> {
    try {
      localStorage.setItem('tool-audit-logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('[AuditLogger] Failed to persist logs to storage:', error);
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogsAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsAsCSV(): string {
    if (this.logs.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'Tool',
      'User',
      'Session',
      'Success',
      'Duration (ms)',
      'Permission Level',
      'Error',
    ];

    const rows = this.logs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.tool,
      log.user,
      log.session,
      log.success,
      log.duration,
      log.permissionLevel,
      log.error || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Get log count
   */
  get size(): number {
    return this.logs.length;
  }
}

// Singleton instance
let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get audit logger instance
 */
export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(10000, true);

    // Auto-cleanup logs older than 30 days every day
    setInterval(() => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const cleared = auditLoggerInstance?.clearOlderThan(thirtyDaysAgo);
      if (cleared && cleared > 0) {
        console.log(`[AuditLogger] Cleared ${cleared} logs older than 30 days`);
      }
    }, 24 * 60 * 60 * 1000);
  }
  return auditLoggerInstance;
}

/**
 * Reset audit logger (for testing)
 */
export function resetAuditLogger(): void {
  auditLoggerInstance = null;
}
