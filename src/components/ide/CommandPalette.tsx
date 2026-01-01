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
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleDayNight, useThemeState, isExtensionThemeActive } from "../../stores/themeStore";
import { editorActions } from "../../stores/editorStore";
import { editorGroupActions } from "../../stores/editorGroupStore";

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
  disabled?: boolean;
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
        hint: isExtensionThemeActive() ? "(Disabled - Extension theme active)" : undefined,
        run: () => toggleDayNight(),
        icon: theme.currentTheme.mode === "day" ? "moon" : "sun",
        disabled: isExtensionThemeActive(),
      },
      {
        id: "open-theme-store",
        title: "Open Theme Store",
        run: () => onOpenThemeSwitcher(),
        icon: "palette",
      },
      // Folding commands
      {
        id: "fold-all",
        title: "Fold All",
        hint: "Ctrl+K Ctrl+0",
        run: () => editorActions.foldAll(),
      },
      {
        id: "unfold-all",
        title: "Unfold All",
        hint: "Ctrl+K Ctrl+J",
        run: () => editorActions.unfoldAll(),
      },
      {
        id: "fold",
        title: "Fold",
        hint: "Ctrl+Shift+[",
        run: () => editorActions.fold(),
      },
      {
        id: "unfold",
        title: "Unfold",
        hint: "Ctrl+Shift+]",
        run: () => editorActions.unfold(),
      },
      {
        id: "toggle-fold",
        title: "Toggle Fold",
        run: () => editorActions.toggleFold(),
      },
      {
        id: "fold-recursively",
        title: "Fold Recursively",
        run: () => editorActions.foldRecursively(),
      },
      {
        id: "unfold-recursively",
        title: "Unfold Recursively",
        run: () => editorActions.unfoldRecursively(),
      },
      // View commands
      {
        id: "toggle-minimap",
        title: "Toggle Minimap",
        run: () => editorActions.toggleMinimap(),
      },
      {
        id: "toggle-word-wrap",
        title: "Toggle Word Wrap",
        hint: "Alt+Z",
        run: () => editorActions.toggleWrap(),
      },
      // Split editor commands
      {
        id: "split-editor-right",
        title: "Split Editor Right",
        run: () => editorGroupActions.split("horizontal"),
      },
      {
        id: "split-editor-down",
        title: "Split Editor Down",
        run: () => editorGroupActions.split("vertical"),
      },
      {
        id: "close-all-splits",
        title: "Close All Editor Splits",
        run: () => editorGroupActions.closeSplits(),
      },
      // Search commands
      {
        id: "global-search",
        title: "Search in Files",
        hint: "Ctrl+Shift+F",
        run: () => {
          actions.setSidebarActive("search");
          actions.setSidebarOpen(true);
        },
      },
      // Format and code actions
      {
        id: "format-document",
        title: "Format Document",
        hint: "Shift+Alt+F",
        run: () => editorActions.formatDocument(),
      },
      {
        id: "go-to-definition",
        title: "Go to Definition",
        hint: "F12",
        run: () => editorActions.goToDefinition(),
      },
      {
        id: "peek-definition",
        title: "Peek Definition",
        hint: "Alt+F12",
        run: () => editorActions.peekDefinition(),
      },
      {
        id: "find-references",
        title: "Find All References",
        hint: "Shift+F12",
        run: () => editorActions.findAllReferences(),
      },
      {
        id: "rename-symbol",
        title: "Rename Symbol",
        hint: "F2",
        run: () => editorActions.renameSymbol(),
      },
      {
        id: "go-to-symbol",
        title: "Go to Symbol in Editor",
        hint: "Ctrl+Shift+O",
        run: () => editorActions.goToSymbol(),
      },
      // Toggle sidebar and zen mode
      {
        id: "toggle-sidebar",
        title: "Toggle Sidebar",
        hint: "Ctrl+B",
        run: () => actions.toggleSidebar(),
      },
      {
        id: "toggle-zen-mode",
        title: "Toggle Zen Mode",
        run: () => actions.toggleZenMode(),
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
    const command = filteredCommands[index];

    // Don't run disabled commands
    if (command.disabled) {
      return;
    }

    command.run();
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
    const sharedProps = { size: 18, className: "opacity-70 group-hover:opacity-100 transition-opacity" };
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
        return <Command {...sharedProps} />;
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh] animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl mx-4 transition-all duration-200 ease-out animate-in zoom-in-95 slide-in-from-top-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header / Input Area */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border dark:border-border/30 bg-muted/20">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/60 text-foreground"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/50 bg-background/20 px-1.5 py-0.5 rounded border border-border/20">ESC</span>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 scrollbar-hide">
            {filteredCommands.map((item, index) => {
              const isActive = selectedIndex === index;
              const isDisabled = item.disabled;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group px-4 py-3 text-sm flex items-center gap-4 rounded-xl transition-all duration-200",
                    isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    !isDisabled && (isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent hover:border-border/20"
                    ),
                  )}
                  onMouseEnter={() => !isDisabled && setSelectedIndex(index)}
                  onClick={() => {
                    if (isDisabled) return;
                    setSelectedIndex(index);
                    runSelected();
                  }}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground group-hover:bg-background/80"
                  )}>
                    {renderIcon(item.icon)}
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <div className={cn("font-medium text-sm", isActive ? "text-foreground" : "text-foreground/90")}>
                      {item.title}
                    </div>
                  </div>

                  {item.hint && (
                    <div className={cn(
                      "text-xs px-2 py-1 rounded-md font-medium font-mono",
                      isActive ? "bg-background/40 text-primary/80" : "bg-muted/30 text-muted-foreground group-hover:bg-background/40"
                    )}>
                      {item.hint}
                    </div>
                  )}

                  {isActive && !isDisabled && (
                    <ArrowRight className="w-4 h-4 text-primary opacity-50" />
                  )}
                </div>
              );
            })}

            {filteredCommands.length === 0 && (
              <div className="px-4 py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <div className="p-4 bg-muted/30 rounded-full">
                  <Search className="w-8 h-8 opacity-20" />
                </div>
                <p>No matching commands found</p>
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-muted/20 border-t border-border/10 text-[10px] text-muted-foreground flex justify-between">
            <span>{filteredCommands.length} commands available</span>
            <span className="opacity-50">Rainy Aether</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;