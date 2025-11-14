import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GridPattern } from '@/components/ui/grid-pattern';
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/cn';

/**
 * AgentChatView - Main chat interface component for Rainy AI
 * Optimized for IDE integration with resizable panels and glassmorphism design
 */
export function AgentChatView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {/* Subtle background pattern */}
      <GridPattern className="pointer-events-none opacity-[0.02] absolute inset-0" />

      {/* Mobile Sidebar - Sheet overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 border-none [&>button]:hidden backdrop-blur-xl bg-background/95"
        >
          <ChatSidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop Layout with Resizable Panels */}
      <div className="hidden md:flex h-full w-full relative z-10">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
            className={cn(
              'transition-all duration-300',
              isCollapsed && 'min-w-0'
            )}
          >
            <div className="h-full border-r border-border/50 bg-background/95 backdrop-blur-sm">
              <ChatSidebar />
            </div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle
            withHandle
            className="w-1 bg-border/30 hover:bg-border/60 transition-colors relative group"
          >
            <div className="absolute inset-y-0 -left-3 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-12 w-1 rounded-full bg-primary/20" />
            </div>
          </ResizableHandle>

          {/* Main Content Panel */}
          <ResizablePanel defaultSize={80} minSize={50}>
            <div className="flex flex-col h-full">
              {/* Top Bar with Collapse Button */}
              <div className="flex items-center justify-between border-b border-border/50 px-4 h-12 bg-background/80 backdrop-blur-md">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-8 w-8 hover:bg-accent/50 transition-colors"
                >
                  {isCollapsed ? (
                    <PanelLeftOpenIcon className="size-4" />
                  ) : (
                    <PanelLeftCloseIcon className="size-4" />
                  )}
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  Rainy AI
                </span>
                <div className="w-8" />
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-hidden relative">
                <ChatMain />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 h-12 bg-background/95 backdrop-blur-md z-20">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8"
          >
            <MenuIcon className="size-4" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <span className="text-sm font-medium">Rainy AI</span>
          <div className="w-8" />
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden relative">
          <ChatMain />
        </div>
      </div>
    </div>
  );
}
