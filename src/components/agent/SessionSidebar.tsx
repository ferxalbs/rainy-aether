import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Bot,
  Loader2,
  Key,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { agentActions } from '@/stores/agentStore';
import type { AgentSession } from '@/stores/agentStore';
import { ApiKeyDialog } from './ApiKeyDialog';
import { CredentialService } from '@/services/agent/credentialService';

interface SessionSidebarProps {
  sessions: Map<string, AgentSession>;
  activeSessionId: string | null;
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSessionId,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onNewSession,
  onDeleteSession,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [, setApiKeyRefresh] = useState(0);
  const credentialService = CredentialService.getInstance();

  const hasApiKey = credentialService.hasApiKey(selectedProvider);
  const providerNames: Record<string, string> = {
    groq: 'Groq',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
  };

  return (
    <>
      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        providerId={selectedProvider}
        providerName={providerNames[selectedProvider] || selectedProvider}
        onKeyConfigured={() => {
          // Force refresh of hasApiKey check
          setApiKeyRefresh(prev => prev + 1);
        }}
      />

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
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

          {/* Provider & Model Selection */}
          <div className="p-3 space-y-2 border-t border-border">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <Select value={selectedProvider} onValueChange={onProviderChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groq">Groq (Fast & Free)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider === 'groq' && (
                    <>
                      <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                      <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B</SelectItem>
                    </>
                  )}
                  {selectedProvider === 'openai' && (
                    <>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {selectedProvider === 'anthropic' && (
                    <>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowApiKeyDialog(true)}
              >
                <Key className={cn(
                  'h-4 w-4',
                  hasApiKey ? 'text-green-500' : 'text-muted-foreground'
                )} />
              </Button>
              <Button
                variant="default"
                className="flex-1"
                size="sm"
                onClick={onNewSession}
                disabled={!selectedModel || !hasApiKey}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            {!hasApiKey && selectedProvider && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                API key required
              </p>
            )}
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
            disabled={!selectedModel || !hasApiKey}
            title="New Session"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
    </>
  );
};