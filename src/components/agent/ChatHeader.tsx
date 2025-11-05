import React from 'react';
import { Settings, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import type { AgentSession } from '@/stores/agentStore';

interface ChatHeaderProps {
  activeSession: AgentSession | null;
  showToolsPanel: boolean;
  onToggleToolsPanel: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeSession,
  showToolsPanel,
  onToggleToolsPanel,
}) => {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-3 lg:px-4 bg-muted/20">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
        <h1 className="text-sm font-medium text-foreground truncate">
          {activeSession ? activeSession.name : 'Agent Workspace'}
        </h1>
        {activeSession && (
          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
            {activeSession.providerId} · {activeSession.modelId}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1 lg:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleToolsPanel}
          className={cn(showToolsPanel && 'bg-accent')}
        >
          <Wrench className="h-4 w-4 mr-1 lg:mr-2" />
          <span className="hidden sm:inline">Tools</span>
        </Button>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};