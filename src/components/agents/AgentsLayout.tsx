import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { PanelLeft, PanelLeftClose, Sparkles } from "lucide-react";
import { AgentsSidebar } from "./AgentsSidebar";
import { AgentChatWindow } from "./AgentChatWindow";
import {
  useAgentStore,
  agentActions,
  useActiveSession,
} from "@/stores/agentStore";
import { AVAILABLE_MODELS, getModelConfig } from "@/services/agent/providers";
import { getContextStatus, ContextStatus } from "@/services/agent/TokenCounter";
import { TokenUsageBar } from "./TokenUsageBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 280;

// Memoized components for performance
const MemoizedSidebar = memo(AgentsSidebar);
const MemoizedChatWindow = memo(AgentChatWindow);
// Memoize TokenUsageBar to prevent flicker
const MemoizedTokenBar = memo(TokenUsageBar);

export function AgentsLayout() {
  useAgentStore();
  const activeSession = useActiveSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize agent store (load history)
  useEffect(() => {
    agentActions.initialize();
  }, []);

  // Calculate context status for token usage display (hoisted from chat window)
  const contextStatus: ContextStatus | null = useMemo(() => {
    if (
      !activeSession?.model ||
      !activeSession.messages ||
      activeSession.messages.length === 0
    )
      return null;

    const modelConfig = getModelConfig(activeSession.model);
    if (!modelConfig) return null;

    return getContextStatus(activeSession.messages, {
      contextWindow: modelConfig.contextWindow,
      maxOutputTokens: modelConfig.maxOutputTokens,
    });
  }, [activeSession?.model, activeSession?.messages]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="h-full w-full overflow-hidden bg-background/10 backdrop-saturate-150 text-foreground flex">
      {/* Sidebar - uses transform for GPU-accelerated animation */}
      <aside
        className={cn(
          "h-full shrink-0 border-r border-border transition-[width,transform] duration-200 ease-out will-change-transform overflow-hidden",
          isSidebarOpen ? "w-[280px]" : "w-0 border-r-0"
        )}
        style={{
          transform: isSidebarOpen
            ? "translateX(0)"
            : `translateX(-${SIDEBAR_WIDTH}px)`,
        }}
      >
        <div className="h-full w-[280px]">
          <MemoizedSidebar className="h-full w-full" />
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 min-w-0 flex flex-col h-full bg-background/50 backdrop-blur-sm">
        {/* Unified Header */}
        <header className="shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-primary/10 bg-background/10 backdrop-blur-3xl backdrop-saturate-150 z-10 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-all shrink-0"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              ) : (
                <PanelLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              )}
            </Button>

            <div className="h-4 w-px bg-border/30 shrink-0" />

            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0 shadow-inner">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/70" />
              </div>
              <div className="flex flex-col gap-0 min-w-0">
                <span className="text-[12px] sm:text-[13px] font-medium text-foreground/90 truncate tracking-tight max-w-[120px] sm:max-w-[200px]">
                  {activeSession?.name || "New Session"}
                </span>
                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="flex h-1 w-1 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground/80 font-medium truncate uppercase tracking-widest max-w-[80px] sm:max-w-none">
                    {AVAILABLE_MODELS.find((m) => m.id === activeSession?.model)
                      ?.name || "Gemini Flash 2.0"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Token Usage Indicator - right side */}
          {contextStatus && contextStatus.usedTokens > 0 && (
            <div className="hidden sm:block animate-in fade-in duration-500">
              <MemoizedTokenBar
                usedTokens={contextStatus.usedTokens}
                maxTokens={contextStatus.maxTokens}
                className="bg-muted/30 border border-primary/20 shadow-sm"
              />
            </div>
          )}
        </header>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden relative">
          <MemoizedChatWindow isSidebarCollapsed={!isSidebarOpen} />
        </div>
      </main>
    </div>
  );
}
