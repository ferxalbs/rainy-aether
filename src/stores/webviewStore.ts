/**
 * Webview Store
 *
 * Manages webview panels for chatbot extensions and other webview-based extensions.
 * Follows the useSyncExternalStore pattern for optimal React 19 integration.
 */

import { useSyncExternalStore } from 'react';

/**
 * Message sent from webview to extension host
 */
export interface WebviewMessage {
  command: string;
  data?: unknown;
}

/**
 * Webview panel configuration
 */
export interface WebviewPanel {
  /** Unique identifier for this webview panel */
  viewId: string;

  /** Extension that owns this webview */
  extensionId: string;

  /** Display title */
  title: string;

  /** Icon for activity bar (Lucide icon name or data URI) */
  icon?: string;

  /** HTML content to render in iframe */
  html: string;

  /** Whether the panel is currently visible */
  visible: boolean;

  /** Whether scripts are enabled */
  enableScripts: boolean;

  /** Whether the panel should retain context when hidden */
  retainContextWhenHidden: boolean;

  /** Message handlers registered by the extension */
  messageHandlers: Set<(message: WebviewMessage) => void>;

  /** Panel metadata */
  metadata?: {
    viewType?: string;
    showOptions?: {
      preserveFocus?: boolean;
      viewColumn?: number;
    };
  };
}

/**
 * Webview state
 */
export interface WebviewState {
  /** All registered webview panels */
  panels: Map<string, WebviewPanel>;

  /** Currently active webview panel ID */
  activeViewId: string | null;

  /** Pending messages (used for buffering before panel is ready) */
  pendingMessages: Map<string, WebviewMessage[]>;
}

// Internal state
let state: WebviewState = {
  panels: new Map(),
  activeViewId: null,
  pendingMessages: new Map(),
};

// Cached snapshot for React
let cachedSnapshot: WebviewState = { ...state };

// Listeners for state changes
const listeners = new Set<() => void>();

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  listeners.forEach(listener => listener());
}

/**
 * Update state immutably
 */
function setState(updater: (prev: WebviewState) => WebviewState) {
  state = updater(state);
  cachedSnapshot = {
    ...state,
    panels: new Map(state.panels),
    pendingMessages: new Map(state.pendingMessages),
  };
  notifyListeners();
}

/**
 * Subscribe to state changes
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get current state snapshot
 */
