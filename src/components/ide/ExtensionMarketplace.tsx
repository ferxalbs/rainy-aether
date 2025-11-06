import React, { useState, useEffect } from 'react';
import { Search, Star, AlertTriangle, CheckCircle, XCircle, Shield, TrendingUp, Download } from 'lucide-react';
import { useExtensionStore, useMarketplaceSearch, useExtensionInstallation } from '../../stores/extensionStore';
import { OpenVSXExtension } from '../../types/extension';
import { openVSXRegistry } from '../../services/openVSXRegistry';
import { cn } from '../../lib/cn';

interface ExtensionMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExtensionMarketplace: React.FC<ExtensionMarketplaceProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { searchExtensions, clearSearchResults } = useMarketplaceSearch();
  const { installExtension, isInstalling, installingExtension } = useExtensionInstallation();
  const { installedExtensions } = useExtensionStore();

  const {
    results: searchResults,
    isSearching,
    error: searchError
  } = useMarketplaceSearch();

  // Search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchExtensions(searchQuery, selectedCategory || undefined);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      clearSearchResults();
    }
  }, [searchQuery, selectedCategory, searchExtensions, clearSearchResults]);

  const handleInstall = async (extension: OpenVSXExtension) => {
    try {
      // Validate required fields
      if (!extension.publisher?.publisherName || !extension.extensionName) {
        throw new Error('Invalid extension data: missing publisher or name');
      }
      await installExtension(extension.publisher.publisherName, extension.extensionName);
    } catch (error) {
      console.error('Failed to install extension:', error);
      alert(`Failed to install extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const isExtensionInstalled = (publisherName: string, extensionName: string): boolean => {
    return installedExtensions.some(ext => ext.publisher === publisherName && ext.name === extensionName);
  };

  const getExtensionState = (publisherName: string, extensionName: string) => {
    const extension = installedExtensions.find(ext => ext.publisher === publisherName && ext.name === extensionName);
    return extension?.state || null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background border border-border rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Extension Marketplace</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            ✕
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search extensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Categories</option>
              <option value="Programming Languages">Programming Languages</option>
              <option value="Snippets">Snippets</option>
              <option value="Linters">Linters</option>
              <option value="Themes">Themes</option>
              <option value="Debuggers">Debuggers</option>
              <option value="Formatters">Formatters</option>
              <option value="Keymaps">Keymaps</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {searchError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {searchError}
            </div>
          )}

          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Searching...</span>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              No extensions found for "{searchQuery}"
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults
              .filter(ext => ext.publisher?.publisherName && ext.extensionName) // Filter out invalid extensions
              .map((extension) => {
                const publisherName = extension.publisher.publisherName;
                const extensionName = extension.extensionName;
                const extensionId = `${publisherName}.${extensionName}`;

                const installed = isExtensionInstalled(publisherName, extensionName);
                const state = getExtensionState(publisherName, extensionName);
                const isInstallingThis = isInstalling && installingExtension === extensionId;

                return (
                  <ExtensionCard
                    key={extensionId}
                    extension={extension}
                    installed={installed}
                    state={state}
                    isInstalling={isInstallingThis}
                    onInstall={() => handleInstall(extension)}
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExtensionCardProps {
  extension: OpenVSXExtension;
  installed: boolean;
  state: string | null;
  isInstalling: boolean;
  onInstall: () => void;
}

const ExtensionCard: React.FC<ExtensionCardProps> = ({
  extension,
  installed,
  state,
  isInstalling,
  onInstall
}) => {
  // Get compatibility information
  const compatibility = openVSXRegistry.validateExtensionCompatibility(extension);

  // Get download count from extension
  const getDownloadCount = (): number => {
    if (extension.downloads !== undefined) {
      return extension.downloads;
    }
    // Check statistics array
    if (extension.statistics) {
      const downloadStat = extension.statistics.find(
        stat => stat.statisticName === 'install' || stat.statisticName === 'downloads'
      );
      if (downloadStat) {
        return downloadStat.value;
      }
    }
    return 0;
  };

  const downloadCount = getDownloadCount();

  const getStatusIcon = () => {
    if (isInstalling) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>;
    }

    switch (state) {
      case 'enabled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disabled':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getInstallButtonText = () => {
    if (isInstalling) return 'Installing...';
    if (installed) return 'Installed';
    return 'Install';
  };

  const canInstall = compatibility.isCompatible && !installed && !isInstalling;

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{extension.displayName}</h3>
            {!compatibility.isCompatible && (
              <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" title="Compatibility issues detected" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {extension.publisher.displayName}
          </p>
        </div>
        {getStatusIcon()}
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {extension.shortDescription || extension.description || 'No description available'}
      </p>

      {/* Compatibility and Stats */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>{extension.rating?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{downloadCount >= 1000 ? `${(downloadCount / 1000).toFixed(1)}k` : downloadCount}</span>
          </div>
          <div className="flex items-center gap-1" title={`Compatibility Score: ${compatibility.compatibilityScore}%`}>
            <Shield className={cn("w-3 h-3", getCompatibilityColor(compatibility.compatibilityScore))} />
            <span className={getCompatibilityColor(compatibility.compatibilityScore)}>
              {compatibility.compatibilityScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Compatibility warnings */}
      {compatibility.warnings.length > 0 && (
        <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
          <div className="flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
            <span className="text-yellow-700 dark:text-yellow-400">{compatibility.warnings[0]}</span>
          </div>
        </div>
      )}

      {/* Compatibility issues */}
      {compatibility.issues.length > 0 && (
        <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
          <div className="flex items-start gap-1">
            <XCircle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
            <span className="text-destructive">{compatibility.issues[0]}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {extension.categories && extension.categories.slice(0, 2).map((category) => (
            <span
              key={category}
              className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
            >
              {category}
            </span>
          ))}
        </div>

        <button
          onClick={onInstall}
          disabled={!canInstall}
          title={!compatibility.isCompatible ? `Cannot install: ${compatibility.issues.join(', ')}` : ''}
          className={cn(
            "px-3 py-1 text-xs rounded transition-colors",
            installed
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : isInstalling
                ? "bg-primary/50 text-primary cursor-wait"
                : !compatibility.isCompatible
                  ? "bg-destructive/20 text-destructive cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {getInstallButtonText()}
        </button>
      </div>
    </div>
  );
};

export default ExtensionMarketplace;
