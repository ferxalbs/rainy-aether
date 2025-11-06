/**
 * Extension Validator
 *
 * This service validates extensions before installation, checking for:
 * - Malicious code patterns
 * - Security vulnerabilities
 * - Proper manifest structure
 * - Signature verification (for signed extensions)
 */

import { ExtensionPackageJson } from '../../types/extension-api';
import { extensionPermissionsManager } from './extensionPermissions';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  securityScore: number; // 0-100, higher is more secure
  trustLevel: TrustLevel;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export enum TrustLevel {
  VERIFIED = 'verified', // Official or verified publisher
  TRUSTED = 'trusted', // Community trusted, good reputation
  UNKNOWN = 'unknown', // No reputation data
  SUSPICIOUS = 'suspicious', // Suspicious patterns detected
  MALICIOUS = 'malicious', // Known malicious patterns
}

export class ExtensionValidator {
  private maliciousPatterns: RegExp[] = [
    // Eval and code execution
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(\s*["'`]/gi,
    /setInterval\s*\(\s*["'`]/gi,

    // File system abuse
    /rm\s+-rf/gi,
    /del\s+\/[fs]/gi,

    // Network abuse
    /XMLHttpRequest.*password/gi,
    /fetch.*password/gi,
    /keylog/gi,

    // Obfuscation attempts
    /fromCharCode/gi,
    /atob\(/gi,
    /btoa\(/gi,

    // Dangerous APIs
    /child_process\.exec/gi,
    /require\s*\(\s*["']fs["']\)/gi,
  ];

  private suspiciousPatterns: RegExp[] = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /credential/gi,
    /api[_-]?key/gi,
  ];

  private requiredManifestFields = [
    'name',
    'version',
    'publisher',
    'engines',
    'description',
  ];

  /**
   * Validate an extension before installation
   */
  async validateExtension(
    packageJson: ExtensionPackageJson,
    extensionFiles?: Map<string, string>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let securityScore = 100;
    let trustLevel = TrustLevel.UNKNOWN;

    // 1. Validate manifest
    const manifestValidation = this.validateManifest(packageJson);
    errors.push(...manifestValidation.errors);
    warnings.push(...manifestValidation.warnings);
    securityScore -= manifestValidation.errors.length * 10;
    securityScore -= manifestValidation.warnings.length * 5;

    // 2. Validate permissions
    const permissionsValidation = extensionPermissionsManager.validateManifestPermissions(packageJson);
    if (!permissionsValidation.valid) {
      errors.push(...permissionsValidation.errors.map(msg => ({
        code: 'INVALID_PERMISSION',
        message: msg,
        severity: 'high' as const,
      })));
    }
    warnings.push(...permissionsValidation.warnings.map(msg => ({
      code: 'PERMISSION_WARNING',
      message: msg,
    })));
    securityScore -= errors.length * 15;

    // 3. Validate extension files (if provided)
    if (extensionFiles) {
      const codeValidation = await this.validateCode(extensionFiles);
      errors.push(...codeValidation.errors);
      warnings.push(...codeValidation.warnings);
      securityScore -= codeValidation.maliciousCount * 30;
      securityScore -= codeValidation.suspiciousCount * 10;

      if (codeValidation.maliciousCount > 0) {
        trustLevel = TrustLevel.MALICIOUS;
      } else if (codeValidation.suspiciousCount > 3) {
        trustLevel = TrustLevel.SUSPICIOUS;
      }
    }

    // 4. Check publisher reputation
    const publisherValidation = await this.validatePublisher(packageJson.publisher);
    if (publisherValidation.verified) {
      trustLevel = TrustLevel.VERIFIED;
      securityScore += 10;
    } else if (publisherValidation.trusted) {
      trustLevel = TrustLevel.TRUSTED;
      securityScore += 5;
    }

    // 5. Validate dependencies
    const depsValidation = this.validateDependencies(packageJson);
    warnings.push(...depsValidation.warnings);
    securityScore -= depsValidation.warnings.length * 3;

    // 6. Check for required engines
    const engineValidation = this.validateEngines(packageJson);
    if (!engineValidation.compatible) {
      errors.push({
        code: 'INCOMPATIBLE_ENGINE',
        message: engineValidation.message,
        severity: 'critical',
      });
    }

    // Ensure score is within bounds
    securityScore = Math.max(0, Math.min(100, securityScore));

    return {
      valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      securityScore,
      trustLevel,
    };
  }

  /**
   * Validate extension manifest (package.json)
   */
  private validateManifest(packageJson: ExtensionPackageJson): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    for (const field of this.requiredManifestFields) {
      if (!packageJson[field as keyof ExtensionPackageJson]) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          severity: 'critical',
          location: 'package.json',
        });
      }
    }

    // Validate version format (semver)
    if (packageJson.version && !this.isValidSemver(packageJson.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: `Invalid version format: ${packageJson.version}. Must be valid semver.`,
        severity: 'high',
        location: 'package.json',
      });
    }

    // Validate name format
    if (packageJson.name && !this.isValidPackageName(packageJson.name)) {
      errors.push({
        code: 'INVALID_NAME',
        message: `Invalid package name: ${packageJson.name}. Must be lowercase, alphanumeric with hyphens.`,
        severity: 'high',
        location: 'package.json',
      });
    }

    // Check for main entry point
    if (!packageJson.main && !packageJson.browser) {
      warnings.push({
        code: 'NO_ENTRY_POINT',
        message: 'No entry point specified (main or browser field). Extension may not activate.',
        suggestion: 'Add "main" or "browser" field to package.json',
      });
    }

    // Validate activation events
    if (packageJson.activationEvents) {
      for (const event of packageJson.activationEvents) {
        if (!this.isValidActivationEvent(event)) {
          warnings.push({
            code: 'INVALID_ACTIVATION_EVENT',
            message: `Potentially invalid activation event: ${event}`,
          });
        }
      }
    } else {
      warnings.push({
        code: 'NO_ACTIVATION_EVENTS',
        message: 'No activation events specified. Extension will activate on startup.',
        suggestion: 'Add activationEvents to control when extension activates',
      });
    }

    // Check for license
    if (!packageJson.license) {
      warnings.push({
        code: 'NO_LICENSE',
        message: 'No license specified',
        suggestion: 'Add a license field to clarify usage terms',
      });
    }

    // Check for repository
    if (!packageJson.repository) {
      warnings.push({
        code: 'NO_REPOSITORY',
        message: 'No repository specified',
        suggestion: 'Add repository URL for transparency and trust',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate extension code for malicious patterns
   */
  private async validateCode(files: Map<string, string>): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    maliciousCount: number;
    suspiciousCount: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let maliciousCount = 0;
    let suspiciousCount = 0;

    for (const [filePath, content] of files.entries()) {
      // Skip non-code files
      if (!this.isCodeFile(filePath)) {
        continue;
      }

      // Check for malicious patterns
      for (const pattern of this.maliciousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          maliciousCount += matches.length;
          errors.push({
            code: 'MALICIOUS_PATTERN',
            message: `Potentially malicious pattern found: ${pattern.source}`,
            severity: 'critical',
            location: filePath,
          });
        }
      }

      // Check for suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          suspiciousCount += matches.length;
          warnings.push({
            code: 'SUSPICIOUS_PATTERN',
            message: `Suspicious pattern found in ${filePath}: ${pattern.source}`,
            suggestion: 'Review this code carefully before installing',
          });
        }
      }

      // Check for overly large files (> 1MB)
      if (content.length > 1024 * 1024) {
        warnings.push({
          code: 'LARGE_FILE',
          message: `Large file detected: ${filePath} (${(content.length / 1024 / 1024).toFixed(2)}MB)`,
        });
      }

      // Check for minified/obfuscated code
      if (this.isObfuscated(content)) {
        suspiciousCount++;
        warnings.push({
          code: 'OBFUSCATED_CODE',
          message: `File appears to be obfuscated or minified: ${filePath}`,
          suggestion: 'Request source maps or unminified version from publisher',
        });
      }
    }

    return { errors, warnings, maliciousCount, suspiciousCount };
  }

  /**
   * Validate publisher reputation
   */
  private async validatePublisher(publisherName: string): Promise<{
    verified: boolean;
    trusted: boolean;
    reason: string;
  }> {
    // In a real implementation, this would check against a database
    // of verified and trusted publishers

    // For now, simple heuristics
    const verifiedPublishers = ['microsoft', 'rainycode', 'github'];
    const trustedPublishers = ['esbenp', 'ms-vscode', 'formulahendry'];

    if (verifiedPublishers.includes(publisherName.toLowerCase())) {
      return {
        verified: true,
        trusted: true,
        reason: 'Official verified publisher',
      };
    }

    if (trustedPublishers.includes(publisherName.toLowerCase())) {
      return {
        verified: false,
        trusted: true,
        reason: 'Community trusted publisher',
      };
    }

    return {
      verified: false,
      trusted: false,
      reason: 'Unknown publisher',
    };
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(packageJson: ExtensionPackageJson): {
    warnings: ValidationWarning[];
  } {
    const warnings: ValidationWarning[] = [];

    // Check for excessive dependencies
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    if (depCount > 50) {
      warnings.push({
        code: 'EXCESSIVE_DEPENDENCIES',
        message: `Extension has ${depCount} dependencies, which may impact performance`,
      });
    }

    // Check for known vulnerable packages (placeholder)
    // In production, integrate with npm audit or Snyk
    const knownVulnerable = ['event-stream@3.3.4'];
    for (const [pkg, version] of Object.entries(packageJson.dependencies || {})) {
      const pkgVersion = `${pkg}@${version}`;
      if (knownVulnerable.includes(pkgVersion)) {
        warnings.push({
          code: 'VULNERABLE_DEPENDENCY',
          message: `Known vulnerable dependency: ${pkgVersion}`,
          suggestion: 'Update to a patched version',
        });
      }
    }

    return { warnings };
  }

  /**
   * Validate engine compatibility
   */
  private validateEngines(packageJson: ExtensionPackageJson): {
    compatible: boolean;
    message: string;
  } {
    const engines = packageJson.engines;

    if (!engines) {
      return {
        compatible: true,
        message: 'No engine requirements specified',
      };
    }

    // Check rainycode engine
    if (engines.rainycode) {
      // In production, compare with actual IDE version
      const currentVersion = '0.1.0';
      if (!this.isVersionCompatible(currentVersion, engines.rainycode)) {
        return {
          compatible: false,
          message: `Requires Rainy Code ${engines.rainycode}, but running ${currentVersion}`,
        };
      }
    }

    // Check vscode engine (for compatibility)
    if (engines.vscode && !engines.rainycode) {
      // VS Code extensions may work, but warn
      return {
        compatible: true,
        message: 'Extension is designed for VS Code. Compatibility not guaranteed.',
      };
    }

    return {
      compatible: true,
      message: 'Engine requirements satisfied',
    };
  }

  /**
   * Verify extension signature (if signed)
   */
  async verifySignature(
    extensionId: string,
    packageData: ArrayBuffer,
    signature?: string
  ): Promise<{
    verified: boolean;
    signer?: string;
    timestamp?: Date;
    error?: string;
  }> {
    if (!signature) {
      return {
        verified: false,
        error: 'Extension is not signed',
      };
    }

    // In a real implementation, this would:
    // 1. Get the publisher's public key
    // 2. Verify the signature using Web Crypto API
    // 3. Check signature timestamp and validity period

    // Placeholder implementation
    console.log('Signature verification not yet implemented');

    return {
      verified: false,
      error: 'Signature verification not implemented',
    };
  }

  // Helper methods

  private isValidSemver(version: string): boolean {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  private isValidPackageName(name: string): boolean {
    const nameRegex = /^[a-z0-9][a-z0-9-]*$/;
    return nameRegex.test(name) && name.length <= 214;
  }

  private isValidActivationEvent(event: string): boolean {
    const validPrefixes = [
      'onLanguage:',
      'onCommand:',
      'onDebug:',
      'onView:',
      'onUri:',
      'workspaceContains:',
      '*', // Activate on startup
    ];

    return validPrefixes.some(prefix => event.startsWith(prefix)) || event === '*';
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }

  private isObfuscated(content: string): boolean {
    // Heuristics for detecting obfuscated code:
    // - Very long lines
    // - High ratio of single-character variable names
    // - Low ratio of whitespace

    const lines = content.split('\n');
    const avgLineLength = content.length / lines.length;

    // Very long average line length suggests minification
    if (avgLineLength > 500) {
      return true;
    }

    // Check whitespace ratio
    const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
    if (whitespaceRatio < 0.05) {
      return true;
    }

    return false;
  }

  private isVersionCompatible(current: string, required: string): boolean {
    // Simple version comparison
    // In production, use a proper semver library

    // Handle ranges like "^1.0.0", "~1.0.0", ">=1.0.0"
    if (required.startsWith('^') || required.startsWith('~') || required.startsWith('>=')) {
      // For now, just strip and compare
      const requiredVersion = required.replace(/^[~^>=]+/, '');
      return this.compareVersions(current, requiredVersion) >= 0;
    }

    // Exact match
    return current === required;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }
}

// Export singleton
export const extensionValidator = new ExtensionValidator();
