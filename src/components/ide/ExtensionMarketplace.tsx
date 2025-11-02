import React, { useState, useEffect } from 'react';
import { Search, Star, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useExtensionStore, useMarketplaceSearch, useExtensionInstallation } from '../../stores/extensionStore';
import { OpenVSXExtension } from '../../types/extension';
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
      await installExtension(extension.publisher.name, extension.name);
    } catch (error) {
      console.error('Failed to install extension:', error);
    }
  };

  const isExtensionInstalled = (publisher: string, name: string): boolean => {
    return installedExtensions.some(ext => ext.publisher === publisher && ext.name === name);
  };

  const getExtensionState = (publisher: string, name: string) => {
    const extension = installedExtensions.find(ext => ext.publisher === publisher && ext.name === name);
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
            {searchResults.map((extension) => {
              const installed = isExtensionInstalled(extension.publisher.name, extension.name);
              const state = getExtensionState(extension.publisher.name, extension.name);
              const isInstallingThis = isInstalling && installingExtension === `${extension.publisher.name}.${extension.name}`;

              return (
                <ExtensionCard
                  key={`${extension.publisher.name}.${extension.name}`}
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

  const getInstallButtonText = () => {
    if (isInstalling) return 'Installing...';
    if (installed) return 'Installed';
    return 'Install';
  };

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{extension.displayName}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {extension.publisher.displayName}
          </p>
        </div>
        {getStatusIcon()}
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {extension.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className="w-3 h-3" />
          {extension.rating?.toFixed(1) || 'N/A'}
          <span>({extension.downloads?.toLocaleString() || 0})</span>
        </div>

        <button
          onClick={onInstall}
          disabled={installed || isInstalling}
          className={cn(
            "px-3 py-1 text-xs rounded transition-colors",
            installed
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : isInstalling
                ? "bg-primary/50 text-primary cursor-wait"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {getInstallButtonText()}
        </button>
      </div>

      {extension.categories && extension.categories.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {extension.categories.slice(0, 2).map((category) => (
            <span
              key={category}
              className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
            >
              {category}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExtensionMarketplace;
