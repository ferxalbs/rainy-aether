import React, { useCallback, useMemo } from "react";
import { Save, Play, Settings, Palette, Sun, Moon, Menu, Folder, PanelLeft, PanelBottom, PanelRight } from "lucide-react";
import { useThemeState, toggleDayNight } from "../../stores/themeStore";
import { useIDEStore } from "../../stores/ideStore";
import { usePanelState, panelActions } from "../../stores/panelStore";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import "../../css/TopToolbar.css";

interface TopToolbarProps {
  onOpenThemeSwitcher: () => void;
}

const TopToolbar: React.FC<TopToolbarProps> = ({ onOpenThemeSwitcher }) => {
  const { actions, state } = useIDEStore();
  const theme = useThemeState();
  const panelState = usePanelState();

  const workspaceName = useMemo(() => state().workspace?.name ?? "Rainy Coder IDE", [state]);

  const handleSave = useCallback(() => {
    const snapshot = state();
    const activeFile = snapshot.openFiles.find((file) => file.id === snapshot.activeFileId);
    if (activeFile) {
      actions.saveFile(activeFile.id);
    }
  }, [actions, state]);

  const handleSaveAs = useCallback(() => {
    const snapshot = state();
    if (snapshot.activeFileId) {
      actions.saveFileAs(snapshot.activeFileId);
    }
  }, [actions, state]);

  const handleSaveAll = useCallback(() => {
    actions.saveAllFiles();
  }, [actions]);

  const themeToggleTitle = useMemo(() => {
    return `Switch to ${theme.currentTheme.mode === "day" ? "night" : "day"} mode`;
  }, [theme.currentTheme.mode]);

  const isDayMode = theme.currentTheme.mode === "day";

  return (
    <div className="flex items-center justify-between h-10 px-3 border-b top-toolbar">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" title="Menu" className="text-secondary">
          <Menu size={16} />
        </Button>

        <div className="w-px h-6 mx-1 separator" />

        <Button
          variant="ghost"
          size="icon"
          onClick={actions.openFolderDialog}
          title="Open Project"
          className="text-secondary"
        >
          <Folder size={16} />
        </Button>

        <Button variant="ghost" size="icon" title="Run" className="text-secondary">
          <Play size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Save"
          className="text-secondary"
          onClick={handleSave}
        >
          <Save size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Save As"
          className="text-secondary"
          onClick={handleSaveAs}
        >
          <Save size={16} />
          <span className="ml-1 text-xs text-secondary">As</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Save All"
          className="text-secondary"
          onClick={handleSaveAll}
        >
          <Save size={16} />
          <span className="ml-1 text-xs text-secondary">All</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Settings"
          className="text-secondary"
          onClick={actions.openSettings}
        >
          <Settings size={16} />
        </Button>
      </div>

      <div className="flex-1 text-center">
        <span className="text-sm font-medium text-secondary">{workspaceName}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDayNight}
          title={themeToggleTitle}
          className="text-secondary"
        >
          {isDayMode ? <Moon size={16} /> : <Sun size={16} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenThemeSwitcher}
          title="Open theme store"
          className="text-secondary"
        >
          <Palette size={16} />
        </Button>

        <div className="w-px h-6 mx-1 separator" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => actions.toggleSidebar()}
          title="Toggle Sidebar"
          className={cn("text-secondary", state().isSidebarOpen && "bg-muted text-foreground")}
        >
          <PanelLeft size={16} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => panelActions.togglePanel('terminal')}
          title="Toggle Panel"
          className={cn("text-secondary", panelState.isBottomPanelOpen && "bg-muted text-foreground")}
        >
          <PanelBottom size={16} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => actions.toggleRightSidebar()}
          title="Toggle Agents View"
          className={cn("text-secondary", state().isRightSidebarOpen && "bg-muted text-foreground")}
        >
          <PanelRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default TopToolbar;
