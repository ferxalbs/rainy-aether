/**
 * Enhanced TerminalPanel Component
 *
 * Features:
 * - Multiple terminal sessions with tabs
 * - Search functionality
 * - Keyboard shortcuts
 * - Session management
 * - Shell profile selection
 *
 * Note: Split view UI is not yet implemented (infrastructure exists in store)
 */

import React, { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTerminalState, terminalActions } from "@/stores/terminalStore";
import { useIDEStore } from "@/stores/ideStore";
import { usePanelState } from "@/stores/panelStore";
import { Button } from "@/components/ui/button";
import TerminalSplitView from "./terminal/TerminalSplitView";

const TerminalPanel: React.FC = () => {
  const terminalSnapshot = useTerminalState();
  const { state: ideState } = useIDEStore();
  const panelState = usePanelState();

  const { visible, sessions, layout, searchQuery, searchVisible } = terminalSnapshot;

  // Track if terminal tab is currently visible
  const isTabVisible = panelState.isBottomPanelOpen && panelState.activeBottomTab === 'terminal';

  // Get current workspace path
  const currentWorkspacePath = ideState().workspace?.path;

  // Keyboard shortcuts - always active to allow shortcuts even when hidden
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process shortcuts when terminal is visible
      if (!visible) return;

      // Ctrl/Cmd + Shift + F: Toggle search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        terminalActions.toggleSearch();
      }

      // Ctrl/Cmd + Shift + T: New terminal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        terminalActions.createSession({ cwd: currentWorkspacePath });
      }

      // Ctrl/Cmd + Shift + W: Close active terminal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        const activeSplit = layout.splits.find(s => s.id === layout.activeSplitId);
        if (activeSplit?.activeSessionId) {
          terminalActions.removeSession(activeSplit.activeSessionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, layout, currentWorkspacePath]);

  const handleNewTerminal = useCallback(() => {
    terminalActions.createSession({ cwd: currentWorkspacePath });
  }, [currentWorkspacePath]);

  const handleCloseSession = useCallback((sessionId: string) => {
    terminalActions.removeSession(sessionId);
  }, []);

  const handleSetActiveSession = useCallback((splitId: string, sessionId: string) => {
    terminalActions.setActiveSession(splitId, sessionId);
  }, []);

  const handleToggleSearch = useCallback(() => {
    terminalActions.toggleSearch();
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    terminalActions.setSearchQuery(query);
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm('Close all terminal sessions?')) {
      terminalActions.clearAll();
    }
  }, []);

  // Don't return null - let parent control visibility via CSS
  // This keeps the component mounted and preserves xterm.js state
  const activeSplit = layout.splits.find(s => s.id === layout.activeSplitId);

  return (
    <div className="terminal-panel flex h-full flex-col overflow-hidden rounded-t-lg border border-border bg-card/95 shadow-lg backdrop-blur-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Terminal</span>
          <span className="text-muted-foreground/60">
            {sessions.size} session{sessions.size !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* New Terminal */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleNewTerminal}
            title="New Terminal (Ctrl+Shift+T)"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>

          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs",
              searchVisible && "bg-accent text-accent-foreground"
            )}
            onClick={handleToggleSearch}
            title="Search in Terminal (Ctrl+Shift+F)"
            disabled={sessions.size === 0}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          {/* Clear All */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:text-destructive"
            onClick={handleClearAll}
            title="Close All Terminals"
            disabled={sessions.size === 0}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>

          {/* Hide Terminal */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => terminalActions.toggle()}
            title="Hide Terminal"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {searchVisible && (
        <div className="border-b border-border bg-muted/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search terminal output..."
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleToggleSearch}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div className="relative flex-1 overflow-hidden">
        {sessions.size === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-3 text-sm">No active terminal sessions</p>
              <Button onClick={handleNewTerminal}>Create New Terminal</Button>
            </div>
          </div>
        ) : (
          <div className="h-full w-full p-2">
            <div
              className="h-full w-full overflow-hidden rounded-md border border-border/50 shadow-inner transition-colors"
              style={{
                backgroundColor:
                  terminalSnapshot.config.fontSize > 0
                    ? 'var(--bg-editor, var(--bg-secondary))'
                    : undefined,
              }}
            >
              {/* Render active split */}
              {activeSplit && (
                <TerminalSplitView
                  splitId={activeSplit.id}
                  sessions={Array.from(sessions.values()).filter((s) =>
                    activeSplit.sessions.includes(s.id)
                  )}
                  activeSessionId={activeSplit.activeSessionId}
                  onSetActive={(sessionId) => handleSetActiveSession(activeSplit.id, sessionId)}
                  onClose={handleCloseSession}
                  onNewTerminal={handleNewTerminal}
                  searchQuery={searchVisible ? searchQuery : undefined}
                  isTabVisible={isTabVisible}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;
