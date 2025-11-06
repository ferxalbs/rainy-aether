/**
 * Extension Permissions and Security Layer
 *
 * This service validates and enforces extension permissions,
 * ensuring extensions can only access capabilities they've declared.
 */

import { ExtensionCapability, ExtensionPermissions } from '../../types/extension-api';
import { ExtensionPackageJson } from '../../types/extension-api';

export class ExtensionPermissionsManager {
  private extensionPermissions: Map<string, ExtensionPermissions> = new Map();
  private permissionCache: Map<string, Set<ExtensionCapability>> = new Map();

  /**
   * Register extension permissions from package.json
   */
  registerExtension(extensionId: string, packageJson: ExtensionPackageJson): void {
    const permissions: ExtensionPermissions = {
      capabilities: packageJson.permissions?.capabilities || [],
      fileAccess: packageJson.permissions?.fileAccess,
      networkAccess: packageJson.permissions?.networkAccess,
    };

    this.extensionPermissions.set(extensionId, permissions);

    // Build capability cache
    this.permissionCache.set(
      extensionId,
      new Set(permissions.capabilities)
    );
  }

  /**
   * Unregister extension permissions
   */
  unregisterExtension(extensionId: string): void {
    this.extensionPermissions.delete(extensionId);
    this.permissionCache.delete(extensionId);
  }

  /**
   * Check if extension has a specific capability
   */
  hasCapability(extensionId: string, capability: ExtensionCapability): boolean {
    const capabilities = this.permissionCache.get(extensionId);
    if (!capabilities) {
      console.warn(`Extension ${extensionId} not registered in permissions manager`);
      return false;
    }

    return capabilities.has(capability);
  }

  /**
   * Check if extension has all of the specified capabilities
   */
  hasAllCapabilities(extensionId: string, requiredCapabilities: ExtensionCapability[]): boolean {
    return requiredCapabilities.every(cap => this.hasCapability(extensionId, cap));
  }

  /**
   * Check if extension has any of the specified capabilities
   */
  hasAnyCapability(extensionId: string, capabilities: ExtensionCapability[]): boolean {
    return capabilities.some(cap => this.hasCapability(extensionId, cap));
  }

  /**
   * Check if extension can access a specific file path
   */
  canAccessFile(extensionId: string, filePath: string): boolean {
    const permissions = this.extensionPermissions.get(extensionId);
    if (!permissions) {
      return false;
    }

    // Check if extension has file read or write capability
    if (!this.hasAnyCapability(extensionId, [
      ExtensionCapability.READ_FILES,
      ExtensionCapability.WRITE_FILES,
      ExtensionCapability.WATCH_FILES
    ])) {
      return false;
    }

    // If no file access restrictions, allow all
    if (!permissions.fileAccess) {
      return true;
    }

    // Check deny list first
    if (permissions.fileAccess.deny) {
      for (const pattern of permissions.fileAccess.deny) {
        if (this.matchesPattern(filePath, pattern)) {
          return false;
        }
      }
    }

    // Check allow list
    if (permissions.fileAccess.allow) {
      for (const pattern of permissions.fileAccess.allow) {
        if (this.matchesPattern(filePath, pattern)) {
          return true;
        }
      }
      // If allow list exists but path doesn't match, deny
      return false;
    }

    // No restrictions, allow
    return true;
  }

  /**
   * Check if extension can make network request to a domain
   */
  canAccessDomain(extensionId: string, domain: string): boolean {
    const permissions = this.extensionPermissions.get(extensionId);
    if (!permissions) {
      return false;
    }

    // Check if extension has network capability
    if (!this.hasAnyCapability(extensionId, [
      ExtensionCapability.HTTP_REQUEST,
      ExtensionCapability.WEBSOCKET
    ])) {
      return false;
    }

    // If no network restrictions, allow all
    if (!permissions.networkAccess) {
      return true;
    }

    // Check denied domains first
    if (permissions.networkAccess.deniedDomains) {
      for (const deniedDomain of permissions.networkAccess.deniedDomains) {
        if (this.matchesDomain(domain, deniedDomain)) {
          return false;
        }
      }
    }

    // Check allowed domains
    if (permissions.networkAccess.allowedDomains) {
      for (const allowedDomain of permissions.networkAccess.allowedDomains) {
        if (this.matchesDomain(domain, allowedDomain)) {
          return true;
        }
      }
      // If allow list exists but domain doesn't match, deny
      return false;
    }

    // No restrictions, allow
    return true;
  }

