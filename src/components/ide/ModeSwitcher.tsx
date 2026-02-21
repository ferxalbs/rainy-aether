import React from "react";
import { useIDEStore, useIDEState } from "@/stores/ideStore";
import { cn } from "@/lib/utils";

const ModeSwitcher: React.FC = () => {
  const { state, actions } = useIDEStore();
  useIDEState(); // Subscribe to state changes
  const snapshot = state();
  const currentMode = snapshot.viewMode;

  return (
    <div className="flex items-center bg-black/5 dark:bg-black/20 p-[3px] rounded-lg border border-border/40 shadow-inner">
      <button
        onClick={() => actions.setViewMode("ide")}
        className={cn(
          "px-3 py-1 text-[10px] font-bold tracking-widest rounded-md transition-all duration-300 ease-out outline-none flex items-center justify-center",
          currentMode === "ide"
            ? "bg-background text-foreground shadow-sm border border-border/80 scale-100"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent scale-95 opacity-70",
        )}
      >
        IDE
      </button>
      <button
        onClick={() => actions.setViewMode("agents")}
        className={cn(
          "px-3 py-1 text-[10px] font-bold tracking-widest rounded-md transition-all duration-300 ease-out outline-none flex items-center justify-center",
          currentMode === "agents"
            ? "bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 bg-background text-foreground shadow-sm border border-indigo-500/30 dark:border-indigo-500/40 scale-100"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent scale-95 opacity-70",
        )}
      >
        AGENTS
      </button>
    </div>
  );
};

export default ModeSwitcher;
