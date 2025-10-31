import React, { useCallback, useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { listen } from "@tauri-apps/api/event";
import { Button } from "../ui/button";
import "@xterm/xterm/css/xterm.css";
import { useIDEStore } from "../../stores/ideStore";
import { terminalActions, terminalState, useTerminalState } from "../../stores/terminalStore";
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

  const { visible, sessions, activeSessionId } = terminalSnapshot;

  const createTerminalForSession = useCallback((id: string) => {
    const term = new Terminal({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
      allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.onData((data) => {
      terminalActions.write(id, data);
    });
    terminalsRef.current.set(id, { term, fit: fitAddon });
  }, []);

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

  useEffect(() => {
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

        const snapshot = terminalState();
        if (!snapshot.activeSessionId && snapshot.sessions.length === 0) {
          await terminalActions.open(undefined, ideState().workspace?.path);
        }
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
    };
  }, [handleResize, ideState]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    if (!terminalsRef.current.has(activeSessionId)) {
      createTerminalForSession(activeSessionId);
    }
    attachTerminalToDom(activeSessionId);
    handleResize();
  }, [activeSessionId, attachTerminalToDom, createTerminalForSession, handleResize, sessions.length]);

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
    <div className="terminal-panel flex h-full flex-col overflow-hidden rounded-t-lg border border-border bg-card/95 shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1">
          {sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <Button
                key={session.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-md px-2 text-xs",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => terminalActions.setActive(session.id)}
              >
                {session.title}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => terminalActions.toggle()}
          >
            Hide
          </Button>
          {activeSessionId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => terminalActions.kill(activeSessionId)}
            >
              Kill
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => terminalActions.open(undefined, currentWorkspacePath)}
          >
            New
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden px-3 pb-3"
        onKeyDown={handleInput}
        onClick={handleContainerClick}
        tabIndex={0}
      >
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-border/70 bg-black/90">
          {sessions.map((session) => (
            <div
              key={session.id}
              data-session={session.id}
              className={cn(
                "absolute inset-0",
                activeSessionId === session.id ? "opacity-100" : "opacity-0"
              )}
              style={{ pointerEvents: activeSessionId === session.id ? "auto" : "none" }}
            >
              <div className="xterm-host h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TerminalPanel;