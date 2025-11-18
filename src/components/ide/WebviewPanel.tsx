/**
 * WebviewPanel Component
 *
 * Renders a webview panel in an iframe with message passing support.
 * Used for chatbot extensions and other webview-based extensions.
 */

import { useEffect, useRef, useState } from 'react';
import { useWebviewPanel, webviewActions } from '@/stores/webviewStore';
import { useThemeState } from '@/stores/themeStore';
import { cn } from '@/lib/cn';

interface WebviewPanelProps {
  viewId: string;
  className?: string;
}

/**
 * VS Code API shim injected into webview
 */
const VS_CODE_API_SCRIPT = `
<script>
  (function() {
    // State
    let vscodeState = {};

    // Message handlers
    const messageHandlers = new Set();

    // VS Code API object
    const vscode = {
      postMessage: function(message) {
        window.parent.postMessage({
          source: 'webview',
          viewId: '{{VIEW_ID}}',
          message: message
        }, '*');
      },

      setState: function(newState) {
        vscodeState = newState;
        window.parent.postMessage({
          source: 'webview',
          viewId: '{{VIEW_ID}}',
          command: '__setState',
          data: newState
        }, '*');
      },

      getState: function() {
        return vscodeState;
      }
    };

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      // Only accept messages from parent window
      if (event.source !== window.parent) return;

      const message = event.data;

      // Handle state updates
      if (message.command === '__updateState') {
        vscodeState = message.data;
      }

      // Dispatch to webview's message handlers
      if (message.target === 'webview') {
        const customEvent = new CustomEvent('message', { detail: message.data });
        window.dispatchEvent(customEvent);
      }
    });

    // Make API available globally
    window.acquireVsCodeApi = function() {
      return vscode;
    };

    // Auto-acquire for convenience
    if (!window.vscode) {
      window.vscode = vscode;
    }

    // Notify parent that webview is ready
    window.parent.postMessage({
      source: 'webview',
      viewId: '{{VIEW_ID}}',
      command: '__webview_ready'
    }, '*');
  })();
</script>
`;

/**
 * WebviewPanel component
 */
export function WebviewPanel({ viewId, className }: WebviewPanelProps) {
  const panel = useWebviewPanel(viewId);
  const themeState = useThemeState();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Handle messages from webview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data;

      // Validate message structure
      if (!data || typeof data !== 'object' || data.source !== 'webview') {
        return;
      }

      // Check if message is for this panel
      if (data.viewId !== viewId) {
        return;
      }

      // Handle webview ready signal
      if (data.command === '__webview_ready') {
        setIsReady(true);
        // Flush any pending messages
        webviewActions.flushPendingMessages(viewId);
        return;
      }

      // Handle state updates
      if (data.command === '__setState') {
        // Store webview state (could be persisted)
        console.log(`[WebviewPanel] State updated for ${viewId}:`, data.data);
        return;
      }

      // Forward message to extension handlers
      if (data.message) {
        webviewActions.handleMessageFromWebview(viewId, data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [viewId]);

  // Listen for messages to send to webview
  useEffect(() => {
    const handleWebviewMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { viewId: targetViewId, message } = customEvent.detail;

      if (targetViewId !== viewId) return;

      // Send message to iframe
      if (iframeRef.current?.contentWindow && isReady) {
        iframeRef.current.contentWindow.postMessage(
          {
            target: 'webview',
            data: message,
          },
          '*'
        );
      }
    };

    window.addEventListener('webview-message', handleWebviewMessage);
    return () => window.removeEventListener('webview-message', handleWebviewMessage);
  }, [viewId, isReady]);

  // Send theme updates to webview
  useEffect(() => {
    if (!isReady || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        target: 'webview',
        command: 'theme-changed',
        data: {
          theme: themeState.currentTheme,
          mode: themeState.mode,
        },
      },
      '*'
    );
  }, [themeState.currentTheme, themeState.mode, isReady]);

  if (!panel) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <p className="text-muted-foreground">Webview panel not found</p>
      </div>
    );
  }

  // Inject VS Code API script into HTML
  const htmlWithAPI = injectVSCodeAPI(panel.html, viewId);

  // Create iframe srcDoc with proper CSP and theme
  const srcDoc = createSrcDoc(htmlWithAPI, panel.enableScripts, themeState.currentTheme);

  return (
    <div className={cn('flex flex-col h-full w-full bg-background', className)}>
      {/* Webview title bar (optional) */}
      {panel.title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
          <h3 className="text-sm font-medium text-foreground">{panel.title}</h3>
        </div>
      )}

      {/* Webview iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox={
          panel.enableScripts
            ? 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups'
            : 'allow-same-origin'
        }
        className="flex-1 w-full border-0 bg-background"
        title={panel.title}
      />

      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading webview...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inject VS Code API script into HTML
 */
function injectVSCodeAPI(html: string, viewId: string): string {
  const script = VS_CODE_API_SCRIPT.replace(/{{VIEW_ID}}/g, viewId);

  // Try to inject after <head> tag
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${script}`);
  }

  // Try to inject before </body> tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}\n</body>`);
  }

  // Otherwise, prepend to HTML
  return script + '\n' + html;
}

/**
 * Create complete srcDoc with CSP and theme integration
 */
function createSrcDoc(html: string, enableScripts: boolean, themeName: string): string {
  const csp = enableScripts
    ? "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: https: http:; font-src data: https: http:; connect-src https: http: ws: wss:;"
    : "default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:;";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme" content="${themeName}">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }

    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Webview container for sidebar
 */
export function WebviewSidebarContainer({ viewId }: { viewId: string }) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <WebviewPanel viewId={viewId} className="flex-1" />
    </div>
  );
}