  /**
   * Get all capabilities for an extension
   */
  getCapabilities(extensionId: string): ExtensionCapability[] {
    const capabilities = this.permissionCache.get(extensionId);
    return capabilities ? Array.from(capabilities) : [];
  }

  /**
   * Get full permissions for an extension
   */
  getPermissions(extensionId: string): ExtensionPermissions | undefined {
    return this.extensionPermissions.get(extensionId);
  }

  /**
   * Validate that an operation is allowed
   * Throws error if not allowed
   */
  validateOperation(
    extensionId: string,
    operation: {
      capability: ExtensionCapability;
      filePath?: string;
      domain?: string;
    }
  ): void {
    // Check capability
    if (!this.hasCapability(extensionId, operation.capability)) {
      throw new Error(
        `Extension "${extensionId}" does not have permission for capability "${operation.capability}". ` +
        `Add it to the "permissions.capabilities" array in package.json.`
      );
    }

    // Check file access if applicable
    if (operation.filePath && !this.canAccessFile(extensionId, operation.filePath)) {
      throw new Error(
        `Extension "${extensionId}" does not have permission to access file "${operation.filePath}".`
      );
    }

    // Check network access if applicable
    if (operation.domain && !this.canAccessDomain(extensionId, operation.domain)) {
      throw new Error(
        `Extension "${extensionId}" does not have permission to access domain "${operation.domain}".`
      );
    }
  }

  /**
   * Get human-readable permission descriptions
   */
  getPermissionDescriptions(permissions: ExtensionPermissions): string[] {
    const descriptions: string[] = [];

    for (const capability of permissions.capabilities) {
      descriptions.push(this.getCapabilityDescription(capability));
    }

    if (permissions.fileAccess?.allow) {
      descriptions.push(`File access limited to: ${permissions.fileAccess.allow.join(', ')}`);
    }

    if (permissions.networkAccess?.allowedDomains) {
      descriptions.push(`Network access limited to: ${permissions.networkAccess.allowedDomains.join(', ')}`);
    }

    return descriptions;
  }

  /**
   * Get human-readable capability description
   */
  getCapabilityDescription(capability: ExtensionCapability): string {
    const descriptions: Record<ExtensionCapability, string> = {
      [ExtensionCapability.READ_FILES]: 'Read files from the workspace',
      [ExtensionCapability.WRITE_FILES]: 'Create, modify, and delete files',
      [ExtensionCapability.WATCH_FILES]: 'Watch for file changes',
      [ExtensionCapability.EDIT_TEXT]: 'Edit text in the editor',
      [ExtensionCapability.READ_TEXT]: 'Read text from the editor',
      [ExtensionCapability.CURSOR_POSITION]: 'Access cursor position',
      [ExtensionCapability.DECORATIONS]: 'Add decorations to the editor',
      [ExtensionCapability.COMPLETIONS]: 'Provide code completions',
      [ExtensionCapability.DIAGNOSTICS]: 'Show diagnostic messages (errors, warnings)',
      [ExtensionCapability.HOVER]: 'Provide hover information',
      [ExtensionCapability.DEFINITIONS]: 'Provide definition navigation',
      [ExtensionCapability.REFERENCES]: 'Find code references',
      [ExtensionCapability.FORMATTING]: 'Format code',
      [ExtensionCapability.CODE_ACTIONS]: 'Provide code actions (quick fixes)',
      [ExtensionCapability.RENAME]: 'Rename symbols',
      [ExtensionCapability.SYMBOLS]: 'Provide symbol information',
      [ExtensionCapability.STATUS_BAR]: 'Add status bar items',
      [ExtensionCapability.NOTIFICATIONS]: 'Show notifications',
      [ExtensionCapability.QUICK_PICK]: 'Show quick pick menus',
      [ExtensionCapability.INPUT_BOX]: 'Show input boxes',
      [ExtensionCapability.PANELS]: 'Create custom panels',
      [ExtensionCapability.WEBVIEWS]: 'Create webview panels',
      [ExtensionCapability.TERMINAL_CREATE]: 'Create terminal sessions',
      [ExtensionCapability.TERMINAL_WRITE]: 'Write to terminals',
      [ExtensionCapability.TERMINAL_READ]: 'Read from terminals',
      [ExtensionCapability.REGISTER_COMMANDS]: 'Register custom commands',
      [ExtensionCapability.EXECUTE_COMMANDS]: 'Execute commands',
      [ExtensionCapability.HTTP_REQUEST]: 'Make HTTP requests',
      [ExtensionCapability.WEBSOCKET]: 'Create WebSocket connections',
      [ExtensionCapability.GLOBAL_STATE]: 'Store global state',
      [ExtensionCapability.WORKSPACE_STATE]: 'Store workspace state',
      [ExtensionCapability.SECRETS]: 'Store secrets securely',
      [ExtensionCapability.GIT_READ]: 'Read Git repository information',
      [ExtensionCapability.GIT_WRITE]: 'Modify Git repository (commit, push, etc.)',
      [ExtensionCapability.SPAWN_PROCESS]: 'Spawn child processes',
      [ExtensionCapability.DEBUG_ADAPTER]: 'Provide debug adapter',
      [ExtensionCapability.BREAKPOINTS]: 'Manage breakpoints',
    };

    return descriptions[capability] || capability;
  }

