import { Plus, Search, Trash2, Edit2, MoreHorizontal, Zap, Circle } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSessions, useActiveSession, agentActions } from "@/stores/agentStore"
import { useAgentServer } from "@/hooks/useAgentServer"
import { AgentSettingsDialog } from "./AgentSettingsDialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

function ServerStatusIndicator() {
    const { isRunning, isStarting, status } = useAgentServer();

    if (isStarting) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500 animate-pulse" />
                            <span className="text-[10px] text-yellow-500">Starting...</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>Agent server is starting...</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (isRunning) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            <span className="text-[10px] text-green-500">Connected</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>Agent server running on port {status?.port}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-muted-foreground/50 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/50">Offline</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>Agent server is not running</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function AgentsSidebar({ className }: { className?: string }) {
    const sessions = useSessions();
    const activeSession = useActiveSession();
    const [searchQuery, setSearchQuery] = useState("");

    const handleNewAgent = () => {
        const sessionName = `New Chat`;
        agentActions.createSession(sessionName);
    };

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        agentActions.deleteSession(sessionId);
    };

    const handleRenameSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const newName = prompt("Enter new name:");
        if (newName && newName.trim()) {
            agentActions.updateSessionName(sessionId, newName.trim());
        }
    };

    const filteredSessions = sessions.filter((session) =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={cn("flex flex-col h-full bg-[#18181b] text-foreground border-r border-[#27272a]", className)}>
            {/* Header */}
            <div className="p-3 flex flex-col gap-3">
                {/* Title and Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-semibold">Agents</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <ServerStatusIndicator />
                        <AgentSettingsDialog />
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search..."
                        className="pl-8 h-8 bg-[#27272a] border-none text-xs focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/70"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    className="w-full justify-center bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-8 text-xs font-medium"
                    onClick={handleNewAgent}
                >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    New Agent
                </Button>
            </div>

            {/* Recent Label */}
            <div className="px-4 py-2 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Recent
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
                {filteredSessions.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                        {searchQuery ? "No matching chats" : "No chats yet"}
                    </div>
                ) : (
                    filteredSessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => agentActions.setActiveSession(session.id)}
                            className={cn(
                                "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200",
                                activeSession?.id === session.id
                                    ? "bg-[#27272a] text-foreground"
                                    : "text-muted-foreground hover:bg-[#27272a]/50 hover:text-foreground"
                            )}
                        >
                            <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                                <span className="truncate text-xs font-medium">
                                    {session.name}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                                    <span>
                                        {session.messages.length} msgs
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-muted-foreground/50 mr-2 whitespace-nowrap">
                                    {session.messages.length > 0
                                        ? formatDistanceToNow(new Date(session.messages[session.messages.length - 1].timestamp), { addSuffix: false }).replace('about ', '')
                                        : 'Just now'
                                    }
                                </span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-[#3f3f46] rounded-sm">
                                            <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32 bg-[#18181b] border-[#27272a]">
                                        <DropdownMenuItem onClick={(e) => handleRenameSession(e, session.id)} className="text-xs">
                                            <Edit2 className="h-3 w-3 mr-2" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleDeleteSession(e, session.id)} className="text-xs text-red-500 focus:text-red-500">
                                            <Trash2 className="h-3 w-3 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
