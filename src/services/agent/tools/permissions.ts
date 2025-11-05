/**
 * Tool Permission Manager
 *
 * Manages tool execution permissions, user roles, and access control.
 */

import type {
  PermissionLevel,
  ToolPermission,
  ToolDefinition,
} from './types';
import { ToolPermissionError } from './types';

// Re-export PermissionLevel type for external use
export type { PermissionLevel } from './types';

/**
 * User permission profile
 */
export interface UserPermissionProfile {
  userId: string;
  defaultLevel: PermissionLevel;
  grantedPermissions: Map<string, ToolPermission>;
  deniedTools: Set<string>;
}

/**
 * Permission manager
 */
export class PermissionManager {
  private userProfiles = new Map<string, UserPermissionProfile>();
  private globalPermissionLevel: PermissionLevel = 'user';

  /**
   * Set global permission level
   */
  setGlobalPermissionLevel(level: PermissionLevel): void {
    this.globalPermissionLevel = level;
    console.log(`[PermissionManager] Global permission level set to: ${level}`);
  }

  /**
   * Get global permission level
   */
  getGlobalPermissionLevel(): PermissionLevel {
    return this.globalPermissionLevel;
  }

  /**
   * Create or get user profile
   */
  private getOrCreateProfile(userId: string): UserPermissionProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        defaultLevel: this.globalPermissionLevel,
        grantedPermissions: new Map(),
        deniedTools: new Set(),
      });
    }
    return this.userProfiles.get(userId)!;
  }

  /**
   * Set user default permission level
   */
  setUserPermissionLevel(userId: string, level: PermissionLevel): void {
    const profile = this.getOrCreateProfile(userId);
    profile.defaultLevel = level;
    console.log(`[PermissionManager] User ${userId} permission level set to: ${level}`);
  }

  /**
   * Grant permission for specific tool
   */
  grantToolPermission(
    userId: string,
    toolName: string,
    level: PermissionLevel,
    expiresInMs?: number
  ): void {
    const profile = this.getOrCreateProfile(userId);

    const permission: ToolPermission = {
      toolName,
      userId,
      level,
      granted: true,
      grantedAt: Date.now(),
      expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined,
    };

    profile.grantedPermissions.set(toolName, permission);
    profile.deniedTools.delete(toolName);

    console.log(
      `[PermissionManager] Granted ${level} permission for tool ${toolName} to user ${userId}`
    );
  }

  /**
   * Revoke permission for specific tool
   */
  revokeToolPermission(userId: string, toolName: string): void {
    const profile = this.getOrCreateProfile(userId);
    profile.grantedPermissions.delete(toolName);
    console.log(`[PermissionManager] Revoked permission for tool ${toolName} from user ${userId}`);
  }

  /**
   * Deny access to specific tool
   */
  denyToolAccess(userId: string, toolName: string): void {
    const profile = this.getOrCreateProfile(userId);
    profile.deniedTools.add(toolName);
    profile.grantedPermissions.delete(toolName);
    console.log(`[PermissionManager] Denied access to tool ${toolName} for user ${userId}`);
  }

  /**
   * Allow access to specific tool (remove deny)
   */
  allowToolAccess(userId: string, toolName: string): void {
    const profile = this.getOrCreateProfile(userId);
    profile.deniedTools.delete(toolName);
    console.log(`[PermissionManager] Allowed access to tool ${toolName} for user ${userId}`);
  }

  /**
   * Check if user has permission to execute tool
   */
  async checkPermission(
    userId: string,
    tool: ToolDefinition
  ): Promise<boolean> {
    const profile = this.getOrCreateProfile(userId);

    // Check if tool is explicitly denied
    if (profile.deniedTools.has(tool.name)) {
      throw new ToolPermissionError(
        tool.name,
        tool.permissionLevel,
        'user',
        `Access to tool ${tool.name} is explicitly denied`
      );
    }

    // Check for explicit permission grant
    const grantedPermission = profile.grantedPermissions.get(tool.name);
    if (grantedPermission) {
      // Check expiration
      if (grantedPermission.expiresAt && Date.now() > grantedPermission.expiresAt) {
        profile.grantedPermissions.delete(tool.name);
        console.log(
          `[PermissionManager] Permission for tool ${tool.name} expired for user ${userId}`
        );
      } else {
        // Check if granted level is sufficient
        if (this.isPermissionSufficient(grantedPermission.level, tool.permissionLevel)) {
          return true;
        }
      }
    }

    // Check default permission level
    const hasPermission = this.isPermissionSufficient(
      profile.defaultLevel,
      tool.permissionLevel
    );

    if (!hasPermission) {
      throw new ToolPermissionError(
        tool.name,
        tool.permissionLevel,
        profile.defaultLevel
      );
    }

    return true;
  }

  /**
   * Check if permission level is sufficient
   */
  private isPermissionSufficient(
    userLevel: PermissionLevel,
    requiredLevel: PermissionLevel
  ): boolean {
    const levels: PermissionLevel[] = ['user', 'admin', 'restricted'];
    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * Get user permission level for tool
   */
  getUserPermissionLevel(userId: string, toolName: string): PermissionLevel {
    const profile = this.getOrCreateProfile(userId);

    // Check explicit grant
    const granted = profile.grantedPermissions.get(toolName);
    if (granted && (!granted.expiresAt || Date.now() <= granted.expiresAt)) {
      return granted.level;
    }

    // Return default
    return profile.defaultLevel;
  }

  /**
   * List all permissions for user
   */
  listUserPermissions(userId: string): ToolPermission[] {
    const profile = this.getOrCreateProfile(userId);
    return Array.from(profile.grantedPermissions.values()).filter(
      perm => !perm.expiresAt || Date.now() <= perm.expiresAt
    );
  }

  /**
   * List denied tools for user
   */
  listDeniedTools(userId: string): string[] {
    const profile = this.getOrCreateProfile(userId);
    return Array.from(profile.deniedTools);
  }

  /**
   * Clear expired permissions
   */
  clearExpiredPermissions(): number {
    let cleared = 0;
    const now = Date.now();

    for (const profile of this.userProfiles.values()) {
      for (const [toolName, permission] of profile.grantedPermissions.entries()) {
        if (permission.expiresAt && now > permission.expiresAt) {
          profile.grantedPermissions.delete(toolName);
          cleared++;
        }
      }
    }

    if (cleared > 0) {
      console.log(`[PermissionManager] Cleared ${cleared} expired permissions`);
    }

    return cleared;
  }

  /**
   * Reset user permissions
   */
  resetUserPermissions(userId: string): void {
    this.userProfiles.delete(userId);
    console.log(`[PermissionManager] Reset permissions for user ${userId}`);
  }

  /**
   * Clear all permissions (for testing)
   */
  clear(): void {
    this.userProfiles.clear();
    this.globalPermissionLevel = 'user';
    console.log('[PermissionManager] Cleared all permissions');
  }
}

// Singleton instance
let permissionManagerInstance: PermissionManager | null = null;

/**
 * Get permission manager instance
 */
export function getPermissionManager(): PermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager();

    // Auto-cleanup expired permissions every 5 minutes
    setInterval(() => {
      permissionManagerInstance?.clearExpiredPermissions();
    }, 300000);
  }
  return permissionManagerInstance;
}

/**
 * Reset permission manager (for testing)
 */
export function resetPermissionManager(): void {
  permissionManagerInstance = null;
}
