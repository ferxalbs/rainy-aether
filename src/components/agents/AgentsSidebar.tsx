import { Plus, Search, Trash2, Edit2, MoreHorizontal, Zap, Circle, Brain, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSessions, useActiveSession, agentActions } from "@/stores/agentStore"
import { useAgentServer } from "@/hooks/useAgentServer"
import { getAvailableAgents, type AgentInfo } from "@/services/agentServer"
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

/**
 * Full-screen loading overlay while server starts
 */
function ServerLoadingOverlay() {
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-xl">
                        <Brain className="h-8 w-8 text-purple-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                        <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">Starting Agent Server</p>
                    <p className="text-xs text-muted-foreground">Initializing AI capabilities...</p>
                </div>
                <div className="flex gap-1 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}

function ServerStatusIndicator() {
    const { isRunning, isStarting, status } = useAgentServer();

    if (isStarting) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                            <Circle className="h-1.5 w-1.5 fill-yellow-500 text-yellow-500 animate-pulse" />
                            <span className="text-[10px] font-medium text-yellow-500">Starting</span>
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
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                            <span className="text-[10px] font-medium text-green-500">Online</span>
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
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border">
                        <Circle className="h-1.5 w-1.5 fill-muted-foreground text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">Offline</span>
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
    const { isRunning, isStarting } = useAgentServer();
    const [agents, setAgents] = useState<AgentInfo[]>([]);

    // Fetch agents when server comes online
    useEffect(() => {
        if (isRunning) {
            getAvailableAgents(true).then(response => {
                if (response?.agents) {
                    setAgents(response.agents);
                }
            }).catch(err => {
                console.error('[AgentsSidebar] Failed to fetch agents:', err);
            });
        } else {
            setAgents([]);
        }
    }, [isRunning]);

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
        <div className={cn("flex flex-col h-full bg-muted/40 border-r border-border relative", className)}>
            {/* Loading Overlay - shown while server starts */}
            {isStarting && <ServerLoadingOverlay />}
            {/* Header */}
            <div className="p-3 flex flex-col gap-3">
                {/* Title and Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Agents</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ServerStatusIndicator />
                        <AgentSettingsDialog />
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search..."
                            className="pl-8 h-8 bg-background border-border text-xs focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/70"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                        onClick={handleNewAgent}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Available Agents - shown when server is online */}
            {isRunning && agents.length > 0 && (
                <>
                    <div className="px-4 py-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                        <span>Agents</span>
                        <span className="bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-sm">{agents.length}</span>
                    </div>
                    <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
                        {agents.map((agent) => (
                            <TooltipProvider key={agent.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 hover:bg-muted/50 border border-border/50 cursor-pointer transition-colors">
                                            <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                <Zap className="h-2.5 w-2.5 text-primary" />
                                            </div>
                                            <span className="text-[10px] font-medium text-foreground truncate">{agent.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[200px]">
                                        <p className="text-xs font-medium">{agent.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{agent.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </>
            )}

            {/* Recent Label */}
            <div className="px-4 py-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                <span>Recent</span>
                <span className="bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground">{filteredSessions.length}</span>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {filteredSessions.length === 0 ? (
                    <div className="p-8 text-xs text-muted-foreground text-center flex flex-col items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Search className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <p>{searchQuery ? "No matching chats" : "No chats yet"}</p>
                    </div>
                ) : (
                    filteredSessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => agentActions.setActiveSession(session.id)}
                            className={cn(
                                "group flex flex-col gap-1 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                                activeSession?.id === session.id
                                    ? "bg-background border-border/50 shadow-sm text-foreground"
                                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className={cn(
                                    "truncate text-xs font-medium max-w-[140px]",
                                    activeSession?.id === session.id ? "text-primary" : "text-foreground"
                                )}>
                                    {session.name}
                                </span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted rounded-sm -mr-1">
                                                <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32 bg-popover border-border">
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

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 w-full">
                                <span className="truncate max-w-[120px]">
                                    {session.messages.length > 0 ? (
                                        <span className="flex items-center gap-1">
                                            <span>
                                                {session.messages[session.messages.length - 1].content.slice(0, 30)}
                                                {session.messages[session.messages.length - 1].content.length > 30 ? '...' : ''}
                                            </span>
                                        </span>
                                    ) : (
                                        "New conversation"
                                    )}
                                </span>
                                <span className="whitespace-nowrap shrink-0 ml-2">
                                    {session.messages.length > 0
                                        ? formatDistanceToNow(new Date(session.messages[session.messages.length - 1].timestamp), { addSuffix: false }).replace('about ', '')
                                        : 'Just now'
                                    }
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
