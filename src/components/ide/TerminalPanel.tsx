import React, { useCallback, useEffect, useRef } from "react";
import { Terminal, ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { listen } from "@tauri-apps/api/event";
import { Button } from "../ui/button";
import "@xterm/xterm/css/xterm.css";
import { useIDEStore } from "../../stores/ideStore";
import { terminalActions, terminalState, useTerminalState } from "../../stores/terminalStore";
import { useThemeState } from "../../stores/themeStore";
import { cn } from "@/lib/utils";

const isTauriEnv = () => {
  try {
    if (typeof window === "undefined") return false;
    const w = window as any;
    const byGlobal = !!w.__TAURI__ || !!w.__TAURI_INTERNALS__ || !!w.__TAURI_METADATA__;
    const byEnv = !!(import.meta as any)?.env?.TAURI_PLATFORM;
    const byUA = typeof navigator !== "undefined" && /\bTauri\b/i.test(navigator.userAgent || "");
    return byGlobal || byEnv || byUA;
  } catch {
    return false;
  }
};

const TerminalPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalsRef = useRef(new Map<string, { term: Terminal; fit: FitAddon }>());
  const { state: ideState } = useIDEStore();
  const terminalSnapshot = useTerminalState();
  const themeSnapshot = useThemeState();
  const isInitializedRef = useRef(false);

  const { visible, sessions, activeSessionId } = terminalSnapshot;

  // Convert theme variables to xterm theme
  const getXtermTheme = useCallback((): ITheme => {
    const vars = themeSnapshot.currentTheme.variables;
    return {
      background: vars['--bg-editor'] || vars['--bg-secondary'] || '#1e1e1e',
      foreground: vars['--text-editor'] || vars['--text-primary'] || '#f8f8f2',
      cursor: vars['--accent-primary'] || '#3b82f6',
      cursorAccent: vars['--bg-editor'] || vars['--bg-secondary'] || '#1e1e1e',
      selectionBackground: vars['--accent-primary'] ? `${vars['--accent-primary']}40` : '#3b82f640',
      black: themeSnapshot.currentTheme.mode === 'night' ? '#1e1e1e' : '#000000',
      red: '#f87171',
      green: '#22c55e',
      yellow: '#fbbf24',
      blue: vars['--accent-primary'] || '#3b82f6',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: themeSnapshot.currentTheme.mode === 'night' ? '#f8f8f2' : '#e5e5e5',
      brightBlack: '#6b7280',
      brightRed: '#fca5a5',
      brightGreen: '#86efac',
      brightYellow: '#fde047',
      brightBlue: vars['--accent-secondary'] || '#60a5fa',
      brightMagenta: '#e9d5ff',
      brightCyan: '#67e8f9',
      brightWhite: '#ffffff',
    };
  }, [themeSnapshot.currentTheme]);

  const createTerminalForSession = useCallback((id: string) => {
    const xtermTheme = getXtermTheme();
    const term = new Terminal({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
      allowProposedApi: true,
      theme: xtermTheme,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.onData((data) => {
      terminalActions.write(id, data);
    });
    terminalsRef.current.set(id, { term, fit: fitAddon });
  }, [getXtermTheme]);

  const attachTerminalToDom = useCallback((id: string) => {
    const container = containerRef.current;
    if (!container) return;
    const node = container.querySelector<HTMLDivElement>(`[data-session="${id}"] .xterm-host`);
    const entry = terminalsRef.current.get(id);
    if (!node || !entry) return;

    const alreadyMounted = !!entry.term.element && entry.term.element.parentElement === node;
    if (!alreadyMounted) {
      try {
        node.innerHTML = "";
      } catch {}
      entry.term.open(node);
    }

    window.setTimeout(() => {
      try {
        entry.fit.fit();
        entry.term.focus();
        if (!isTauriEnv()) {
          entry.term.writeln(
            "\x1b[33mTerminal preview (no shell). Run 'pnpm tauri dev' for the real terminal.\x1b[0m",
          );
        }
      } catch {}
    }, 30);
  }, []);

  const handleResize = useCallback(() => {
    const snapshot = terminalState();
    const id = snapshot.activeSessionId;
    if (!id) return;
    const entry = terminalsRef.current.get(id);
    if (!entry) return;
    try {
      entry.fit.fit();
      const dims = entry.term?.cols && entry.term?.rows ? { cols: entry.term.cols, rows: entry.term.rows } : null;
      if (dims) terminalActions.resize(id, dims.cols, dims.rows);
    } catch {}
  }, []);

  // Setup event listeners once on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    window.addEventListener("resize", handleResize);

    let unlistenData: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const setupListeners = async () => {
      if (!isTauriEnv()) {
        console.info("Running in browser-only dev; terminal events disabled.");
        return;
      }

      try {
        unlistenData = await listen("terminal/data", (event) => {
          const payload = event.payload as { id: string; data: string };
          const entry = terminalsRef.current.get(payload.id);
          if (entry) entry.term.write(payload.data);
        });
        unlistenExit = await listen("terminal/exit", (event) => {
          const payload = event.payload as { id: string };
          const entry = terminalsRef.current.get(payload.id);
          if (entry) {
            entry.term.write("\r\n[Process exited]\r\n");
          }
        });
        unlistenError = await listen("terminal/error", (event) => {
          const payload = event.payload as { id: string; error: string };
          const entry = terminalsRef.current.get(payload.id);
          if (entry) {
            entry.term.write(`\r\n[Terminal error] ${payload.error}\r\n`);
          }
        });
      } catch (error) {
        console.warn("Terminal event listeners not available:", error);
      }
    };

    void setupListeners();

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        unlistenData?.();
      } catch {}
      try {
        unlistenExit?.();
      } catch {}
      try {
        unlistenError?.();
      } catch {}
      terminalsRef.current.forEach(({ term }) => term.dispose());
      terminalsRef.current.clear();
      isInitializedRef.current = false;
    };
  }, [handleResize]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    if (!terminalsRef.current.has(activeSessionId)) {
      createTerminalForSession(activeSessionId);
    }
    attachTerminalToDom(activeSessionId);
    // Delay resize to ensure DOM is ready
    const resizeTimer = window.setTimeout(() => {
      handleResize();
    }, 50);
    return () => window.clearTimeout(resizeTimer);
  }, [activeSessionId, attachTerminalToDom, createTerminalForSession, handleResize, sessions.length]);

  // Trigger resize when panel becomes visible
  useEffect(() => {
    if (visible && activeSessionId) {
      const resizeTimer = window.setTimeout(() => {
        handleResize();
      }, 100);
      return () => window.clearTimeout(resizeTimer);
    }
  }, [visible, activeSessionId, handleResize]);

  // Update theme for all terminals when theme changes
  useEffect(() => {
    const xtermTheme = getXtermTheme();
    terminalsRef.current.forEach(({ term }) => {
      try {
        term.options.theme = xtermTheme;
      } catch (error) {
        console.warn('Failed to update terminal theme:', error);
      }
    });
  }, [getXtermTheme]);

  // Cleanup disposed sessions
  useEffect(() => {
    const sessionIds = new Set(sessions.map((session) => session.id));
    terminalsRef.current.forEach((entry, id) => {
      if (!sessionIds.has(id)) {
        try {
          entry.term.dispose();
        } catch {}
        terminalsRef.current.delete(id);
      }
    });
  }, [sessions]);

  const handleInput = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTauriEnv()) return;
    const snapshot = terminalState();
    const id = snapshot.activeSessionId;
    if (!id) return;
    const entry = terminalsRef.current.get(id);
    let data = "";

    if (event.key.length === 1) data = event.key;
    else if (event.key === "Enter") data = "\r";
    else if (event.key === "Backspace") data = "\x7f";
    else if (event.key === "Tab") data = "\t";
    else return;

    event.preventDefault();

    try {
      if (entry) {
        if (data === "\r") entry.term.write("\r\n");
        else entry.term.write(data);
      }
    } catch {}
    void terminalActions.write(id, data);
  }, []);

  const handleContainerClick = useCallback(() => {
    const snapshot = terminalState();
    const id = snapshot.activeSessionId;
    if (!id) return;
    const entry = terminalsRef.current.get(id);
    try {
      entry?.term.focus();
    } catch {}
  }, []);

  const currentWorkspacePath = ideState().workspace?.path;

  if (!visible) {
    return null;
  }

  return (
    <div className="terminal-panel flex h-full flex-col overflow-hidden rounded-t-lg border border-border bg-card/95 shadow-lg backdrop-blur-sm transition-all duration-200">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1">
          {sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <Button
                key={session.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => terminalActions.setActive(session.id)}
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    isActive ? "bg-accent-foreground" : "bg-muted-foreground/40"
                  )} />
                  {session.title}
                </span>
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={() => terminalActions.open(undefined, currentWorkspacePath)}
            title="New Terminal"
          >
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </span>
          </Button>
          {activeSessionId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => terminalActions.kill(activeSessionId)}
              title="Kill Terminal"
            >
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Kill
              </span>
            </Button>
          )}
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={() => terminalActions.toggle()}
            title="Hide Terminal"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden p-2"
        onKeyDown={handleInput}
        onClick={handleContainerClick}
        tabIndex={0}
      >
        <div className="relative h-full w-full overflow-hidden rounded-md border border-border/50 shadow-inner transition-colors" style={{ backgroundColor: themeSnapshot.currentTheme.variables['--bg-editor'] || themeSnapshot.currentTheme.variables['--bg-secondary'] }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              data-session={session.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-150",
                activeSessionId === session.id ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <div className="xterm-host h-full w-full p-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TerminalPanel;