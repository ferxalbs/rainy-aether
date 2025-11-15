/**
 * Extension Configuration Panel
 *
 * Advanced configuration UI for the extension system.
 * Provides granular control over startup behavior, security, performance, and more.
 */

import React from 'react';
import {
  Shield,
  Zap,
  Clock,
  AlertTriangle,
  Activity,
  Settings,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useExtensionConfig,
  setStartupActivationMode,
  setStartupActivationDelay,
  setLoadingStrategy,
  setSecurityLevel,
  setDisableThirdParty,
  setMaxActiveExtensions,
  setEnablePerformanceMonitoring,
  setAutoDisableSlowExtensions,
  setPerformanceThreshold,
  setErrorHandling,
  setAutoCleanupErrorExtensions,
  setShowDetailedErrors,
  setVerboseLogging,
  setEnableHotReload,
  setAllowUnsignedExtensions,
  setShowLoadingProgress,
  setShowActivationNotifications,
  setAutoUpdateExtensions,
  resetExtensionConfig,
  type ExtensionStartupMode,
  type ExtensionLoadingStrategy,
  type ExtensionSecurityLevel,
  type ExtensionErrorHandling
} from '@/stores/extensionConfigStore';

export const ExtensionConfigPanel: React.FC = () => {
  const config = useExtensionConfig();

  const handleReset = async () => {
    if (confirm('Reset all extension configuration to defaults? This cannot be undone.')) {
      await resetExtensionConfig();
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Extension Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how extensions are loaded, secured, and managed
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Startup Behavior Section */}
      <Section
        icon={<Zap className="w-5 h-5 text-primary" />}
        title="Startup Behavior"
        description="Control how extensions are activated when the IDE starts"
      >
        <ConfigRow
          label="Startup Activation Mode"
          description="Automatically activate enabled extensions or require manual activation"
        >
          <select
            value={config.startupActivationMode}
            onChange={(e) => setStartupActivationMode(e.target.value as ExtensionStartupMode)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded hover:border-primary transition-colors"
          >
            <option value="auto">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </ConfigRow>

        <ConfigRow
          label="Startup Activation Delay"
          description="Delay in milliseconds between loading each extension (0 = no delay)"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="10000"
              step="100"
              value={config.startupActivationDelay}
              onChange={(e) => setStartupActivationDelay(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-background border border-border rounded w-24 hover:border-primary transition-colors"
            />
            <span className="text-sm text-muted-foreground">ms</span>
          </div>
        </ConfigRow>

        <ConfigRow
          label="Loading Strategy"
          description="How extensions are loaded during startup"
        >
          <select
            value={config.loadingStrategy}
            onChange={(e) => setLoadingStrategy(e.target.value as ExtensionLoadingStrategy)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded hover:border-primary transition-colors"
          >
            <option value="parallel">Parallel (faster)</option>
            <option value="sequential">Sequential (safer)</option>
            <option value="lazy">Lazy (on-demand)</option>
          </select>
        </ConfigRow>
      </Section>

      {/* Security & Safety Section */}
      <Section
        icon={<Shield className="w-5 h-5 text-primary" />}
        title="Security & Safety"
        description="Control which extensions are allowed to run"
      >
        <ConfigRow
          label="Security Level"
          description="Determines which extensions can execute"
        >
          <select
            value={config.securityLevel}
            onChange={(e) => setSecurityLevel(e.target.value as ExtensionSecurityLevel)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded hover:border-primary transition-colors"
          >
            <option value="unrestricted">Unrestricted</option>
            <option value="safe">Safe (built-in only)</option>
            <option value="restricted">Restricted (whitelist only)</option>
          </select>
        </ConfigRow>

        <ConfigRow
          label="Disable Third-Party Extensions"
          description="Only allow Rainy Aether built-in extensions"
        >
          <Toggle
            checked={config.disableThirdParty}
            onChange={setDisableThirdParty}
          />
        </ConfigRow>

        <ConfigRow
          label="Allow Unsigned Extensions"
          description="Allow development/unsigned extensions to run"
        >
          <Toggle
            checked={config.allowUnsignedExtensions}
            onChange={setAllowUnsignedExtensions}
          />
        </ConfigRow>
      </Section>

      {/* Performance & Resources Section */}
      <Section
        icon={<Activity className="w-5 h-5 text-primary" />}
        title="Performance & Resources"
        description="Manage extension resource usage and performance"
      >
        <ConfigRow
          label="Max Active Extensions"
          description="Maximum number of extensions that can be active (0 = unlimited)"
        >
          <input
            type="number"
            min="0"
            max="100"
            value={config.maxActiveExtensions}
            onChange={(e) => setMaxActiveExtensions(Number(e.target.value))}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded w-24 hover:border-primary transition-colors"
          />
        </ConfigRow>

        <ConfigRow
          label="Enable Performance Monitoring"
          description="Monitor extension performance and resource usage"
        >
          <Toggle
            checked={config.enablePerformanceMonitoring}
            onChange={setEnablePerformanceMonitoring}
          />
        </ConfigRow>

        <ConfigRow
          label="Auto-Disable Slow Extensions"
          description="Automatically disable extensions that exceed performance thresholds"
        >
          <Toggle
            checked={config.autoDisableSlowExtensions}
            onChange={setAutoDisableSlowExtensions}
          />
        </ConfigRow>

        <ConfigRow
          label="Performance Threshold"
          description="Maximum load time in milliseconds before extension is considered slow"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1000"
              max="30000"
              step="1000"
              value={config.performanceThreshold}
              onChange={(e) => setPerformanceThreshold(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-background border border-border rounded w-24 hover:border-primary transition-colors"
            />
            <span className="text-sm text-muted-foreground">ms</span>
          </div>
        </ConfigRow>
      </Section>

      {/* Error Handling Section */}
      <Section
        icon={<AlertTriangle className="w-5 h-5 text-primary" />}
        title="Error Handling"
        description="Control how extension errors are handled"
      >
        <ConfigRow
          label="Error Handling Strategy"
          description="What to do when an extension fails to load"
        >
          <select
            value={config.errorHandling}
            onChange={(e) => setErrorHandling(e.target.value as ExtensionErrorHandling)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded hover:border-primary transition-colors"
          >
            <option value="continue">Continue with others</option>
            <option value="stop">Stop all loading</option>
            <option value="isolate">Isolate and continue</option>
          </select>
        </ConfigRow>

        <ConfigRow
          label="Auto-Cleanup Error Extensions"
          description="Automatically remove extensions in error state on startup"
        >
          <Toggle
            checked={config.autoCleanupErrorExtensions}
            onChange={setAutoCleanupErrorExtensions}
          />
        </ConfigRow>

        <ConfigRow
          label="Show Detailed Errors"
          description="Display detailed error messages for extension failures"
        >
          <Toggle
            checked={config.showDetailedErrors}
            onChange={setShowDetailedErrors}
          />
        </ConfigRow>
      </Section>

      {/* Developer Options Section */}
      <Section
        icon={<Settings className="w-5 h-5 text-primary" />}
        title="Developer Options"
        description="Advanced options for extension developers"
      >
        <ConfigRow
          label="Verbose Logging"
          description="Enable detailed logging for the extension system"
        >
          <Toggle
            checked={config.verboseLogging}
            onChange={setVerboseLogging}
          />
        </ConfigRow>

        <ConfigRow
          label="Enable Hot Reload"
          description="Automatically reload extensions when files change (development mode)"
        >
          <Toggle
            checked={config.enableHotReload}
            onChange={setEnableHotReload}
          />
        </ConfigRow>
      </Section>

      {/* User Experience Section */}
      <Section
        icon={<Eye className="w-5 h-5 text-primary" />}
        title="User Experience"
        description="Configure extension notifications and feedback"
      >
        <ConfigRow
          label="Show Loading Progress"
          description="Display extension loading progress during startup"
        >
          <Toggle
            checked={config.showLoadingProgress}
            onChange={setShowLoadingProgress}
          />
        </ConfigRow>

        <ConfigRow
          label="Show Activation Notifications"
          description="Notify when extensions are activated or deactivated"
        >
          <Toggle
            checked={config.showActivationNotifications}
            onChange={setShowActivationNotifications}
          />
        </ConfigRow>

        <ConfigRow
          label="Auto-Update Extensions"
          description="Automatically update extensions when updates are available"
        >
          <Toggle
            checked={config.autoUpdateExtensions}
            onChange={setAutoUpdateExtensions}
          />
        </ConfigRow>
      </Section>

      {/* Info Banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Configuration Tips</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use "Manual" startup mode for maximum control over extension loading</li>
              <li>Set security level to "Safe" when installing untrusted extensions</li>
              <li>Enable performance monitoring to identify slow extensions</li>
              <li>Use "Sequential" loading if you experience startup issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, description, children }) => {
  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        {icon}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};

interface ConfigRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

const ConfigRow: React.FC<ConfigRowProps> = ({ label, description, children }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
};

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => Promise<void>;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
};
