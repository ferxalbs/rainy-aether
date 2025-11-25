import { useEffect } from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { AgentsSidebar } from "./AgentsSidebar"
import { AgentChatWindow } from "./AgentChatWindow"
import { useAgentStore, agentActions } from "@/stores/agentStore"

export function AgentsLayout() {
    useAgentStore();

    // Initialize agent store (load history)
    useEffect(() => {
        agentActions.initialize();
    }, []);

    return (
        <div className="h-full w-full overflow-hidden bg-[#18181b] text-foreground">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="min-w-[250px] border-r border-[#27272a]">
                    <AgentsSidebar className="h-full w-full" />
                </ResizablePanel>
                <ResizableHandle className="bg-[#27272a] w-[1px]" />
                <ResizablePanel defaultSize={80}>
                    <div className="flex flex-col h-full">
                        {/* Header is now part of the chat window or removed to match Cursor's minimal look */}
                        {/* We'll keep a minimal header or let ChatWindow handle it */}
                        <div className="flex-1 overflow-hidden h-full">
                            <AgentChatWindow />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
