import React, { useState } from 'react';
import { Trash2, Power, PowerOff, AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react';
import { useExtensionStore, useExtensionInstallation } from '../../stores/extensionStore';
import { InstalledExtension } from '../../types/extension';
import { cn } from '../../lib/cn';

interface ExtensionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExtensionManager: React.FC<ExtensionManagerProps> = ({ isOpen, onClose }) => {
  const { installedExtensions } = useExtensionStore();
  const { enableExtension, disableExtension, uninstallExtension } = useExtensionInstallation();

  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const filteredExtensions = installedExtensions.filter(ext => {
    switch (filter) {
      case 'enabled':
        return ext.enabled;
      case 'disabled':
        return !ext.enabled;
      default:
        return true;
    }
  });

  const handleToggleExtension = async (extension: InstalledExtension) => {
    try {
      if (extension.enabled) {
        await disableExtension(extension.id);
      } else {
        await enableExtension(extension.id);
      }
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  };

  const handleUninstallExtension = async (extension: InstalledExtension) => {
    if (!confirm(`Are you sure you want to uninstall ${extension.displayName}?`)) {
      return;
    }

    try {
      await uninstallExtension(extension.id);
    } catch (error) {
      console.error('Failed to uninstall extension:', error);
    }
  };

  const getStatusIcon = (extension: InstalledExtension) => {
    switch (extension.state) {
      case 'enabled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disabled':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'installing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>;
      case 'uninstalling':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (extension: InstalledExtension) => {
    switch (extension.state) {
      case 'enabled':
        return 'Enabled';
      case 'disabled':
        return 'Disabled';
      case 'error':
        return 'Error';
      case 'installing':
        return 'Installing...';
      case 'uninstalling':
        return 'Uninstalling...';
      default:
        return extension.state;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background border border-border rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Extension Manager</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                filter === 'all'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All ({installedExtensions.length})
            </button>
            <button
              onClick={() => setFilter('enabled')}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                filter === 'enabled'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Enabled ({installedExtensions.filter(ext => ext.enabled).length})
            </button>
            <button
              onClick={() => setFilter('disabled')}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                filter === 'disabled'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Disabled ({installedExtensions.filter(ext => !ext.enabled).length})
            </button>
          </div>
        </div>

        {/* Extension List */}
        <div className="flex-1 overflow-auto">
          {filteredExtensions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No extensions found</p>
                <p className="text-sm">Install extensions from the marketplace</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredExtensions.map((extension) => (
                <ExtensionItem
                  key={extension.id}
                  extension={extension}
                  onToggle={() => handleToggleExtension(extension)}
                  onUninstall={() => handleUninstallExtension(extension)}
                  statusIcon={getStatusIcon(extension)}
                  statusText={getStatusText(extension)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ExtensionItemProps {
  extension: InstalledExtension;
  onToggle: () => void;
  onUninstall: () => void;
  statusIcon: React.ReactNode;
  statusText: string;
}

const ExtensionItem: React.FC<ExtensionItemProps> = ({
  extension,
  onToggle,
  onUninstall,
  statusIcon,
  statusText
}) => {
  const canToggle = extension.state === 'enabled' || extension.state === 'disabled' || extension.state === 'installed';
  const canUninstall = extension.state === 'enabled' || extension.state === 'disabled' || extension.state === 'installed';

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {statusIcon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{extension.displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {extension.publisher} • v{extension.version}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {extension.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
            {statusText}
          </span>

          <button
            onClick={onToggle}
            disabled={!canToggle}
            className={cn(
              "p-1 rounded transition-colors",
              canToggle
                ? extension.enabled
                  ? "hover:bg-destructive/10 text-destructive"
                  : "hover:bg-green-500/10 text-green-500"
                : "opacity-50 cursor-not-allowed"
            )}
            title={extension.enabled ? "Disable extension" : "Enable extension"}
          >
            {extension.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>

          <button
            onClick={onUninstall}
            disabled={!canUninstall}
            className={cn(
              "p-1 rounded transition-colors",
              canUninstall
                ? "hover:bg-destructive/10 text-destructive"
                : "opacity-50 cursor-not-allowed"
            )}
            title="Uninstall extension"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {extension.error && (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          {extension.error}
        </div>
      )}

      {extension.dependencies && extension.dependencies.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Dependencies: {extension.dependencies.join(', ')}
        </div>
      )}
    </div>
  );
};

export default ExtensionManager;
