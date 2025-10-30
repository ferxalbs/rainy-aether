import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIDEStore } from "../../stores/ideStore";
import {
  Search,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  Save as SaveIcon,
  Palette,
  Moon,
  Sun,
  FilePlus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleDayNight, useThemeState } from "../../stores/themeStore";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenThemeSwitcher: () => void;
}

type CommandItem = {
  id: string;
  title: string;
  hint?: string;
  run: () => void;
  icon?: "settings" | "folder" | "save" | "palette" | "moon" | "sun" | "fileplus";
};

function matchScore(query: string, title: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  if (t.includes(q)) return 100 - t.length;
  return -1;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenThemeSwitcher }) => {
  const { actions, state } = useIDEStore();
  const theme = useThemeState();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const getActiveFile = useCallback(() => {
    const snapshot = state();
    return snapshot.openFiles.find((file) => file.id === snapshot.activeFileId) ?? null;
  }, [state]);

  const allCommands = useMemo<CommandItem[]>(
    () => [
      {
        id: "open-project",
        title: "Open Project…",
        hint: "Ctrl+O",
        run: () => actions.openFolderDialog(),
        icon: "folder",
      },
      {
        id: "open-settings",
        title: "Open Settings",
        hint: "Ctrl+,",
        run: () => actions.openSettings(),
        icon: "settings",
      },
      {
        id: "close-project",
        title: "Close Project",
        run: () => actions.closeProject(),
        icon: "folder",
      },
      {
        id: "new-untitled",
        title: "New Untitled File",
        hint: "Ctrl+N",
        run: () => actions.createNewFile(),
        icon: "fileplus",
      },
      {
        id: "save-file",
        title: "Save Active File",
        hint: "Ctrl+S",
        run: () => {
          const file = getActiveFile();
          if (file) {
            actions.saveFile(file.id);
          }
        },
        icon: "save",
      },
      {
        id: "save-as",
        title: "Save As...",
        hint: "Ctrl+Shift+S",
        run: () => {
          const file = getActiveFile();
          if (file) {
            actions.saveFileAs(file.id);
          }
        },
        icon: "save",
      },
      {
        id: "save-all",
        title: "Save All Files",
        hint: "Ctrl+Alt+S",
        run: () => actions.saveAllFiles(),
        icon: "save",
      },
      {
        id: "toggle-theme",
        title: `Switch to ${theme.currentTheme.mode === "day" ? "Night" : "Day"} Mode`,
        run: () => toggleDayNight(),
        icon: theme.currentTheme.mode === "day" ? "moon" : "sun",
      },
      {
        id: "open-theme-store",
        title: "Open Theme Store",
        run: () => onOpenThemeSwitcher(),
        icon: "palette",
      },
    ],
    [actions, getActiveFile, onOpenThemeSwitcher, theme.currentTheme.mode],
  );

  const filteredCommands = useMemo(() => {
    const scored = allCommands
      .map((command) => ({ command, score: matchScore(query, command.title) }))
      .filter((entry) => entry.score >= 0 || query === "")
      .sort((a, b) => b.score - a.score);

    const items = (query ? scored : allCommands.map((command) => ({ command, score: 0 }))).map(
      (entry) => entry.command,
    );
    return items.slice(0, 50);
  }, [allCommands, query]);

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const runSelected = useCallback(() => {
    if (filteredCommands.length === 0) {
      return;
    }
    const index = Math.max(0, Math.min(selectedIndex, filteredCommands.length - 1));
    filteredCommands[index].run();
    handleClose();
  }, [filteredCommands, handleClose, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, Math.max(0, filteredCommands.length - 1)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        runSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands.length, handleClose, isOpen, runSelected]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const renderIcon = useCallback((icon?: CommandItem["icon"]) => {
    const sharedProps = { size: 14, className: "opacity-70" };
    switch (icon) {
      case "settings":
        return <SettingsIcon {...sharedProps} />;
      case "folder":
        return <FolderIcon {...sharedProps} />;
      case "save":
        return <SaveIcon {...sharedProps} />;
      case "palette":
        return <Palette {...sharedProps} />;
      case "moon":
        return <Moon {...sharedProps} />;
      case "sun":
        return <Sun {...sharedProps} />;
      case "fileplus":
        return <FilePlus {...sharedProps} />;
      default:
        return <Search {...sharedProps} />;
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div className="mx-auto mt-24 max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="rounded-md border border-border bg-secondary text-foreground shadow-xl">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search size={16} className="opacity-70" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Command Palette: type a command…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <button className="text-xs text-muted-foreground" title="Close" onClick={handleClose}>
              Esc
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.map((item, index) => {
              const isActive = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer flex items-center gap-2",
                    isActive ? "bg-muted" : "hover:bg-muted",
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    setSelectedIndex(index);
                    runSelected();
                  }}
                >
                  {renderIcon(item.icon)}
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                  </div>
                  {item.hint ? <div className="text-xs text-muted-foreground">{item.hint}</div> : null}
                </div>
              );
            })}

            {filteredCommands.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">No matching commands</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;