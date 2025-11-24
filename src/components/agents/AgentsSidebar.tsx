import { Plus, Search, MessageSquare, Trash2, Edit2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

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
    SidebarMenuButton,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useSessions, useActiveSession, agentActions } from "@/stores/agentStore"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"

export function AgentsSidebar({ className }: { className?: string }) {
    const sessions = useSessions();
    const activeSession = useActiveSession();
    const [searchQuery, setSearchQuery] = useState("");

    const handleNewAgent = () => {
        const sessionName = `Agent ${sessions.length + 1}`;
        agentActions.createSession(sessionName);
    };

    const handleDeleteSession = (sessionId: string) => {
        agentActions.deleteSession(sessionId);
    };

    const handleRenameSession = (sessionId: string) => {
        const newName = prompt("Enter new name:");
        if (newName && newName.trim()) {
            agentActions.updateSessionName(sessionId, newName.trim());
        }
    };

    const filteredSessions = sessions.filter((session) =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Sidebar collapsible="none" className={cn("border-r", className)}>
            <SidebarHeader className="border-b p-4 gap-4">
                <div className="flex items-center justify-between px-1">
                    <span className="font-semibold text-sm">Agents</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <SidebarInput
                            placeholder="Search agents..."
                            className="pl-8 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        className="w-full justify-start"
                        size="sm"
                        onClick={handleNewAgent}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Agent
                    </Button>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Sessions</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {filteredSessions.length === 0 ? (
                                <SidebarMenuItem>
                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                        {searchQuery
                                            ? "No matching sessions"
                                            : "No sessions yet. Create one to get started!"}
                                    </div>
                                </SidebarMenuItem>
                            ) : (
                                filteredSessions.map((session) => (
                                    <SidebarMenuItem key={session.id}>
                                        <ContextMenu>
                                            <ContextMenuTrigger asChild>
                                                <SidebarMenuButton
                                                    onClick={() =>
                                                        agentActions.setActiveSession(session.id)
                                                    }
                                                    isActive={
                                                        activeSession?.id === session.id
                                                    }
                                                    className="w-full"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                    <div className="flex flex-col items-start flex-1 min-w-0">
                                                        <span className="truncate text-sm">
                                                            {session.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground truncate">
                                                            {session.messages.length - 1}{" "}
                                                            messages
                                                        </span>
                                                    </div>
                                                </SidebarMenuButton>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuItem
                                                    onClick={() =>
                                                        handleRenameSession(session.id)
                                                    }
                                                >
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Rename
                                                </ContextMenuItem>
                                                <ContextMenuItem
                                                    onClick={() =>
                                                        handleDeleteSession(session.id)
                                                    }
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    </SidebarMenuItem>
                                ))
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}
