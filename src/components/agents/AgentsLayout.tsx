import { useEffect, useState, useCallback, memo } from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { AgentsSidebar } from "./AgentsSidebar"
import { AgentChatWindow } from "./AgentChatWindow"
import { useAgentStore, agentActions } from "@/stores/agentStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH = 280;

// Memoized components for performance
const MemoizedSidebar = memo(AgentsSidebar);
const MemoizedChatWindow = memo(AgentChatWindow);

export function AgentsLayout() {
    useAgentStore();
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
            <main className="flex-1 min-w-0 flex flex-col h-full">
                {/* Toggle button */}
                <div className="shrink-0 h-10 flex items-center px-2 border-b border-border bg-background/80">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={toggleSidebar}
                        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        {isSidebarOpen ? (
                            <PanelLeftClose className="h-4 w-4" />
                        ) : (
                            <PanelLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Chat window */}
                <div className="flex-1 overflow-hidden">
                    <MemoizedChatWindow />
                </div>
            </main>
        </div>
    )
}
