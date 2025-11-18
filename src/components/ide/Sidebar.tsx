import React from "react";
import { Folder, GitCommit, Bot } from "lucide-react";

import { useIDEStore } from "../../stores/ideStore";
import ProjectExplorer from "./ProjectExplorer";
import GitHistoryPanel from "./GitHistoryPanel";
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
  icon: React.ComponentType<{ size?: number | string }>;
}

const ActivityButton: React.FC<ActivityButtonProps> = ({ active, onClick, label, icon: Icon }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors hover:bg-muted/50",
            active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50"
          )}
          onClick={onClick}
          aria-label={label}
        >
          <Icon size={20} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="px-2 py-1 text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Sidebar: React.FC = () => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const activeTab = snapshot.sidebarActive;
  const isOpen = snapshot.isSidebarOpen;
  const webviewPanels = useWebviewPanels();

  // Helper to check if a tab is a webview tab
  const isWebviewTab = (tab: string): boolean => {
    return tab.startsWith('webview:');
  };

  // Get webview ID from tab
  const getWebviewId = (tab: string): string => {
    return tab.replace('webview:', '');
  };

  return (
    <div className="flex h-full border-r ">
      {/* Activity Bar - Always visible */}
      <div className="flex flex-col items-center py-2 bg-sidebar border-r border-sidebar-border">
        {/* Built-in panels */}
        <ActivityButton
          icon={Folder}
          label="Explorer"
          active={activeTab === "explorer"}
          onClick={() => actions.setSidebarActive("explorer")}
        />
        <ActivityButton
          icon={GitCommit}
          label="Git"
          active={activeTab === "git"}
          onClick={() => actions.setSidebarActive("git")}
        />

        {/* Separator */}
        {webviewPanels.length > 0 && (
          <div className="w-8 h-px bg-border my-2" />
        )}

        {/* Dynamic webview panels */}
        {webviewPanels.map((panel) => (
          <ActivityButton
            key={panel.viewId}
            icon={Bot} // Default icon, can be customized per panel
            label={panel.title}
            active={activeTab === `webview:${panel.viewId}`}
            onClick={() => actions.setSidebarActive(`webview:${panel.viewId}` as any)}
          />
        ))}
      </div>

      {/* Content Panel - Conditionally visible */}
      {isOpen && (
        <div className="w-64 bg-sidebar flex flex-col rounded-r-lg">
          {activeTab === "explorer" && <ProjectExplorer />}
          {activeTab === "git" && <GitHistoryPanel />}

          {/* Render webview panels */}
          {isWebviewTab(activeTab) && (
            <WebviewSidebarContainer viewId={getWebviewId(activeTab)} />
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
