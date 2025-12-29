import React, { useState, useRef, useEffect, memo } from 'react';
import { Trash2, Power, PowerOff, AlertTriangle, CheckCircle, XCircle, Package, Activity, RefreshCw, Settings, Shield, Zap, Clock } from 'lucide-react';
import { useExtensionStore, useExtensionInstallation } from '../../stores/extensionStore';
import { InstalledExtension } from '../../types/extension';
import { extensionManager } from '../../services/extensionManager';
import { cn } from '../../lib/cn';
import { useExtensionConfig, setStartupActivationMode } from '../../stores/extensionConfigStore';

interface ExtensionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExtensionManagerComponent: React.FC<ExtensionManagerProps> = ({ isOpen, onClose }) => {
  const { installedExtensions, refreshExtensions } = useExtensionStore();
  const { enableExtension, disableExtension, uninstallExtension } = useExtensionInstallation();
  const extensionConfig = useExtensionConfig();

  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [healthReport, setHealthReport] = useState(extensionManager.getHealthReport());
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [startupModeError, setStartupModeError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

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

  const handleUninstallExtension = async (extension: InstalledExtension, forceDelete: boolean = false) => {
    // Determine if this is a stuck extension that needs force deletion
    const isStuck = extension.state === 'error' || extension.state === 'installing';
    const shouldForce = forceDelete || isStuck;

    let confirmMessage = `Are you sure you want to uninstall ${extension.displayName}?`;
    if (isStuck && !forceDelete) {
      confirmMessage = `Extension "${extension.displayName}" appears to be in an error state. Force uninstall?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await uninstallExtension(extension.id, shouldForce);
      // Refresh health report
      setHealthReport(extensionManager.getHealthReport());
    } catch (error) {
      console.error('Failed to uninstall extension:', error);

      // If uninstall failed and not already forcing, offer to force delete
      if (!shouldForce) {
        const forceConfirm = confirm(
          `Normal uninstall failed. Force delete "${extension.displayName}"? This will remove all traces of the extension.`
        );
        if (forceConfirm) {
          await handleUninstallExtension(extension, true);
        }
      }
    }
  };

  const handleRefresh = () => {
    refreshExtensions();
    setHealthReport(extensionManager.getHealthReport());
  };

  const handleToggleStartupMode = async () => {
    try {
      setStartupModeError(null);
      const newMode = extensionConfig.startupActivationMode === 'auto' ? 'manual' : 'auto';
      await setStartupActivationMode(newMode);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change startup activation mode';
      console.error('Failed to toggle startup mode:', error);
      setStartupModeError(errorMessage);
      // Clear any existing timeout before setting a new one
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      // Auto-clear error after 5 seconds
      errorTimeoutRef.current = setTimeout(() => {
        setStartupModeError(null);
        errorTimeoutRef.current = null;
      }, 5000);
    }
  };

  const handleCleanupAll = async () => {
    // Find all extensions in error or stuck states
    const stuckExtensions = installedExtensions.filter(
      ext => ext.state === 'error' || ext.state === 'installing'
    );

    if (stuckExtensions.length === 0) {
      alert('No extensions require cleanup.');
      return;
    }

    const confirmMessage = `Found ${stuckExtensions.length} extension(s) in error/stuck state:\n\n${stuckExtensions.map(e => `• ${e.displayName}`).join('\n')}\n\nRemove all these extensions?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Uninstall all stuck extensions
    for (const ext of stuckExtensions) {
      try {
        await uninstallExtension(ext.id, true);
      } catch (error) {
        console.error(`Failed to cleanup extension ${ext.id}:`, error);
      }
    }

    // Refresh after cleanup
    handleRefresh();
    alert(`Cleanup complete. Removed ${stuckExtensions.length} extension(s).`);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-7xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border dark:border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Extension Manager</h2>
            <div className="flex items-center gap-2">
              {installedExtensions.some(ext => ext.state === 'error' || ext.state === 'installing') && (
                <button
                  onClick={handleCleanupAll}
                  className="px-3 py-1.5 text-xs bg-destructive/10 backdrop-blur-md text-destructive hover:bg-destructive/20 rounded-lg transition-all duration-200 hover:scale-105 border border-destructive/20"
                  title="Remove all extensions in error/stuck state"
                >
                  Clean Up All
                </button>
              )}
              <button
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  showConfigPanel ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-background/20 hover:backdrop-blur-lg hover:scale-105"
                )}
                title="Extension Configuration"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 hover:scale-105"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 hover:scale-105"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Config Panel */}
          {showConfigPanel && (
            <div className="mt-4 p-4 bg-background/8 backdrop-blur-lg backdrop-saturate-150 rounded-xl border border-border/30 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-medium">Startup Activation</span>
                </div>
                <button
                  onClick={handleToggleStartupMode}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg transition-all duration-200 hover:scale-105 font-medium",
                    extensionConfig.startupActivationMode === 'auto'
                      ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/15"
                      : "bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/15"
                  )}
                >
                  {extensionConfig.startupActivationMode === 'auto' ? 'Automatic' : 'Manual'}
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-medium">Security Level</span>
                </div>
                <span className="px-3 py-1.5 text-xs bg-background/20 backdrop-blur-md rounded-lg capitalize border border-border/20">
                  {extensionConfig.securityLevel}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">Loading Strategy</span>
                </div>
                <span className="px-3 py-1.5 text-xs bg-background/20 backdrop-blur-md rounded-lg capitalize border border-border/20">
                  {extensionConfig.loadingStrategy}
                </span>
              </div>

