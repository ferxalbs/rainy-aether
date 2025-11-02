import {
  OpenVSXExtension,
  OpenVSXQueryRequest,
  OpenVSXQueryResponse,
  ExtensionManifest
} from '../types/extension';

export class OpenVSXRegistryService {
  private readonly baseUrl = 'https://open-vsx.org';
  private readonly vscodeApiUrl = `${this.baseUrl}/vscode/gallery`;
  private readonly unpkgUrl = `${this.baseUrl}/vscode/unpkg`;

  /**
   * Search for extensions in the Open VSX registry
   */
  async searchExtensions(query: string, options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<OpenVSXExtension[]> {
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

      const response = await fetch(`${this.vscodeApiUrl}/extensionquery`, {
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

      return data.results[0].extensions || [];
    } catch (error) {
      console.error('Failed to search extensions:', error);
      throw error;
    }
  }

  /**
   * Get extension details by publisher and name
   */
  async getExtension(publisher: string, name: string): Promise<OpenVSXExtension | null> {
    try {
      const extensions = await this.searchExtensions(`${publisher}.${name}`, { limit: 1 });
      return extensions.length > 0 ? extensions[0] : null;
    } catch (error) {
      console.error('Failed to get extension:', error);
      return null;
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
   * Download extension VSIX package
   */
  async downloadExtension(publisher: string, name: string, version: string): Promise<ArrayBuffer | null> {
    try {
      const downloadUrl = `${this.baseUrl}/vscode/asset/${publisher}/${name}/${version}/Microsoft.VisualStudio.Services.VSIXPackage`;

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(`Failed to download extension: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Failed to download extension:', error);
      return null;
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
  } {
    const issues: string[] = [];

    // Check engine compatibility
    if (extension.engines) {
      if (extension.engines['vscode']) {
        // Simple version check - in a real implementation you'd want proper semver
        const vscodeVersion = extension.engines['vscode'];
        if (vscodeVersion.startsWith('^1.') || vscodeVersion.startsWith('~1.')) {
          issues.push('Extension requires VS Code 1.x which may have compatibility issues');
        }
      }
    }

    // Check for preview/pre-release
    if (extension.preview || extension.preRelease) {
      issues.push('This is a preview/pre-release extension');
    }

    return {
      isCompatible: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const openVSXRegistry = new OpenVSXRegistryService();
