import {
  OpenVSXExtension,
  OpenVSXQueryRequest,
  OpenVSXQueryResponse,
  ExtensionManifest
} from '../types/extension';

interface CachedSearchResult {
  results: OpenVSXExtension[];
  timestamp: number;
}

interface ExtensionCache {
  extension: OpenVSXExtension;
  timestamp: number;
}

export class OpenVSXRegistryService {
  private readonly baseUrl = 'https://open-vsx.org';
  private readonly vscodeApiUrl = `${this.baseUrl}/vscode/gallery`;
  private readonly unpkgUrl = `${this.baseUrl}/vscode/unpkg`;
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  // Cache storage
  private searchCache = new Map<string, CachedSearchResult>();
  private extensionCache = new Map<string, ExtensionCache>();

  /**
   * Search for extensions in the Open VSX registry with caching and retry logic
   */
  async searchExtensions(query: string, options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<OpenVSXExtension[]> {
    // Create cache key
    const cacheKey = `${query}:${options.category || ''}:${options.limit || 50}:${options.offset || 0}`;

    // Check cache
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.results;
    }

    try {
      const criteria = [
        {
          filterType: 8, // SearchText filter
          value: query
        }
      ];

      if (options.category) {
        criteria.push({
          filterType: 5, // Category filter
          value: options.category
        });
      }

      const request: OpenVSXQueryRequest = {
        filters: [{
          criteria,
          pageNumber: Math.floor((options.offset || 0) / (options.limit || 50)),
          pageSize: options.limit || 50,
          sortBy: 0, // Relevance
          sortOrder: 0 // Descending
        }]
      };

      const response = await this.fetchWithRetry(`${this.vscodeApiUrl}/extensionquery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Open VSX API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenVSXQueryResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      const rawResults = data.results[0].extensions || [];

      // Validate and filter extensions with proper data
      const results = rawResults.filter((ext): ext is OpenVSXExtension => {
        // Validate required fields
        if (!ext || typeof ext !== 'object') {
          console.warn('Invalid extension data (not an object):', ext);
          return false;
        }

        if (!ext.name || typeof ext.name !== 'string') {
          console.warn('Extension missing valid name:', ext);
          return false;
        }

        if (!ext.publisher || typeof ext.publisher !== 'object') {
          console.warn('Extension missing valid publisher:', ext);
          return false;
        }

        if (!ext.publisher.name || typeof ext.publisher.name !== 'string') {
          console.warn('Extension publisher missing valid name:', ext);
          return false;
        }

        if (!ext.version || typeof ext.version !== 'string') {
          console.warn('Extension missing valid version:', ext);
          return false;
        }

        // All required fields are present
        return true;
      });

      // Log if we filtered out any invalid extensions
      if (results.length < rawResults.length) {
        console.warn(`Filtered out ${rawResults.length - results.length} invalid extensions from search results`);
      }

      // Cache the results
      this.searchCache.set(cacheKey, {
        results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('Failed to search extensions:', error);
      throw new Error(`Failed to search extensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get extension details by publisher and name with caching
   */
  async getExtension(publisher: string, name: string): Promise<OpenVSXExtension | null> {
    const cacheKey = `${publisher}.${name}`;

    // Check cache
    const cached = this.extensionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.extension;
    }

    try {
      const extensions = await this.searchExtensions(`${publisher}.${name}`, { limit: 1 });
      const extension = extensions.length > 0 ? extensions[0] : null;

      if (extension) {
        // Cache the extension
        this.extensionCache.set(cacheKey, {
          extension,
          timestamp: Date.now()
        });
      }

      return extension;
    } catch (error) {
      console.error('Failed to get extension:', error);
      throw new Error(`Failed to get extension ${publisher}.${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get extension manifest from the VSIX package
   */
  async getExtensionManifest(publisher: string, name: string, version: string): Promise<ExtensionManifest | null> {
    try {
      // First get the extension to find available assets
      const extension = await this.getExtension(publisher, name);
      if (!extension) {
        return null;
      }

      // Get the manifest from unpkg URL
      const manifestUrl = `${this.unpkgUrl}/${publisher}/${name}/${version}/extension/package.json`;
      const response = await fetch(manifestUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get extension manifest:', error);
      return null;
    }
  }

  /**
   * Download extension VSIX package with retry logic
   */
  async downloadExtension(publisher: string, name: string, version: string): Promise<ArrayBuffer | null> {
    try {
      const downloadUrl = `${this.baseUrl}/vscode/asset/${publisher}/${name}/${version}/Microsoft.VisualStudio.Services.VSIXPackage`;

      const response = await this.fetchWithRetry(downloadUrl);

      if (!response.ok) {
        throw new Error(`Failed to download extension: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Validate download size
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Downloaded extension package is empty');
      }

      return arrayBuffer;
    } catch (error) {
      console.error('Failed to download extension:', error);
      throw new Error(`Failed to download extension ${publisher}.${name}@${version}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get extension icon URL
   */
  getExtensionIconUrl(publisher: string, name: string, version: string): string {
    return `${this.baseUrl}/vscode/asset/${publisher}/${name}/${version}/Microsoft.VisualStudio.Services.Icons.Default`;
  }

  /**
   * Get extension README URL
   */
  getExtensionReadmeUrl(publisher: string, name: string, version: string): string {
    return `${this.unpkgUrl}/${publisher}/${name}/${version}/extension/README.md`;
  }

  /**
   * Get popular categories
   */
  getCategories(): string[] {
    return [
      'Programming Languages',
      'Snippets',
      'Linters',
      'Themes',
      'Debuggers',
      'Formatters',
      'Keymaps',
      'Other'
    ];
  }

  /**
   * Validate extension compatibility with current environment
   */
  validateExtensionCompatibility(extension: OpenVSXExtension): {
    isCompatible: boolean;
    issues: string[];
    warnings: string[];
    compatibilityScore: number;
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    let compatibilityScore = 100;

    // Check if extension data is complete
    if (!extension.publisher || !extension.name || !extension.version) {
      issues.push('Extension metadata is incomplete');
      compatibilityScore -= 50;
    }

    // Check engine compatibility
    if (extension.engines) {
      if (extension.engines['vscode']) {
        const vscodeVersion = extension.engines['vscode'];

        // Check for very old versions
        if (vscodeVersion.includes('0.') || vscodeVersion.startsWith('0.')) {
          issues.push('Extension targets very old VS Code version (0.x)');
          compatibilityScore -= 30;
        } else if (vscodeVersion.startsWith('^1.') || vscodeVersion.startsWith('~1.')) {
          warnings.push('Extension requires VS Code 1.x - may have compatibility issues');
          compatibilityScore -= 10;
        }
      }
    }

    // Check for preview/pre-release
    if (extension.preview || extension.preRelease) {
      warnings.push('This is a preview/pre-release extension - may be unstable');
      compatibilityScore -= 5;
    }

    // Check extension age
    if (extension.published) {
      const publishedDate = new Date(extension.published);
      const ageInYears = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (ageInYears > 3) {
        warnings.push('Extension has not been updated in over 3 years');
        compatibilityScore -= 15;
      }
    }

    // Check dependencies
    if (extension.extensionDependencies && extension.extensionDependencies.length > 10) {
      warnings.push('Extension has many dependencies - may cause conflicts');
      compatibilityScore -= 5;
    }

    // Check download count and rating for quality indicators
    if (extension.downloads !== undefined && extension.downloads < 100) {
      warnings.push('Extension has very few downloads - use with caution');
      compatibilityScore -= 10;
    }

    if (extension.rating !== undefined && extension.rating < 2.5) {
      warnings.push('Extension has low rating - may have quality issues');
      compatibilityScore -= 15;
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      warnings,
      compatibilityScore: Math.max(0, compatibilityScore)
    };
  }

  /**
   * Fetch with retry logic for network resilience
   */
  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');
        console.warn(`Fetch attempt ${attempt + 1}/${this.maxRetries} failed:`, lastError.message);

        if (attempt < this.maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.extensionCache.clear();
  }

  /**
   * Clear cache for a specific extension
   */
  clearExtensionCache(publisher: string, name: string): void {
    const cacheKey = `${publisher}.${name}`;
    this.extensionCache.delete(cacheKey);
  }

  /**
   * Compare two version strings (basic semver comparison)
   */
  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/[^\d.]/g, '').split('.').map(Number);
    const parts2 = v2.replace(/[^\d.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Check if an extension update is available
   */
  hasUpdate(currentVersion: string, latestVersion: string): boolean {
    return this.compareVersions(latestVersion, currentVersion) > 0;
  }
}

// Export singleton instance
export const openVSXRegistry = new OpenVSXRegistryService();