              {extensionConfig.startupActivationMode === 'manual' && (
                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p>
                      Manual mode: Extensions require activation via Enable/Disable buttons each session.
                      Switch to Automatic to restore extensions on startup.
                    </p>
                  </div>
                </div>
              )}

              {startupModeError && (
                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 backdrop-blur-md p-2.5 rounded-lg border border-destructive/20">
                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p>{startupModeError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Health Report */}
          {healthReport.total > 0 && !showConfigPanel && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Health:</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>{healthReport.healthy} Healthy</span>
              </div>
              {healthReport.degraded > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>{healthReport.degraded} Degraded</span>
                </div>
              )}
              {healthReport.critical > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-destructive"></div>
                  <span>{healthReport.critical} Critical</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="p-5 border-b border-border dark:border-border/30">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                filter === 'all'
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-background/10 backdrop-blur-md text-muted-foreground hover:bg-background/20 hover:text-foreground border border-border/30"
              )}
            >
              All ({installedExtensions.length})
            </button>
            <button
              onClick={() => setFilter('enabled')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                filter === 'enabled'
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-background/10 backdrop-blur-md text-muted-foreground hover:bg-background/20 hover:text-foreground border border-border/30"
              )}
            >
              Enabled ({installedExtensions.filter(ext => ext.enabled).length})
            </button>
            <button
              onClick={() => setFilter('disabled')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                filter === 'disabled'
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-background/10 backdrop-blur-md text-muted-foreground hover:bg-background/20 hover:text-foreground border border-border/30"
              )}
            >
              Disabled ({installedExtensions.filter(ext => !ext.enabled).length})
            </button>
          </div>
        </div>

        {/* Extension List */}
        <div className="flex-1 overflow-auto py-2">
          {filteredExtensions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No extensions found</p>
                <p className="text-sm">Install extensions from the marketplace</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
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

// Memoize ExtensionManager to prevent unnecessary re-renders
const ExtensionManager = memo(
  ExtensionManagerComponent,
  (prevProps, nextProps) => prevProps.isOpen === nextProps.isOpen
);

const ExtensionItemComponent: React.FC<ExtensionItemProps> = ({
  extension,
  onToggle,
  onUninstall,
  statusIcon,
  statusText
}) => {
  const canToggle = extension.state === 'enabled' || extension.state === 'disabled' || extension.state === 'installed';
  // Always allow uninstalling, even in error/stuck states
  const canUninstall = true;
  const isStuckOrError = extension.state === 'error' || extension.state === 'installing';

  // Get health information
  const health = extensionManager.getExtensionHealth(extension.id);

  const getHealthColor = () => {
    if (!health) return 'bg-gray-500';
    if (health.healthScore >= 80) return 'bg-green-500';
    if (health.healthScore >= 60) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  return (
    <div className={cn(
      "p-5 bg-background/5 backdrop-blur-lg backdrop-saturate-150 hover:bg-background/10 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5 mx-4 my-2 rounded-xl border-2 dark:border border-border dark:border-border/20 hover:border-border dark:hover:border-border/40",
      isStuckOrError && "border-l-4 border-l-destructive"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="shrink-0">
            {statusIcon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{extension.displayName}</h3>
              {isStuckOrError && (
                <span className="px-2 py-0.5 text-xs bg-destructive/10 backdrop-blur-md text-destructive rounded-md border border-destructive/20">
                  Action Required
                </span>
              )}
              {health && health.healthScore < 100 && !isStuckOrError && (
                <div className="flex items-center gap-1.5" title={`Health Score: ${health.healthScore}%`}>
                  <div className={cn("w-2 h-2 rounded-full", getHealthColor())}></div>
                  <span className="text-xs text-muted-foreground font-medium">{health.healthScore}%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {extension.publisher} • v{extension.version}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {extension.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <span className="text-xs text-muted-foreground px-3 py-1.5 bg-background/20 backdrop-blur-md rounded-lg border border-border/20 font-medium">
            {statusText}
          </span>

          <button
            onClick={onToggle}
            disabled={!canToggle}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              canToggle
                ? extension.enabled
                  ? "hover:bg-destructive/10 text-destructive hover:scale-110 active:scale-95"
                  : "hover:bg-green-500/10 text-green-500 hover:scale-110 active:scale-95"
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
              "p-2 rounded-lg transition-all duration-200",
              canUninstall
                ? "hover:bg-destructive/10 text-destructive hover:scale-110 active:scale-95"
                : "opacity-50 cursor-not-allowed"
            )}
            title="Uninstall extension"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {extension.error && (
        <div className="mt-3 p-3 bg-destructive/10 backdrop-blur-md border border-destructive/20 rounded-lg text-xs text-destructive">
          {extension.error}
        </div>
      )}

      {extension.dependencies && extension.dependencies.length > 0 && (
        <div className="mt-3 p-2.5 bg-background/10 backdrop-blur-md border border-border/20 rounded-lg text-xs text-muted-foreground">
          <span className="font-medium">Dependencies:</span> {extension.dependencies.join(', ')}
        </div>
      )}
    </div>
  );
};

// Memoize ExtensionItem to prevent unnecessary re-renders
const ExtensionItem = memo(
  ExtensionItemComponent,
  (prevProps, nextProps) =>
    prevProps.extension.id === nextProps.extension.id &&
    prevProps.extension.state === nextProps.extension.state &&
    prevProps.extension.enabled === nextProps.extension.enabled &&
    prevProps.statusText === nextProps.statusText
);

export default ExtensionManager;
