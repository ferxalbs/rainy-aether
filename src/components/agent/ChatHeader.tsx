import React, { useState } from 'react';
import { Settings, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { AgentSession } from '@/stores/agentStore';
import { AgentSettingsModal } from './AgentSettingsModal';

interface ChatHeaderProps {
  activeSession: AgentSession | null;
  showToolsPanel: boolean;
  onToggleToolsPanel: () => void;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeSession,
  showToolsPanel,
  onToggleToolsPanel,
  className,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <div
      className={cn(
        'flex h-14 items-center justify-between border-b border-border/40 bg-background/85 px-4 shadow-sm backdrop-blur-sm lg:h-16 lg:px-6',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
        <div className="flex flex-col">
          <h1 className="truncate text-sm font-semibold text-foreground lg:text-base">
            {activeSession ? activeSession.name : 'Agent Workspace'}
          </h1>
          {activeSession && (
            <span className="text-xs text-muted-foreground/80">
              {activeSession.providerId} · {activeSession.modelId}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 lg:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleToolsPanel}
          className={cn(
            'gap-2 rounded-full px-3 text-xs font-medium transition-colors',
            showToolsPanel ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Tools</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowSettings(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
      
      <AgentSettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />
    </div>
  );
};