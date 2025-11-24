import { useEffect } from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AgentsSidebar } from "./AgentsSidebar"
import { AgentChatWindow } from "./AgentChatWindow"
import { AgentSettingsDialog } from "./AgentSettingsDialog"
import { useAgentStore, agentActions } from "@/stores/agentStore"

export function AgentsLayout() {
    const { sessions } = useAgentStore();

    // Initialize agent store (load history)
    useEffect(() => {
        agentActions.initialize();
    }, []);

    return (
        <SidebarProvider className="min-h-0 h-full">
            <div className="h-full w-full overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="min-w-[250px]">
                        <AgentsSidebar className="!static !h-full !w-full border-r" />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={80}>
                        <div className="flex flex-col h-full">
                            <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background">
                                <span className="font-semibold">Agents</span>
                                <AgentSettingsDialog />
                            </header>
                            <div className="flex-1 overflow-hidden h-full">
                                <AgentChatWindow />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </SidebarProvider>
    )
}
