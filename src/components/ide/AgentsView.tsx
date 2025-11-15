/**
 * Agents View - Main Container
 *
 * Container for AI agent interface with sidebar navigation
 * Features:
 * - Home: Overview and quick actions
 * - Ask AI: Chat interface with AI agent
 * - Prompts: Gallery of pre-configured prompts
 */

import { useState } from 'react';
import { Home, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { HomeView } from '@/components/agent/HomeView';
import { AskAIView } from '@/components/agent/AskAIView';
import { PromptGalleryView } from '@/components/agent/PromptGalleryView';
import type { PromptTemplate } from '@/stores/promptStore';

type AgentView = 'home' | 'ask-ai' | 'prompts';

const AgentsView: React.FC = () => {
  const [currentView, setCurrentView] = useState<AgentView>('home');

  const navigationItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      description: 'Overview and quick actions'
    },
    {
      id: 'ask-ai' as const,
      label: 'Ask AI',
      icon: MessageSquare,
      description: 'Chat with AI assistant'
    },
    {
      id: 'prompts' as const,
      label: 'Prompts',
      icon: Sparkles,
      description: 'Prompt gallery'
    }
  ];

  const handleNavigate = (view: AgentView) => {
    setCurrentView(view);
  };

  const handleUsePrompt = (prompt: PromptTemplate) => {
    // Switch to Ask AI view and populate the prompt
    setCurrentView('ask-ai');
    // TODO: Pass the prompt content to AskAIView
    console.log('Using prompt:', prompt);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-56 border-r border-border bg-background">
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">AI Agent</h2>
            <p className="text-xs text-muted-foreground">Intelligent coding assistant</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-secondary text-secondary-foreground'
                  )}
                  onClick={() => handleNavigate(item.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </Button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              Powered by advanced AI models
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'home' && <HomeView onNavigate={handleNavigate} />}
        {currentView === 'ask-ai' && <AskAIView />}
        {currentView === 'prompts' && (
          <PromptGalleryView
            onUsePrompt={handleUsePrompt}
            onCreatePrompt={() => {
              // TODO: Open create prompt modal
              console.log('Create new prompt');
            }}
            onEditPrompt={(prompt) => {
              // TODO: Open edit prompt modal
              console.log('Edit prompt:', prompt);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AgentsView;
