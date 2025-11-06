import { EventEmitter } from '../utils/EventEmitter';

interface ExtensionHealth {
  id: string;
  loadAttempts: number;
  failureCount: number;
  lastError?: string;
  lastErrorTime?: number;
  isHealthy: boolean;
  healthScore: number;
}

interface HealthMonitorEvents extends Record<string, (...args: any[]) => void> {
  'health:degraded': (extensionId: string, health: ExtensionHealth) => void;
  'health:critical': (extensionId: string, health: ExtensionHealth) => void;
  'health:recovered': (extensionId: string, health: ExtensionHealth) => void;
  'cleanup:required': (extensionId: string) => void;
}

export class ExtensionHealthMonitor extends EventEmitter<HealthMonitorEvents> {
  private healthData = new Map<string, ExtensionHealth>();
  private readonly maxFailures = 3;
  private readonly failureWindow = 5 * 60 * 1000; // 5 minutes
  private readonly healthCheckInterval = 30 * 1000; // 30 seconds
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  /**
   * Start monitoring extensions health
   */
  startMonitoring(): void {
    if (this.healthCheckTimer) {
      return; // Already monitoring
    }

    // Periodic health check
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    console.log('[ExtensionHealthMonitor] Started monitoring');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      console.log('[ExtensionHealthMonitor] Stopped monitoring');
    }
  }

  /**
   * Record a successful extension load
   */
  recordSuccess(extensionId: string): void {
    const health = this.getOrCreateHealth(extensionId);
    health.loadAttempts++;

    // Reset failure count on success
    if (health.failureCount > 0) {
      health.failureCount = 0;
      health.lastError = undefined;
      health.lastErrorTime = undefined;
      health.isHealthy = true;
      health.healthScore = 100;

      this.emit('health:recovered', extensionId, health);
    }

    this.updateHealthScore(health);
  }

  /**
   * Record an extension failure
   */
  recordFailure(extensionId: string, error: string): void {
    const health = this.getOrCreateHealth(extensionId);
    health.failureCount++;
    health.lastError = error;
    health.lastErrorTime = Date.now();
    health.loadAttempts++;

    this.updateHealthScore(health);

    // Check if extension has exceeded failure threshold
    if (health.failureCount >= this.maxFailures) {
      health.isHealthy = false;
      this.emit('health:critical', extensionId, health);
      this.emit('cleanup:required', extensionId);
    } else if (health.failureCount >= Math.floor(this.maxFailures / 2)) {
      this.emit('health:degraded', extensionId, health);
    }
  }

  /**
   * Get health data for an extension
   */
  getHealth(extensionId: string): ExtensionHealth | undefined {
    return this.healthData.get(extensionId);
  }

  /**
   * Check if an extension is healthy
   */
  isHealthy(extensionId: string): boolean {
    const health = this.healthData.get(extensionId);
    return health ? health.isHealthy : true; // Assume healthy if no data
  }

  /**
   * Get all unhealthy extensions
   */
  getUnhealthyExtensions(): ExtensionHealth[] {
    return Array.from(this.healthData.values()).filter(h => !h.isHealthy);
  }

  /**
   * Reset health data for an extension
   */
  reset(extensionId: string): void {
    this.healthData.delete(extensionId);
  }

  /**
   * Clear all health data
   */
  clearAll(): void {
    this.healthData.clear();
  }

  /**
   * Determine if an extension should be auto-disabled
   */
  shouldAutoDisable(extensionId: string): boolean {
    const health = this.healthData.get(extensionId);
    if (!health) return false;

    // Auto-disable if:
    // 1. Failed more than max failures
    // 2. Failures happened within the failure window
    const recentFailures = health.lastErrorTime &&
      (Date.now() - health.lastErrorTime) < this.failureWindow;

    return health.failureCount >= this.maxFailures && recentFailures !== false;
  }

  /**
   * Determine if an extension should be uninstalled
   */
  shouldAutoUninstall(extensionId: string): boolean {
    const health = this.healthData.get(extensionId);
    if (!health) return false;

    // Auto-uninstall if extension has been consistently failing
    // and hasn't recovered in the failure window
    return (
      health.failureCount >= this.maxFailures * 2 &&
      health.lastErrorTime !== undefined &&
      Date.now() - health.lastErrorTime > this.failureWindow
    );
  }

  /**
   * Get health report for all extensions
   */
  getHealthReport(): {
    healthy: number;
    degraded: number;
    critical: number;
    total: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let critical = 0;

    for (const health of this.healthData.values()) {
      if (health.isHealthy) {
        healthy++;
      } else if (health.failureCount >= this.maxFailures) {
        critical++;
      } else {
        degraded++;
      }
    }

    return {
      healthy,
      degraded,
      critical,
      total: this.healthData.size
    };
  }

  // Private methods

  private getOrCreateHealth(extensionId: string): ExtensionHealth {
    let health = this.healthData.get(extensionId);

    if (!health) {
      health = {
        id: extensionId,
        loadAttempts: 0,
        failureCount: 0,
        isHealthy: true,
        healthScore: 100
      };
      this.healthData.set(extensionId, health);
    }

    return health;
  }

  private updateHealthScore(health: ExtensionHealth): void {
    // Calculate health score based on success rate
    if (health.loadAttempts === 0) {
      health.healthScore = 100;
      return;
    }

    const successRate = (health.loadAttempts - health.failureCount) / health.loadAttempts;
    health.healthScore = Math.round(successRate * 100);

    // Factor in recent failures
    if (health.lastErrorTime) {
      const timeSinceError = Date.now() - health.lastErrorTime;
      if (timeSinceError < this.failureWindow) {
        // Reduce score for recent failures
        health.healthScore = Math.max(0, health.healthScore - 20);
      }
    }

    health.isHealthy = health.healthScore >= 50;
  }

  private performHealthCheck(): void {
    const now = Date.now();

    // Check for extensions with old failures that can be reset
    for (const [id, health] of this.healthData.entries()) {
      if (health.lastErrorTime && now - health.lastErrorTime > this.failureWindow * 2) {
        // Reset failure count if no recent failures
        if (health.failureCount > 0) {
          console.log(`[ExtensionHealthMonitor] Resetting health for ${id} - no recent failures`);
          health.failureCount = 0;
          health.lastError = undefined;
          health.lastErrorTime = undefined;
          this.updateHealthScore(health);

          if (health.isHealthy) {
            this.emit('health:recovered', id, health);
          }
        }
      }
    }
  }
}

// Export singleton instance
export const extensionHealthMonitor = new ExtensionHealthMonitor();
