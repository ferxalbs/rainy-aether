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
      "w-10 h-10 flex items-center justify-center",
      active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
    )}
    title={label}
    onClick={onClick}
  >
    <Icon size={18} />
  </button>
);

const Sidebar: React.FC = () => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const activeTab = snapshot.sidebarActive;

  return (
    <div className="flex border-r">
      <div className="flex flex-col items-center py-1 sidebar-activity-bar">
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
      <div className="w-64 sidebar-content">
        {activeTab === "explorer" && <ProjectExplorer />}
        {activeTab === "git" && <GitHistoryPanel />}
      </div>
    </div>
  );
};

export default Sidebar;
