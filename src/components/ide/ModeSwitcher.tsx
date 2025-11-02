import React from "react";
import { useIDEStore, useIDEState } from "@/stores/ideStore";
import { cn } from "@/lib/utils";

const ModeSwitcher: React.FC = () => {
  const { state, actions } = useIDEStore();
  useIDEState(); // Subscribe to state changes
  const snapshot = state();
  const currentMode = snapshot.viewMode;

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-md p-0.5 border border-border/50">
      <button
        onClick={() => actions.setViewMode("ide")}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded transition-all",
          currentMode === "ide"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        IDE
      </button>
      <button
        onClick={() => actions.setViewMode("agents")}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded transition-all",
          currentMode === "agents"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Agents
      </button>
    </div>
  );
};

export default ModeSwitcher;
