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
        <div className="h-full w-full overflow-hidden bg-background text-foreground">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={16} minSize={12} maxSize={25} className="min-w-[220px] border-r border-border">
                    <AgentsSidebar className="h-full w-full" />
                </ResizablePanel>
                <ResizableHandle className="bg-border w-px" />
                <ResizablePanel defaultSize={84}>
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-hidden h-full">
                            <AgentChatWindow />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
