import React from "react";
import { useIDEStore } from "../../stores/ideStore";
import ProjectExplorer from "./ProjectExplorer";
import GitHistoryPanel from "./GitHistoryPanel";
import { Folder, GitCommit } from "lucide-react";
import { cn } from "@/lib/cn";
import "../../css/Sidebar.css";

interface ActivityButtonProps {
  active?: boolean;
  onClick?: () => void;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
}

const ActivityButton: React.FC<ActivityButtonProps> = ({ active, onClick, label, icon: Icon }) => (
  <button
    className={cn(
      "w-12 h-12 flex items-center justify-center transition-colors rounded-lg",
      active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
    )}
    title={label}
    onClick={onClick}
  >
    <Icon size={20} />
  </button>
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
