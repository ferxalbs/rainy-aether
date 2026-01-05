/**
 * TerminalSplitView Component
 *
 * Manages split terminal panels with:
 * - Horizontal and vertical splits
 * - Drag-to-resize splitters
 * - Multiple sessions per split
 * - Tab management
 */

import React from "react";
import { cn } from "@/lib/utils";
import { TerminalSession } from "@/stores/terminalStore";
import TerminalInstance from "./TerminalInstance";
import { Button } from "@/components/ui/button";

interface TerminalSplitViewProps {
  splitId: string;
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSetActive: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onNewTerminal: () => void;
  searchQuery?: string;
  isTabVisible?: boolean;
}

const TerminalSplitView: React.FC<TerminalSplitViewProps> = ({
  splitId: _splitId,
  sessions,
  activeSessionId,
  onSetActive,
  onClose,
  onNewTerminal,
  searchQuery,
  isTabVisible,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="mb-2">No active terminals</p>
          <Button size="sm" onClick={onNewTerminal}>
            New Terminal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
        {sessions.map((session) => {
          const isActive = activeSessionId === session.id;
          const stateColor =
            session.state === "active"
              ? "bg-green-500"
              : session.state === "starting"
                ? "bg-yellow-500"
                : session.state === "error"
                  ? "bg-red-500"
                  : "bg-gray-500";

          return (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer"
              )}
              onClick={() => onSetActive(session.id)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", stateColor)} />
              <span className="max-w-[120px] truncate">{session.title}</span>
              <button
                className={cn(
                  "ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive",
                  isActive && "opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(session.id);
                }}
                title="Close terminal"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs"
          onClick={onNewTerminal}
          title="New Terminal"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Button>
      </div>

      {/* Terminal instances */}
      <div className="relative flex-1 overflow-hidden">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "absolute inset-0",
              activeSessionId === session.id ? "z-10" : "pointer-events-none z-0"
            )}
          >
            <TerminalInstance
              sessionId={session.id}
              isActive={activeSessionId === session.id}
              searchQuery={searchQuery}
              isTabVisible={isTabVisible}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalSplitView;
