// Open VSX Registry Service Types
// Based on actual API response from https://open-vsx.org/vscode/gallery
export interface OpenVSXExtension {
  extensionId: string; // UUID
  extensionName: string; // Unique extension name
  displayName: string;
  shortDescription?: string;
  publisher: {
    publisherName: string; // Unique publisher name
    publisherId: string; // UUID
    displayName: string;
    domain?: string | null;
    isDomainVerified?: boolean | null;
  };
  categories?: string[];
  tags?: string[];
  releaseDate?: string;
  publishedDate?: string;
  lastUpdated?: string;
  flags?: string;
  statistics?: Array<{ statisticName: string; value: number }>;
  versions?: Array<{
    version: string;
    lastUpdated?: string;
    assetUri?: string;
    fallbackAssetUri?: string;
  }>;

  // Additional fields (may not always be present)
  namespace?: string | null; // Often null in API responses
  name?: string | null; // Often null in API responses
  description?: string;
  version?: string;
  license?: string;
  repository?: string;
  bugs?: string;
  homepage?: string;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  extensionDependencies?: string[];
  preview?: boolean;
  preRelease?: boolean;
  downloads?: number;
  rating?: number;
  ratingCount?: number;
}

export interface OpenVSXQueryRequest {
  filters: Array<{
    criteria: Array<{
      filterType: number;
      value: string;
    }>;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: number;
    sortOrder?: number;
  }>;
  assetTypes?: string[];
  flags?: number;
}

export interface OpenVSXQueryResponse {
  results: Array<{
    extensions: OpenVSXExtension[];
    pagingToken?: string;
    resultMetadata: Array<{
      metadataType: string;
      metadataItems: Array<{
        name: string;
        count: number;
      }>;
    }>;
  }>;
}

export interface ExtensionAsset {
  type: string;
  url: string;
  size?: number;
}

export interface ExtensionManifest {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  engines: Record<string, string>;
  main?: string;
  contributes?: any;
  activationEvents?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  [key: string]: any;
}

// Extension Manager Types
export type ExtensionState = 'installing' | 'installed' | 'enabling' | 'enabled' | 'disabling' | 'disabled' | 'uninstalling' | 'uninstalled' | 'error';

export interface InstalledExtension {
  id: string; // `${publisher}.${name}`
  publisher: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  state: ExtensionState;
  installedAt: string;
  enabled: boolean;
  manifest: ExtensionManifest;
  path: string; // Local path where extension is stored
  error?: string;
  dependencies?: string[]; // Extension dependencies
}

export interface ExtensionInstallOptions {
  version?: string;
  force?: boolean; // Force reinstall if already installed
}

export interface ExtensionManagerEvents {
  'extension:installing': (extension: InstalledExtension) => void;
  'extension:installed': (extension: InstalledExtension) => void;
  'extension:enabling': (extension: InstalledExtension) => void;
  'extension:enabled': (extension: InstalledExtension) => void;
  'extension:disabling': (extension: InstalledExtension) => void;
  'extension:disabled': (extension: InstalledExtension) => void;
  'extension:uninstalling': (extension: InstalledExtension) => void;
  'extension:uninstalled': (extension: InstalledExtension) => void;
  'extension:error': (extension: InstalledExtension, error: string) => void;
}
