/**
 * Activation Manager
 *
 * Manages extension activation events, parsing, and triggering.
 * Determines when extensions should be activated based on their activation events.
 */

import {
  ActivationEventType,
  ParsedActivationEvent,
  ExtensionActivationState,
  ExtensionRuntimeState,
} from './types';

/**
 * Activation Manager class
 */
export class ActivationManager {
  private extensionStates: Map<string, ExtensionRuntimeState> = new Map();
  private activationListeners: Map<string, Set<(event: string) => void>> = new Map();

  /**
   * Register an extension
   */
  registerExtension(
    extensionId: string,
    activationEvents: string[],
    worker: Worker | null = null
  ): void {
    const parsedEvents = activationEvents.map(event => this.parseActivationEvent(event));

    const state: ExtensionRuntimeState = {
      extensionId,
      activationState: ExtensionActivationState.NotActivated,
      activationEvents: parsedEvents,
      worker,
      context: null,
    };

    this.extensionStates.set(extensionId, state);
  }

  /**
   * Update extension state
   */
  updateExtensionState(
    extensionId: string,
    updates: Partial<ExtensionRuntimeState>
  ): void {
    const state = this.extensionStates.get(extensionId);
    if (!state) {
      throw new Error(`Extension ${extensionId} is not registered`);
    }

    Object.assign(state, updates);
  }

  /**
   * Get extension state
   */
  getExtensionState(extensionId: string): ExtensionRuntimeState | undefined {
    return this.extensionStates.get(extensionId);
  }

  /**
   * Check if extension should be activated for a given event
   */
  shouldActivate(extensionId: string, event: string): boolean {
    const extensionState = this.extensionStates.get(extensionId);
    if (!extensionState) {
      return false;
    }

    // Already activated
    if (extensionState.activationState === ExtensionActivationState.Activated) {
      return false;
    }

    // Check if any activation event matches
    return extensionState.activationEvents.some(activationEvent => {
      return this.matchesActivationEvent(activationEvent, event);
    });
  }

  /**
   * Get extensions that should be activated for a given event
   */
  getExtensionsToActivate(event: string): string[] {
    const extensions: string[] = [];

    for (const [extensionId] of this.extensionStates) {
      if (this.shouldActivate(extensionId, event)) {
        extensions.push(extensionId);
      }
    }

    return extensions;
  }

  /**
   * Mark extension as activating
   */
  markActivating(extensionId: string): void {
    this.updateExtensionState(extensionId, {
      activationState: ExtensionActivationState.Activating,
    });
  }

  /**
   * Mark extension as activated
   */
  markActivated(extensionId: string): void {
    this.updateExtensionState(extensionId, {
      activationState: ExtensionActivationState.Activated,
      activatedAt: Date.now(),
    });
  }

  /**
   * Mark extension as failed
   */
  markFailed(extensionId: string, error: string): void {
    this.updateExtensionState(extensionId, {
      activationState: ExtensionActivationState.Failed,
      error,
    });
  }

  /**
   * Mark extension as deactivated
   */
  markDeactivated(extensionId: string): void {
    this.updateExtensionState(extensionId, {
      activationState: ExtensionActivationState.Deactivated,
      deactivatedAt: Date.now(),
    });
  }

  /**
   * Unregister an extension
   */
  unregisterExtension(extensionId: string): void {
    this.extensionStates.delete(extensionId);
    this.activationListeners.delete(extensionId);
  }

  /**
   * Parse activation event string
   */
  parseActivationEvent(eventString: string): ParsedActivationEvent {
    // Star event (always activate)
    if (eventString === '*') {
      return {
        type: ActivationEventType.Star,
        raw: eventString,
      };
    }

    // Event with value (e.g., "onLanguage:python")
    const colonIndex = eventString.indexOf(':');
    if (colonIndex !== -1) {
      const type = eventString.substring(0, colonIndex);
      const value = eventString.substring(colonIndex + 1);

      return {
        type: this.normalizeEventType(type),
        value,
        raw: eventString,
      };
    }

    // Simple event (e.g., "onStartupFinished")
    return {
      type: this.normalizeEventType(eventString),
      raw: eventString,
    };
  }

