import React from "react";
import { Folder, GitCommit, Bot, Search, Settings } from "lucide-react";

import { useIDEStore } from "../../stores/ideStore";
import ProjectExplorer from "./ProjectExplorer";
import GitHistoryPanel from "./GitHistoryPanel";
import GlobalSearch from "./GlobalSearch";
import { WebviewSidebarContainer } from "./WebviewPanel";
import { useWebviewPanels } from "@/stores/webviewStore";
import { cn } from "@/lib/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "../../css/Sidebar.css";

interface ActivityButtonProps {
  active?: boolean;
  onClick?: () => void;
  label: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;
}

const ActivityButton: React.FC<ActivityButtonProps> = ({ active, onClick, label, icon: Icon }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-md transition-all duration-200",
            // Default state
            "text-muted-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5",
            // Active state
            active && "bg-white/15 dark:bg-white/10 text-primary font-medium"
          )}
          onClick={onClick}
          aria-label={label}
        >
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          )}
          <Icon size={20} strokeWidth={1.5} className="transition-transform duration-200 group-hover:scale-110" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 400;

const Sidebar: React.FC = () => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const activeTab = snapshot.sidebarActive;
  const isOpen = snapshot.isSidebarOpen;
  const webviewPanels = useWebviewPanels();

  // Resize state
  const [sidebarWidth, setSidebarWidth] = React.useState(280);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      document.body.style.userSelect = 'none';
      const newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(e.clientX, SIDEBAR_MAX_WIDTH));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto'; // Restore selection
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  // Helper to check if a tab is a webview tab
  const isWebviewTab = (tab: string): boolean => {
    return tab.startsWith('webview:');
  };

  // Get webview ID from tab
  const getWebviewId = (tab: string): string => {
    return tab.replace('webview:', '');
  };

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "flex h-full relative group select-none z-40",
        "bg-[var(--bg-sidebar)] border-r border-sidebar-border", // Solid background using explicit variable
        !isResizing && "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]"
      )}
      style={{ width: isOpen ? sidebarWidth : 56 }}
    >
      {/* Activity Bar */}
      <div className="flex flex-col items-center py-3 h-full w-14 shrink-0 border-r border-sidebar-border/20 bg-transparent gap-1">

        {/* Navigation */}
        <ActivityButton
          icon={Folder}
          label="Explorer"
          active={activeTab === "explorer"}
          onClick={() => {
            if (activeTab === "explorer" && isOpen) {
              actions.setSidebarOpen(false);
            } else {
              actions.setSidebarActive("explorer");
              if (!isOpen) actions.setSidebarOpen(true);
            }
          }}
        />
        <ActivityButton
          icon={Search}
          label="Search"
          active={activeTab === "search"}
          onClick={() => {
            if (activeTab === "search" && isOpen) {
              actions.setSidebarOpen(false);
            } else {
              actions.setSidebarActive("search");
              if (!isOpen) actions.setSidebarOpen(true);
            }
          }}
        />
        <ActivityButton
          icon={GitCommit}
          label="Git"
          active={activeTab === "git"}
          onClick={() => {
            if (activeTab === "git" && isOpen) {
              actions.setSidebarOpen(false);
            } else {
              actions.setSidebarActive("git");
              if (!isOpen) actions.setSidebarOpen(true);
            }
          }}
        />

        {/* Dynamic Panels Separator */}
        {webviewPanels.length > 0 && (
          <div className="w-6 h-px bg-border/20 my-2" />
        )}

        {/* Dynamic webview panels */}
        {webviewPanels.map((panel) => (
          <ActivityButton
            key={panel.viewId}
            icon={Bot}
            label={panel.title}
            active={activeTab === `webview:${panel.viewId}`}
            onClick={() => {
              const target = `webview:${panel.viewId}` as any;
              if (activeTab === target && isOpen) {
                actions.setSidebarOpen(false);
              } else {
                actions.setSidebarActive(target);
                if (!isOpen) actions.setSidebarOpen(true);
              }
            }}
          />
        ))}

        {/* Bottom Section */}
        <div className="mt-auto flex flex-col gap-2 pb-4 items-center w-full">
          <div className="w-6 h-px bg-border/20 mb-2" />
          <ActivityButton
            icon={Settings}
            label="Settings"
            onClick={() => actions.openSettings()}
          />
        </div>
      </div>

      {/* Content Panel */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden">
          {activeTab === "explorer" && <ProjectExplorer />}
          {activeTab === "search" && <GlobalSearch />}
          {activeTab === "git" && <GitHistoryPanel />}
          {isWebviewTab(activeTab) && (
            <WebviewSidebarContainer viewId={getWebviewId(activeTab)} />
          )}
        </div>
      )}

      {/* Resize Handle */}
      {isOpen && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 z-50 transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />
      )}
    </div>
  );
};

export default Sidebar;
