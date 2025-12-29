import React, { useState, useEffect } from 'react';
import { Search, Star, AlertTriangle, CheckCircle, XCircle, Shield, Download } from 'lucide-react';
import { useExtensionStore, useMarketplaceSearch, useExtensionInstallation } from '../../stores/extensionStore';
import { OpenVSXExtension } from '../../types/extension';
import { openVSXRegistry } from '../../services/openVSXRegistry';
import { cn } from '../../lib/cn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ExtensionMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExtensionMarketplace: React.FC<ExtensionMarketplaceProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { searchExtensions } = useMarketplaceSearch();
  const { installExtension, isInstalling, installingExtension } = useExtensionInstallation();
  const { installedExtensions } = useExtensionStore();

  const {
    results: searchResults,
    isSearching,
    error: searchError
  } = useMarketplaceSearch();

  // Load popular extensions when marketplace opens
  useEffect(() => {
    if (isOpen && !searchQuery.trim()) {
      // Search for popular extensions by default (empty query returns popular)
      searchExtensions('', selectedCategory === 'all' ? undefined : selectedCategory);
    }
  }, [isOpen, searchExtensions, selectedCategory]);

  // Search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchExtensions(searchQuery, selectedCategory === 'all' ? undefined : selectedCategory);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else if (isOpen) {
      // When search is cleared, reload popular extensions
      searchExtensions('', selectedCategory === 'all' ? undefined : selectedCategory);
    }
  }, [searchQuery, selectedCategory, searchExtensions, isOpen]);

  const handleInstall = async (extension: OpenVSXExtension) => {
    try {
      await installExtension(extension.publisher.name, extension.name);
    } catch (error) {
      console.error('Failed to install extension:', error);
    }
  };

  const isExtensionInstalled = (publisher: string, name: string): boolean => {
    const extension = installedExtensions.find(ext => ext.publisher === publisher && ext.name === name);
    // Only consider extension as "installed" if it's in a valid installed state
    // Exclude error, installing, and uninstalling states
    if (!extension) return false;

    const validInstalledStates: Array<string> = ['installed', 'enabled', 'disabled', 'enabling', 'disabling'];
    return validInstalledStates.includes(extension.state);
  };

  const getExtensionState = (publisher: string, name: string) => {
    const extension = installedExtensions.find(ext => ext.publisher === publisher && ext.name === name);
    return extension?.state || null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-7xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-border/30">
          <h2 className="text-xl font-semibold">Extension Marketplace</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-5 border-b border-border dark:border-border/30 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search extensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-muted/50 dark:bg-background/20 border border-border dark:border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/60"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-72 h-12 font-medium bg-muted/50 dark:bg-background/20 border border-border dark:border-border/40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Programming Languages">Programming Languages</SelectItem>
                <SelectItem value="Snippets">Snippets</SelectItem>
                <SelectItem value="Linters">Linters</SelectItem>
                <SelectItem value="Themes">Themes</SelectItem>
                <SelectItem value="Debuggers">Debuggers</SelectItem>
                <SelectItem value="Formatters">Formatters</SelectItem>
                <SelectItem value="Keymaps">Keymaps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {searchError && (
            <div className="mb-4 p-3 bg-destructive/10 backdrop-blur-lg border border-destructive/20 rounded-xl text-destructive flex items-center gap-2">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {searchResults
              .filter((extension) => {
                // Filter out invalid extensions with missing required data
                if (!extension || !extension.publisher || !extension.name) {
                  console.warn('Skipping invalid extension:', extension);
                  return false;
                }
                if (!extension.publisher.name || !extension.name) {
                  console.warn('Skipping extension with missing publisher or name:', extension);
                  return false;
                }
                return true;
              })
              .map((extension) => {
                const publisherName = extension.publisher.name;
                const extensionName = extension.name;
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
    <div className="bg-background/5 backdrop-blur-xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/30 rounded-xl p-5 hover:bg-background/10 hover:border-border dark:hover:border-border/50 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{extension.displayName}</h3>
            {!compatibility.isCompatible && (
              <span title="Compatibility issues detected">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {extension.publisher.displayName}
          </p>
        </div>
        <div className="ml-2 flex-shrink-0">
          {getStatusIcon()}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
        {extension.description}
      </p>

      {/* Compatibility and Stats */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{extension.rating?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{extension.downloads ? (extension.downloads >= 1000 ? `${(extension.downloads / 1000).toFixed(1)}k` : extension.downloads) : '0'}</span>
          </div>
          <div className="flex items-center gap-1.5" title={`Compatibility Score: ${compatibility.compatibilityScore}%`}>
            <Shield className={cn("w-3.5 h-3.5", getCompatibilityColor(compatibility.compatibilityScore))} />
            <span className={cn("font-medium", getCompatibilityColor(compatibility.compatibilityScore))}>
              {compatibility.compatibilityScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Compatibility warnings */}
      {compatibility.warnings.length > 0 && (
        <div className="mb-3 p-2.5 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-lg text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <span className="text-yellow-700 dark:text-yellow-400">{compatibility.warnings[0]}</span>
          </div>
        </div>
      )}

      {/* Compatibility issues */}
      {compatibility.issues.length > 0 && (
        <div className="mb-3 p-2.5 bg-destructive/10 backdrop-blur-md border border-destructive/20 rounded-lg text-xs">
          <div className="flex items-start gap-2">
            <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <span className="text-destructive">{compatibility.issues[0]}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {extension.categories && extension.categories.slice(0, 2).map((category) => (
            <span
              key={category}
              className="px-2.5 py-1 text-xs bg-background/20 backdrop-blur-md text-muted-foreground rounded-md border border-border/20"
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
            "px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex-shrink-0",
            installed
              ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
              : isInstalling
                ? "bg-primary/30 text-primary cursor-wait animate-pulse"
                : !compatibility.isCompatible
                  ? "bg-destructive/20 text-destructive cursor-not-allowed border border-destructive/30"
                  : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 hover:shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95"
          )}
        >
          {getInstallButtonText()}
        </button>
      </div>
    </div>
  );
};

export default ExtensionMarketplace;
