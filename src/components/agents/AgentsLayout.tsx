import { useEffect, useState, useCallback, memo } from "react"
import { PanelLeft, PanelLeftClose, Sparkles, Settings } from "lucide-react"
import { AgentsSidebar } from "./AgentsSidebar"
import { AgentChatWindow } from "./AgentChatWindow"
import { useAgentStore, agentActions, useActiveSession } from "@/stores/agentStore"
import { AVAILABLE_MODELS } from "@/services/agent/providers"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH = 280;

// Memoized components for performance
const MemoizedSidebar = memo(AgentsSidebar);
const MemoizedChatWindow = memo(AgentChatWindow);

export function AgentsLayout() {
    useAgentStore();
    const activeSession = useActiveSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Initialize agent store (load history)
    useEffect(() => {
        agentActions.initialize();
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    return (
        <div className="h-full w-full overflow-hidden bg-background text-foreground flex">
            {/* Sidebar - uses transform for GPU-accelerated animation */}
            <aside
                className={cn(
                    "h-full shrink-0 border-r border-border transition-[width,transform] duration-200 ease-out will-change-transform",
                    isSidebarOpen ? "w-[280px]" : "w-0"
                )}
                style={{
                    transform: isSidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_WIDTH}px)`,
                }}
            >
                <div className="h-full w-[280px]">
                    <MemoizedSidebar className="h-full w-full" />
                </div>
            </aside>

            {/* Main content area */}
            <main className="flex-1 min-w-0 flex flex-col h-full bg-background/50 backdrop-blur-sm">
                {/* Unified Header */}
                <header className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-border z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                            onClick={toggleSidebar}
                            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                        >
                            {isSidebarOpen ? (
                                <PanelLeftClose className="h-4 w-4" />
                            ) : (
                                <PanelLeft className="h-4 w-4" />
                            )}
                        </Button>

                        <div className="h-6 w-px bg-border/60 shrink-0" />

                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/10 shrink-0">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-sm font-semibold text-foreground truncate">
                                    {activeSession?.name || 'Rainy Agent'}
                                </span>
                                <div className="flex items-center gap-1.5 hidden sm:flex">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 shrink-0"></span>
                                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                                        {AVAILABLE_MODELS.find(m => m.id === activeSession?.model)?.name || 'Gemini Flash 2.0 Lite'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                {/* Chat window */}
                <div className="flex-1 overflow-hidden relative">
                    <MemoizedChatWindow />
                </div>
            </main>
        </div>
    )
}