  /**
   * Normalize event type string to enum
   */
  private normalizeEventType(type: string): ActivationEventType | string {
    // Map string to enum
    const typeMap: Record<string, ActivationEventType> = {
      '*': ActivationEventType.Star,
      'workspaceContains': ActivationEventType.WorkspaceContains,
      'onLanguage': ActivationEventType.OnLanguage,
      'onCommand': ActivationEventType.OnCommand,
      'onDebug': ActivationEventType.OnDebug,
      'onDebugResolve': ActivationEventType.OnDebugResolve,
      'onDebugInitialConfigurations': ActivationEventType.OnDebugInitialConfigurations,
      'onView': ActivationEventType.OnView,
      'onUri': ActivationEventType.OnUri,
      'onFileSystem': ActivationEventType.OnFileSystem,
      'onAuthenticationRequest': ActivationEventType.OnAuthenticationRequest,
      'onCustomEditor': ActivationEventType.OnCustomEditor,
      'onWebviewPanel': ActivationEventType.OnWebviewPanel,
      'onStartupFinished': ActivationEventType.OnStartupFinished,
    };

    return typeMap[type] || type;
  }

  /**
   * Check if an event matches an activation event pattern
   */
  private matchesActivationEvent(activationEvent: ParsedActivationEvent, event: string): boolean {
    // Star always matches
    if (activationEvent.type === ActivationEventType.Star) {
      return true;
    }

    // Parse the runtime event
    const runtimeEvent = this.parseActivationEvent(event);

    // Type must match
    if (activationEvent.type !== runtimeEvent.type) {
      return false;
    }

    // If activation event has a value, it must match
    if (activationEvent.value) {
      return activationEvent.value === runtimeEvent.value;
    }

    // No value means any event of this type matches
    return true;
  }

  /**
   * Get all registered extensions
   */
  getAllExtensions(): ExtensionRuntimeState[] {
    return Array.from(this.extensionStates.values());
  }

  /**
   * Get extensions by activation state
   */
  getExtensionsByState(state: ExtensionActivationState): ExtensionRuntimeState[] {
    return this.getAllExtensions().filter(ext => ext.activationState === state);
  }

  /**
   * Get activation statistics
   */
  getStatistics() {
    const all = this.getAllExtensions();
    return {
      total: all.length,
      notActivated: all.filter(e => e.activationState === ExtensionActivationState.NotActivated).length,
      activating: all.filter(e => e.activationState === ExtensionActivationState.Activating).length,
      activated: all.filter(e => e.activationState === ExtensionActivationState.Activated).length,
      failed: all.filter(e => e.activationState === ExtensionActivationState.Failed).length,
      deactivated: all.filter(e => e.activationState === ExtensionActivationState.Deactivated).length,
    };
  }
}

/**
 * Create activation manager
 */
export function createActivationManager(): ActivationManager {
  return new ActivationManager();
}

/**
 * Common activation event helpers
 */
export const ActivationEvents = {
  /**
   * Always activate (on startup)
   */
  star(): string {
    return '*';
  },

  /**
   * Activate when a specific language is opened
   */
  onLanguage(languageId: string): string {
    return `onLanguage:${languageId}`;
  },

  /**
   * Activate when a specific command is executed
   */
  onCommand(commandId: string): string {
    return `onCommand:${commandId}`;
  },

  /**
   * Activate when workspace contains a file matching glob pattern
   */
  workspaceContains(pattern: string): string {
    return `workspaceContains:${pattern}`;
  },

  /**
   * Activate when a specific view is opened
   */
  onView(viewId: string): string {
    return `onView:${viewId}`;
  },

  /**
   * Activate after startup has finished
   */
  onStartupFinished(): string {
    return 'onStartupFinished';
  },

  /**
   * Activate when debug session starts
   */
  onDebug(type?: string): string {
    return type ? `onDebug:${type}` : 'onDebug';
  },

  /**
   * Activate when a specific file system is accessed
   */
  onFileSystem(scheme: string): string {
    return `onFileSystem:${scheme}`;
  },

  /**
   * Activate when a URI with a specific scheme is opened
   */
  onUri(scheme: string): string {
    return `onUri:${scheme}`;
  },
};
