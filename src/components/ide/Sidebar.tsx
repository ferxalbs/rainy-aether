import React from "react";
import { Folder, GitCommit } from "lucide-react";

import { useIDEStore } from "../../stores/ideStore";
import ProjectExplorer from "./ProjectExplorer";
import GitHistoryPanel from "./GitHistoryPanel";
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

  return (
    <div className="flex h-full border-r ">
      {/* Activity Bar - Always visible */}
      <div className="flex flex-col items-center py-2 bg-sidebar border-r border-sidebar-border">
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
      </div>

      {/* Content Panel - Conditionally visible */}
      {isOpen && (
        <div className="w-64 bg-sidebar flex flex-col rounded-r-lg">
          {activeTab === "explorer" && <ProjectExplorer />}
          {activeTab === "git" && <GitHistoryPanel />}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
