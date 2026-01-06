import {
  Plus,
  Search,
  Trash2,
  Edit2,
  MoreHorizontal,
  Zap,
  Circle,
  Brain,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useSessions,
  useActiveSession,
  agentActions,
} from "@/stores/agentStore";
import { useAgentServer } from "@/hooks/useAgentServer";
import { getAvailableAgents, type AgentInfo } from "@/services/agentServer";
import { AgentSettingsDialog } from "./AgentSettingsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          <p className="text-sm font-medium text-foreground">
            Starting Agent Server
          </p>
          <p className="text-xs text-muted-foreground">
            Initializing AI capabilities...
          </p>
        </div>
        <div className="flex gap-1 mt-2">
          <div
            className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
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
              <span className="text-[10px] font-medium text-yellow-500">
                Starting
              </span>
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
              <span className="text-[10px] font-medium text-green-500">
                Online
              </span>
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
            <span className="text-[10px] font-medium text-muted-foreground">
              Offline
            </span>
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
      getAvailableAgents(true)
        .then((response) => {
          if (response?.agents) {
            setAgents(response.agents);
          }
        })
        .catch((err) => {
          console.error("[AgentsSidebar] Failed to fetch agents:", err);
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
    <div
      className={cn(
        "flex flex-col h-full bg-background/10 backdrop-blur-3xl border-r border-primary/10 relative",
        className
      )}
    >
      {/* Loading Overlay - shown while server starts */}
      {isStarting && <ServerLoadingOverlay />}
      {/* Header */}
      <div className="p-4 flex flex-col gap-4">
        {/* Title and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10 transition-transform hover:scale-105">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight uppercase">
              Agents
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ServerStatusIndicator />
            <AgentSettingsDialog />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              placeholder="Search chats..."
              className="pl-9 h-9 bg-background/20 border-primary/10 text-xs focus-visible:ring-1 focus-visible:ring-primary/30 placeholder:text-muted-foreground/40 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all hover:scale-105 active:scale-95"
            onClick={handleNewAgent}
          >
            <Plus className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Available Agents - shown when server is online */}
      {isRunning && agents.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="px-5 py-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            <span>Capabilities</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {agents.length}
            </span>
          </div>
          <div className="px-3 grid grid-cols-2 gap-2">
            {agents.map((agent) => (
              <TooltipProvider key={agent.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/5 hover:bg-primary/5 border border-primary/5 hover:border-primary/20 cursor-pointer transition-all group active:scale-95">
                      <div className="h-6 w-6 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center shrink-0 border border-primary/5 group-hover:border-primary/10 transition-colors">
                        <Zap className="h-3 w-3 text-primary/60 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground transition-colors truncate">
                        {agent.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[220px] bg-background/80 backdrop-blur-xl border-primary/20"
                  >
                    <p className="text-xs font-bold text-primary mb-1">
                      {agent.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {agent.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}

      {/* Recent Label */}
      <div className="px-5 py-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
        <span>Recent History</span>
        <span className="bg-muted/40 px-2 py-0.5 rounded-full text-muted-foreground/60">
          {filteredSessions.length}
        </span>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 scrollbar-hide">
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-xs text-muted-foreground/40 text-center flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-muted/20 flex items-center justify-center border border-dashed border-muted-foreground/20">
              <Search className="h-5 w-5 opacity-30" />
            </div>
            <p className="font-medium tracking-tight">
              {searchQuery
                ? "No matching chats"
                : "Start your first conversation"}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => agentActions.setActiveSession(session.id)}
              className={cn(
                "group flex flex-col gap-1.5 p-3 rounded-2xl cursor-pointer transition-all duration-300 border",
                activeSession?.id === session.id
                  ? "bg-primary/5 border-primary/20 shadow-lg shadow-black/10 text-foreground"
                  : "bg-transparent border-transparent hover:bg-background/20 hover:border-primary/10 text-muted-foreground/70 hover:text-foreground"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={cn(
                    "truncate text-xs font-bold tracking-tight max-w-[140px]",
                    activeSession?.id === session.id
                      ? "text-primary"
                      : "text-foreground/80"
                  )}
                >
                  {session.name}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-primary/10 rounded-lg -mr-1 text-muted-foreground/40 hover:text-primary transition-colors"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-36 bg-background/80 backdrop-blur-2xl border-primary/10 p-1.5"
                    >
                      <DropdownMenuItem
                        onClick={(e) => handleRenameSession(e, session.id)}
                        className="text-xs font-medium rounded-lg"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-2 text-primary/60" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="text-xs font-medium text-destructive focus:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 w-full group-hover:text-muted-foreground/60 transition-colors">
                <span className="truncate max-w-[120px] font-medium italic">
                  {session.description ||
                    (session.messages.length > 1
                      ? session.messages[
                          session.messages.length - 1
                        ].content.slice(0, 35) +
                        (session.messages[session.messages.length - 1].content
                          .length > 35
                          ? "..."
                          : "")
                      : "Click to continue...")}
                </span>
                <span className="whitespace-nowrap shrink-0 ml-2 font-semibold tabular-nums">
                  {session.messages.length > 0
                    ? formatDistanceToNow(
                        new Date(
                          session.messages[
                            session.messages.length - 1
                          ].timestamp
                        ),
                        { addSuffix: false }
                      ).replace("about ", "")
                    : "Just now"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