  /**
   * Check if a file path matches a glob pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filePath);
  }

  /**
   * Check if a domain matches a pattern (supports wildcards)
   */
  private matchesDomain(domain: string, pattern: string): boolean {
    // Exact match
    if (domain === pattern) {
      return true;
    }

    // Wildcard subdomain match: *.example.com matches api.example.com
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.slice(2);
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }

    return false;
  }

  /**
   * Validate extension manifest permissions
   */
  validateManifestPermissions(packageJson: ExtensionPackageJson): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const permissions = packageJson.permissions;

    if (!permissions) {
      warnings.push('No permissions declared. Extension will have no capabilities.');
      return { valid: true, errors, warnings };
    }

    // Validate capabilities
    if (permissions.capabilities) {
      const validCapabilities = Object.values(ExtensionCapability);
      for (const capability of permissions.capabilities) {
        if (!validCapabilities.includes(capability)) {
          errors.push(`Invalid capability: ${capability}`);
        }
      }
    }

    // Validate file access patterns
    if (permissions.fileAccess) {
      if (permissions.fileAccess.allow) {
        for (const pattern of permissions.fileAccess.allow) {
          if (!this.isValidGlobPattern(pattern)) {
            errors.push(`Invalid file pattern in allow list: ${pattern}`);
          }
        }
      }

      if (permissions.fileAccess.deny) {
        for (const pattern of permissions.fileAccess.deny) {
          if (!this.isValidGlobPattern(pattern)) {
            errors.push(`Invalid file pattern in deny list: ${pattern}`);
          }
        }
      }
    }

    // Validate network access domains
    if (permissions.networkAccess) {
      if (permissions.networkAccess.allowedDomains) {
        for (const domain of permissions.networkAccess.allowedDomains) {
          if (!this.isValidDomainPattern(domain)) {
            errors.push(`Invalid domain pattern in allowed list: ${domain}`);
          }
        }
      }

      if (permissions.networkAccess.deniedDomains) {
        for (const domain of permissions.networkAccess.deniedDomains) {
          if (!this.isValidDomainPattern(domain)) {
            errors.push(`Invalid domain pattern in denied list: ${domain}`);
          }
        }
      }
    }

    // Warning for dangerous capabilities
    const dangerousCapabilities = [
      ExtensionCapability.WRITE_FILES,
      ExtensionCapability.SPAWN_PROCESS,
      ExtensionCapability.GIT_WRITE,
    ];

    for (const capability of dangerousCapabilities) {
      if (permissions.capabilities?.includes(capability)) {
        warnings.push(
          `Extension requests potentially dangerous capability: ${capability}. ` +
          `Users will be warned before enabling this extension.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a glob pattern is valid
   */
  private isValidGlobPattern(pattern: string): boolean {
    // Basic validation - patterns should not be empty and should not contain
    // invalid characters
    if (!pattern || pattern.trim().length === 0) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = ['<', '>', '|', '\0'];
    for (const char of invalidChars) {
      if (pattern.includes(char)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a domain pattern is valid
   */
  private isValidDomainPattern(domain: string): boolean {
    if (!domain || domain.trim().length === 0) {
      return false;
    }

    // Allow wildcard subdomain: *.example.com
    if (domain.startsWith('*.')) {
      domain = domain.slice(2);
    }

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }
}

// Singleton instance
export const extensionPermissionsManager = new ExtensionPermissionsManager();
