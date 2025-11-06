import React from 'react';
import {
  Plus,
  Trash2,
  Bot,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Zap,
  Cloud,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '@/lib/utils';
import { agentActions } from '@/stores/agentStore';
import type { AgentSession } from '@/stores/agentStore';

interface SessionSidebarProps {
  sessions: Map<string, AgentSession>;
  activeSessionId: string | null;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSessionId,
  onNewSession,
  onDeleteSession,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div className={cn(
      "border-r border-border flex flex-col bg-muted/30 transition-all duration-200",
      collapsed ? "w-12" : "w-64"
    )}>
      <div className={cn(
        "p-4 border-b border-border flex items-center justify-between",
        collapsed && "p-2 justify-center"
      )}>
        {!collapsed && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onToggleCollapse}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onToggleCollapse}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="agents" className="h-full flex flex-col">
            <div className="p-3 border-b border-border">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="agents" className="gap-2">
                  <Bot className="h-3 w-3" />
                  Agents
                </TabsTrigger>
                <TabsTrigger value="providers" className="gap-2">
                  <Cloud className="h-3 w-3" />
                  Providers
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="agents" className="flex-1 overflow-hidden mt-0">
              <div className="h-full overflow-y-auto p-3 space-y-2">
                {sessions.size === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No active sessions</p>
                    <p className="text-xs mt-1">Create one to get started</p>
                  </div>
                ) : (
                  Array.from(sessions.values()).map((session) => (
                    <Card
                      key={session.id}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                        activeSessionId === session.id && 'bg-accent border-primary'
                      )}
                      onClick={() => agentActions.setActiveSession(session.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <h3 className="text-sm font-medium text-foreground truncate">
                              {session.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {session.messages.length} messages
                            </Badge>
                            {session.isStreaming && (
                              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-500">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                streaming
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="providers" className="flex-1 overflow-hidden mt-0">
              <div className="h-full overflow-y-auto p-3 space-y-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Groq
                  </h3>
                  <p className="text-xs text-muted-foreground">Fast & Free AI models</p>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                      • Llama 3.3 70B
                    </div>
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                      • Llama 3.1 8B
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    OpenAI
                  </h3>
                  <p className="text-xs text-muted-foreground">GPT models with advanced capabilities</p>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                      • GPT-4 Turbo
                    </div>
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                      • GPT-3.5 Turbo
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Anthropic
                  </h3>
                  <p className="text-xs text-muted-foreground">Claude models for complex reasoning</p>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                      • Claude 3.5 Sonnet
                    </div>
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                      • Claude 3 Haiku
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Configure providers and API keys in Settings
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {collapsed && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Array.from(sessions.values()).map((session) => (
            <div
              key={session.id}
              className={cn(
                'w-8 h-8 rounded cursor-pointer flex items-center justify-center hover:bg-accent/50 transition-colors relative group',
                activeSessionId === session.id && 'bg-accent border border-primary'
              )}
              onClick={() => agentActions.setActiveSession(session.id)}
              title={session.name}
            >
              <Bot className="h-4 w-4 text-muted-foreground" />
              {session.isStreaming && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}

      {!collapsed && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="default"
              className="w-full"
              size="sm"
              onClick={onNewSession}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </>
      )}

      {collapsed && (
        <div className="p-2 border-t border-border">
          <Button
            variant="default"
            className="w-full h-8"
            size="sm"
            onClick={onNewSession}
            title="New Session"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};