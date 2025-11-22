
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AgentsSidebar } from "./AgentsSidebar"
import { AgentChatWindow } from "./AgentChatWindow"

export function AgentsLayout() {
    return (
        <SidebarProvider>
            <AgentsSidebar />
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <span className="font-semibold">Agents</span>
                </header>
                <AgentChatWindow />
            </SidebarInset>
        </SidebarProvider>
    )
}
