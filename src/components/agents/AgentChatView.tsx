import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GridPattern } from '@/components/ui/grid-pattern';
import { MenuIcon } from 'lucide-react';

/**
 * AgentChatView - Main chat interface component
 * Optimized for IDE integration with responsive sidebar and clean layout
 */
export function AgentChatView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block w-64 border-r border-border flex-shrink-0">
        <ChatSidebar />
      </div>

      {/* Mobile Sidebar - Sheet overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 border-none [&>button]:hidden"
        >
          <ChatSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile Header - Only visible on small screens */}
        <div className="flex md:hidden items-center justify-between border-b border-border px-4 h-12 bg-background/95 backdrop-blur-sm z-20">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8"
          >
            <MenuIcon className="size-4" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <span className="text-sm font-medium">Agent Chat</span>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Chat Content with Background Pattern */}
        <div className="flex-1 overflow-hidden relative">
          <GridPattern className="pointer-events-none opacity-50" />

          <div className="relative z-10 h-full">
            <ChatMain />
          </div>
        </div>
      </div>
    </div>
  );
}
