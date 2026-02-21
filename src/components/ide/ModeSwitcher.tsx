import React from "react";
import { useIDEStore, useIDEState } from "@/stores/ideStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ModeSwitcher: React.FC = () => {
  const { state, actions } = useIDEStore();
  useIDEState(); // Subscribe to state changes
  const snapshot = state();
  const currentMode = snapshot.viewMode;

  return (
    <Select
      value={currentMode}
      onValueChange={(value: "ide" | "agents") => actions.setViewMode(value)}
    >
      <SelectTrigger className="h-5 px-1.5 py-0 text-[10px] font-medium bg-transparent border-none shadow-none focus:ring-0 hover:bg-muted/50 rounded-md transition-colors w-fit !ring-0 !outline-none gap-0.5 [&>svg]:size-3 text-foreground/80 hover:text-foreground">
        {" "}
        <SelectValue placeholder="IDE" />
      </SelectTrigger>
      <SelectContent align="center" className="min-w-[100px] z-[9999]">
        <SelectItem value="ide" className="text-xs font-medium cursor-pointer">
          IDE
        </SelectItem>
        <SelectItem
          value="agents"
          className="text-xs font-medium cursor-pointer"
        >
          AGENTS
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ModeSwitcher;
