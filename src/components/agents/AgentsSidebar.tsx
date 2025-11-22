
import { Plus } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarInput,
    SidebarMenu,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function AgentsSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarInput placeholder="Search enosislabs" />
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Button className="w-full justify-start" variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            New Agent
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {/* Future agent list will go here */}
                <div className="p-4 text-sm text-muted-foreground text-center">
                    No agents found.
                </div>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