function getSnapshot(): WebviewState {
  return cachedSnapshot;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new webview panel
 */
function createWebviewPanel(options: {
  viewId: string;
  extensionId: string;
  title: string;
  icon?: string;
  html?: string;
  enableScripts?: boolean;
  retainContextWhenHidden?: boolean;
}): WebviewPanel {
  const panel: WebviewPanel = {
    viewId: options.viewId,
    extensionId: options.extensionId,
    title: options.title,
    icon: options.icon,
    html: options.html || '',
    visible: false,
    enableScripts: options.enableScripts ?? true,
    retainContextWhenHidden: options.retainContextWhenHidden ?? false,
    messageHandlers: new Set(),
  };

  setState(prev => ({
    ...prev,
    panels: new Map(prev.panels).set(options.viewId, panel),
  }));

  return panel;
}

/**
 * Update webview panel HTML content
 */
function updateWebviewHtml(viewId: string, html: string): void {
  setState(prev => {
    const panel = prev.panels.get(viewId);
    if (!panel) return prev;

    const updatedPanel = { ...panel, html };
    const newPanels = new Map(prev.panels);
    newPanels.set(viewId, updatedPanel);

    return {
      ...prev,
      panels: newPanels,
    };
  });
}

/**
 * Update webview panel title
 */
function updateWebviewTitle(viewId: string, title: string): void {
  setState(prev => {
    const panel = prev.panels.get(viewId);
    if (!panel) return prev;

    const updatedPanel = { ...panel, title };
    const newPanels = new Map(prev.panels);
    newPanels.set(viewId, updatedPanel);

    return {
      ...prev,
      panels: newPanels,
    };
  });
}

/**
 * Show a webview panel
 */
function showWebview(viewId: string): void {
  setState(prev => {
    const panel = prev.panels.get(viewId);
    if (!panel) return prev;

    const updatedPanel = { ...panel, visible: true };
    const newPanels = new Map(prev.panels);
    newPanels.set(viewId, updatedPanel);

    return {
      ...prev,
      panels: newPanels,
      activeViewId: viewId,
    };
  });
}

/**
 * Hide a webview panel
 */
function hideWebview(viewId: string): void {
  setState(prev => {
    const panel = prev.panels.get(viewId);
    if (!panel) return prev;

    const updatedPanel = { ...panel, visible: false };
    const newPanels = new Map(prev.panels);
    newPanels.set(viewId, updatedPanel);

    return {
      ...prev,
      panels: newPanels,
      activeViewId: prev.activeViewId === viewId ? null : prev.activeViewId,
    };
  });
}

/**
 * Dispose a webview panel (remove it completely)
 */
function disposeWebview(viewId: string): void {
  setState(prev => {
    const newPanels = new Map(prev.panels);
    newPanels.delete(viewId);

    const newPendingMessages = new Map(prev.pendingMessages);
    newPendingMessages.delete(viewId);

    return {
      ...prev,
      panels: newPanels,
      pendingMessages: newPendingMessages,
      activeViewId: prev.activeViewId === viewId ? null : prev.activeViewId,
    };
  });
}

/**
 * Post a message to a webview panel
 */
function postMessageToWebview(viewId: string, message: unknown): void {
  const panel = state.panels.get(viewId);
  if (!panel) {
    console.warn(`[webviewStore] Cannot post message: panel ${viewId} not found`);
    return;
  }

  // If panel is not visible or not ready, buffer the message
  if (!panel.visible) {
    setState(prev => {
      const pending = prev.pendingMessages.get(viewId) || [];
      const newPendingMessages = new Map(prev.pendingMessages);
      newPendingMessages.set(viewId, [...pending, message as WebviewMessage]);

      return {
        ...prev,
        pendingMessages: newPendingMessages,
      };
    });
    return;
  }

  // Dispatch message to iframe
  // This will be handled by the WebviewPanel component
  const event = new CustomEvent('webview-message', {
    detail: { viewId, message },
  });
  window.dispatchEvent(event);
}

/**
 * Flush pending messages for a webview (called when webview becomes ready)
 */
function flushPendingMessages(viewId: string): void {
  const pending = state.pendingMessages.get(viewId);
  if (!pending || pending.length === 0) return;

  pending.forEach(message => {
    postMessageToWebview(viewId, message);
  });

  setState(prev => {
    const newPendingMessages = new Map(prev.pendingMessages);
    newPendingMessages.delete(viewId);

    return {
      ...prev,
      pendingMessages: newPendingMessages,
    };
  });
}

/**
 * Register a message handler for a webview panel
 */
function onDidReceiveMessage(
  viewId: string,
  handler: (message: WebviewMessage) => void
): () => void {
  const panel = state.panels.get(viewId);
  if (!panel) {
    console.warn(`[webviewStore] Cannot register handler: panel ${viewId} not found`);
    return () => {};
  }

  panel.messageHandlers.add(handler);

  // Return disposable
  return () => {
    const currentPanel = state.panels.get(viewId);
    if (currentPanel) {
      currentPanel.messageHandlers.delete(handler);
    }
  };
}

/**
 * Handle message received from webview
 */
function handleMessageFromWebview(viewId: string, message: WebviewMessage): void {
  const panel = state.panels.get(viewId);
  if (!panel) {
    console.warn(`[webviewStore] Cannot handle message: panel ${viewId} not found`);
    return;
  }

  // Call all registered handlers
  panel.messageHandlers.forEach(handler => {
    try {
      handler(message);
    } catch (error) {
      console.error(`[webviewStore] Error in message handler for ${viewId}:`, error);
    }
  });
}

/**
 * Get all webview panels for a specific extension
 */
function getExtensionWebviews(extensionId: string): WebviewPanel[] {
  return Array.from(state.panels.values()).filter(
    panel => panel.extensionId === extensionId
  );
}

/**
 * Get webview panel by viewId
 */
function getWebviewPanel(viewId: string): WebviewPanel | undefined {
  return state.panels.get(viewId);
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Use webview store state
 */
export function useWebviewState(): WebviewState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Use a specific webview panel
 */
export function useWebviewPanel(viewId: string): WebviewPanel | undefined {
  const state = useWebviewState();
  return state.panels.get(viewId);
}

/**
 * Use all webview panels
 */
export function useWebviewPanels(): WebviewPanel[] {
  const state = useWebviewState();
  return Array.from(state.panels.values());
}

/**
 * Use active webview panel
 */
export function useActiveWebview(): WebviewPanel | undefined {
  const state = useWebviewState();
  if (!state.activeViewId) return undefined;
  return state.panels.get(state.activeViewId);
}

// ============================================================================
// Exports
// ============================================================================

export const webviewActions = {
  createWebviewPanel,
  updateWebviewHtml,
  updateWebviewTitle,
  showWebview,
  hideWebview,
  disposeWebview,
  postMessageToWebview,
  flushPendingMessages,
  onDidReceiveMessage,
  handleMessageFromWebview,
  getExtensionWebviews,
  getWebviewPanel,
};
