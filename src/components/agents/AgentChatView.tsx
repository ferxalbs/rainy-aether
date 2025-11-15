import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { HomeView } from './HomeView';
import { AskAIView } from './AskAIView';
import { PromptsView } from './PromptsView';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAgentNavigationState } from '@/stores/agentNavigationStore';

/**
 * Render the responsive chat interface for Rainy AI with a collapsible desktop sidebar and a mobile overlay sidebar.
 *
 * Desktop layout presents a simple collapsible sidebar (w-0 when closed, w-64 when open) with smooth transitions and a main content area with a top bar containing a toggle button. Mobile layout exposes the sidebar as a sheet overlay. This is the main container for the Rainy AI chat interface - modern, simple, and perfectly optimized for IDE use.
 *
 * @returns The rendered chat interface element.
 */
export function AgentChatView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentView } = useAgentNavigationState();

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'ask-ai':
        return <AskAIView />;
      case 'prompts':
        return <PromptsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Mobile Sidebar - Sheet overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 border-none [&>button]:hidden"
        >
          <ChatSidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full w-full">
        {/* Sidebar */}
        <div
          className={cn(
            'h-full border-r border-border transition-all duration-300 ease-in-out',
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          )}
        >
          <ChatSidebar />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col h-full min-w-0">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border px-4 h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpenIcon className="size-4" />
              ) : (
                <PanelLeftCloseIcon className="size-4" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            <span className="text-sm font-semibold text-foreground">
              Rainy AI
            </span>
            <div className="w-8" />
          </div>

          {/* View Content */}
          <div className="flex-1 overflow-hidden">
            {renderView()}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-border px-4 h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <MenuIcon className="size-4" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <span className="text-sm font-semibold text-foreground">Rainy AI</span>
          <div className="w-8" />
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      </div>
    </div>
  );
}