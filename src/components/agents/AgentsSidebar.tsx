import { Plus, Search } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarMenu,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function AgentsSidebar() {
    return (
        <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="border-b p-4 gap-4">
                <div className="flex items-center justify-between px-1">
                    <span className="font-semibold text-sm">Agents</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <SidebarInput placeholder="Search agents..." className="pl-8 h-9" />
                    </div>
                    <Button className="w-full justify-start" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Agent
                    </Button>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Recent</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                    No agents found.
                                </div>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
