import React, { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import MenuBar from "./MenuBar";
import AboutDialog from "./AboutDialog";

import Sidebar from "./Sidebar";
import FileViewer from "./FileViewer";
import StatusBar from "./StatusBar";
import ThemeSwitcher from "./ThemeSwitcher";
import QuickOpen from "./QuickOpen";
import CommandPalette from "./CommandPalette";
import StartupPage from "./StartupPage";
import SettingsPage from "./SettingsPage";
import AgentsView from "./AgentsView";
import CloneDialog from "./CloneDialog";
import { UpdateNotification } from "./UpdateNotification";
import { useIDEStore, useIDEState } from "../../stores/ideStore";
import "../../css/IDE.css";
import TabSwitcher from "./TabSwitcher";
import TerminalPanel from "./TerminalPanel";
import { editorActions, editorState } from "../../stores/editorStore";
import { useLoadingState } from "../../stores/loadingStore";
import { usePanelState, panelActions } from "../../stores/panelStore";
import LoadingScreen from "../ui/loading-screen";
import GoToLineDialog from "../ui/go-to-line-dialog";
import { cn } from "@/lib/utils";
import ExtensionMarketplace from "./ExtensionMarketplace";
import ExtensionManager from "./ExtensionManager";
import {
  initializeUpdateService,
  startAutoUpdateCheck,
} from "../../services/updateService";
import ProblemsPanel from "./ProblemsPanel";
import PreviewBrowserPanel from "./PreviewBrowserPanel";
import { RightSidebar } from "./RightSidebar";
import MCPManager from "../agents/MCPManager";
import SubagentManager from "../agents/SubagentManager";

import { useDiffState } from "@/stores/diffStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

const IDE: React.FC = () => {
  const { state, actions } = useIDEStore();
  useIDEState(); // Subscribe to state changes to trigger re-renders
  const loadingState = useLoadingState();
  const panelState = usePanelState(); // Use centralized panel state

  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTabSwitcherOpen, setIsTabSwitcherOpen] = useState(false);
  const [tabSwitchHighlight, setTabSwitchHighlight] = useState<string | null>(
    null
  );
  const [isGoToLineOpen, setIsGoToLineOpen] = useState(false);
  const [isExtensionMarketplaceOpen, setIsExtensionMarketplaceOpen] =
    useState(false);
  const [isExtensionManagerOpen, setIsExtensionManagerOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMCPManagerOpen, setIsMCPManagerOpen] = useState(false);
  const [isSubagentManagerOpen, setIsSubagentManagerOpen] = useState(false);

  // Subscribe to diff state to auto-open diff panel
  const diffState = useDiffState();

  // Auto-open diff panel when a diff is created
  useEffect(() => {
    if (diffState.isDiffPanelOpen && diffState.activeDiffSetId) {
      panelActions.showPanel("diff");
    }
  }, [diffState.isDiffPanelOpen, diffState.activeDiffSetId]);

  const tabSwitchHideTimerRef = useRef<number | null>(null);
  const quickOpenRef = useRef(isQuickOpenOpen);
  const commandPaletteRef = useRef(isCommandPaletteOpen);
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);

  useEffect(() => {
    quickOpenRef.current = isQuickOpenOpen;
  }, [isQuickOpenOpen]);

  useEffect(() => {
    commandPaletteRef.current = isCommandPaletteOpen;
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    return () => {
      if (tabSwitchHideTimerRef.current) {
        clearTimeout(tabSwitchHideTimerRef.current);
        tabSwitchHideTimerRef.current = null;
      }
    };
  }, []);

  // Initialize panel store
  useEffect(() => {
    panelActions.initialize();
  }, []);

  // Initialize update service
  useEffect(() => {
    const initUpdates = async () => {
      try {
        await initializeUpdateService();
        // Start auto-checking for updates every 24 hours
        startAutoUpdateCheck(24);
      } catch (error) {
        console.error("[IDE] Failed to initialize update service:", error);
        // Update service failure is not critical - app can continue
        // User will be notified through the UI if updates are unavailable
      }
    };

    initUpdates();
  }, []);

  const cycleTab = useCallback((direction: "next" | "prev") => {
    const snapshot = stateRef.current();
    const files = snapshot.openFiles;
    if (!files.length) {
      return;
    }

    const activeId = snapshot.activeFileId;
    const currentIndex = Math.max(
      0,
      files.findIndex((file) => file.id === activeId)
    );
    const targetIndex =
      direction === "next"
        ? (currentIndex + 1) % files.length
        : (currentIndex - 1 + files.length) % files.length;
    const target = files[targetIndex];

    if (target) {
      actionsRef.current.setActiveFile(target.id);
      setTabSwitchHighlight(target.id);
      setIsTabSwitcherOpen(true);
      if (tabSwitchHideTimerRef.current) {
        clearTimeout(tabSwitchHideTimerRef.current);
      }
      tabSwitchHideTimerRef.current = window.setTimeout(() => {
        setIsTabSwitcherOpen(false);
      }, 1200);
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const code = event.code;

      const target = event.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");
      const overlayActive = quickOpenRef.current || commandPaletteRef.current;
      if (!overlayActive && isInput && !(ctrl || shift || event.altKey)) {
        return;
      }

      if (ctrl && !shift && key === "p") {
        event.preventDefault();
        setIsQuickOpenOpen(true);
        return;
      }

      if (ctrl && shift && key === "p") {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (ctrl && !shift && key === "o") {
        event.preventDefault();
        actionsRef.current.openFolderDialog();
        return;
      }

      if (ctrl && !shift && key === "n") {
        event.preventDefault();
        actionsRef.current.createNewFile();
        return;
      }

      if (ctrl && key === ",") {
        event.preventDefault();
        actionsRef.current.openSettings();
        return;
      }

      if (ctrl && !shift && !event.altKey && key === "s") {
        event.preventDefault();
        const snapshot = stateRef.current();
        const active = snapshot.openFiles.find(
          (file) => file.id === snapshot.activeFileId
        );
        if (active) {
          actionsRef.current.saveFile(active.id);
        }
        return;
      }

      if (ctrl && event.altKey && !shift && key === "s") {
        event.preventDefault();
        actionsRef.current.saveAllFiles();
        return;
      }

      if (ctrl && shift && !event.altKey && key === "s") {
        event.preventDefault();
        const snapshot = stateRef.current();
        const active = snapshot.activeFileId;
        if (active) {
          actionsRef.current.saveFileAs(active);
        }
        return;
      }

      if (ctrl && !shift && key === "w") {
        event.preventDefault();
        const snapshot = stateRef.current();
        const active = snapshot.activeFileId;
        if (active) {
          actionsRef.current.closeFile(active);
        }
        return;
      }

      if (ctrl && key === "tab") {
        event.preventDefault();
        cycleTab(shift ? "prev" : "next");
        return;
      }

      if (ctrl && !shift && key === "g") {
        event.preventDefault();
        setIsGoToLineOpen(true);
        return;
      }

      if (ctrl && !shift && key === "f") {
        event.preventDefault();
        editorActions.openSearchPanel();
        return;
      }

      if (ctrl && shift && key === "f") {
        event.preventDefault();
        // Open global search in sidebar
        actionsRef.current.setSidebarActive("search");
        actionsRef.current.setSidebarOpen(true);
        return;
      }

      if (!ctrl && !shift && key === "f3") {
        event.preventDefault();
        editorActions.findNext();
        return;
      }

      if (ctrl && shift && key === "h") {
        event.preventDefault();
        editorActions.openSearchPanel();
        editorActions.replaceAll();
        return;
      }

      if (event.altKey && !ctrl && !shift && (code === "KeyZ" || key === "z")) {
        event.preventDefault();
        event.stopPropagation();
        editorActions.toggleWrap();
        return;
      }

      if (ctrl && code === "Backquote") {
        event.preventDefault();
        panelActions.togglePanel("terminal");
        return;
      }

      if (ctrl && !shift && key === "b") {
        event.preventDefault();
        actionsRef.current.toggleSidebar();
        return;
      }

      if (ctrl && shift && key === "z") {
        event.preventDefault();
        editorActions.redo();
        return;
      }

      if (ctrl && shift && key === "m") {
        event.preventDefault();
        panelActions.togglePanel("problems");
        return;
      }
    };

    window.addEventListener("keydown", handler, { capture: true });

    const isTauriEnv =
      typeof window !== "undefined" && (window as any).__TAURI__;
    const unlistenFns: (() => void)[] = [];
    let unregisterAll: (() => Promise<void>) | null = null;
    let cancelled = false;

    const attachListener = (
      eventName: string,
      callback: (event: unknown) => void
    ) => {
      listen(eventName as any, callback as any)
        .then((unlisten) => {
          if (!cancelled) {
            unlistenFns.push(unlisten);
          } else {
            unlisten();
          }
        })
        .catch((error) => {
          console.warn(`Failed to listen for ${eventName}`, error);
        });
    };

    if (isTauriEnv) {
      attachListener("shortcut/trigger", (event) => {
        console.info("shortcut/trigger", (event as any).payload);
      });
      attachListener("shortcut/quick-open", () => setIsQuickOpenOpen(true));
      attachListener("shortcut/command-palette", () =>
        setIsCommandPaletteOpen(true)
      );
      attachListener("shortcut/open-settings", () =>
        actionsRef.current.openSettings()
      );
      attachListener("shortcut/save-file", () => {
        const snapshot = stateRef.current();
        const active = snapshot.openFiles.find(
          (file) => file.id === snapshot.activeFileId
        );
        if (active) {
          actionsRef.current.saveFile(active.id);
        }
      });
      attachListener("shortcut/save-all", () =>
        actionsRef.current.saveAllFiles()
      );
      attachListener("shortcut/save-as", () => {
        const snapshot = stateRef.current();
        const active = snapshot.activeFileId;
        if (active) {
          actionsRef.current.saveFileAs(active);
        }
      });
      attachListener("shortcut/close-file", () => {
        const snapshot = stateRef.current();
        const active = snapshot.activeFileId;
        if (active) {
          actionsRef.current.closeFile(active);
        }
      });
      attachListener("shortcut/tab-next", () => cycleTab("next"));
      attachListener("shortcut/tab-prev", () => cycleTab("prev"));
      attachListener("shortcut/go-to-line", () => setIsGoToLineOpen(true));
      attachListener("shortcut/find", () => editorActions.openSearchPanel());
      attachListener("shortcut/find-next", () => editorActions.findNext());
      attachListener("shortcut/replace-all", () => {
        editorActions.openSearchPanel();
        editorActions.replaceAll();
      });
      attachListener("shortcut/toggle-wrap", () => editorActions.toggleWrap());
      attachListener("shortcut/open-project", () =>
        actionsRef.current.openFolderDialog()
      );
      attachListener("shortcut/new-file", () =>
        actionsRef.current.createNewFile()
      );
      attachListener("shortcut/toggle-sidebar", () =>
        actionsRef.current.toggleSidebar()
      );
      attachListener("shortcut/toggle-terminal", () =>
        panelActions.togglePanel("terminal")
      );
      attachListener("shortcut/redo", () => editorActions.redo());
      attachListener("shortcut/toggle-problems", () =>
        panelActions.togglePanel("problems")
      );

      (async () => {
        try {
          const mod = await import("@tauri-apps/plugin-global-shortcut");
          if (cancelled) {
            await mod.unregisterAll();
            return;
          }

          unregisterAll = mod.unregisterAll;

          const registerShortcut = async (
            shortcut: string,
            callback: () => void
          ) => {
            try {
              await mod.register(shortcut, callback);
            } catch (error) {
              console.warn(`Failed to register shortcut ${shortcut}`, error);
            }
          };

          await registerShortcut("CommandOrControl+P", () =>
            setIsQuickOpenOpen(true)
          );
          await registerShortcut("CommandOrControl+Shift+P", () =>
            setIsCommandPaletteOpen(true)
          );
          await registerShortcut("CommandOrControl+,", () =>
            actionsRef.current.openSettings()
          );
          await registerShortcut("CommandOrControl+S", () => {
            const snapshot = stateRef.current();
            const active = snapshot.openFiles.find(
              (file) => file.id === snapshot.activeFileId
            );
            if (active) {
              actionsRef.current.saveFile(active.id);
            }
          });
          await registerShortcut("CommandOrControl+Shift+S", () => {
            const snapshot = stateRef.current();
            const active = snapshot.activeFileId;
            if (active) {
              actionsRef.current.saveFileAs(active);
            }
          });
          await registerShortcut("CommandOrControl+Alt+S", () =>
            actionsRef.current.saveAllFiles()
          );
          await registerShortcut("CommandOrControl+W", () => {
            const snapshot = stateRef.current();
            const active = snapshot.activeFileId;
            if (active) {
              actionsRef.current.closeFile(active);
            }
          });
          await registerShortcut("CommandOrControl+Tab", () =>
            cycleTab("next")
          );
          await registerShortcut("CommandOrControl+Shift+Tab", () =>
            cycleTab("prev")
          );
          await registerShortcut("CommandOrControl+G", () =>
            setIsGoToLineOpen(true)
          );
          await registerShortcut("CommandOrControl+F", () =>
            editorActions.openSearchPanel()
          );
          await registerShortcut("F3", () => editorActions.findNext());
          await registerShortcut("CommandOrControl+Shift+H", () => {
            editorActions.openSearchPanel();
            editorActions.replaceAll();
          });
          await registerShortcut("Alt+Z", () => editorActions.toggleWrap());
          await registerShortcut("CommandOrControl+O", () =>
            actionsRef.current.openFolderDialog()
          );
          await registerShortcut("CommandOrControl+N", () =>
            actionsRef.current.createNewFile()
          );
          await registerShortcut("CommandOrControl+B", () =>
            actionsRef.current.toggleSidebar()
          );
          await registerShortcut("CommandOrControl+`", () =>
            panelActions.togglePanel("terminal")
          );
          await registerShortcut("CommandOrControl+Shift+Z", () =>
            editorActions.redo()
          );
          await registerShortcut("CommandOrControl+Shift+X", () =>
            setIsExtensionMarketplaceOpen(true)
          );
          await registerShortcut("CommandOrControl+Shift+M", () =>
            panelActions.togglePanel("problems")
          );
          console.info("Global shortcuts registered via JS plugin");
        } catch (error) {
          console.warn("Global shortcut plugin registration failed", error);
        }
      })();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handler, true);
      unlistenFns.forEach((fn) => fn());
      if (unregisterAll) {
        unregisterAll().catch(() => {
          /* noop */
        });
      }
    };
  }, [cycleTab]);

  const snapshot = state();
  const currentView = snapshot.currentView;
  const viewMode = snapshot.viewMode;
  const isZenMode = snapshot.isZenMode;
  const view = editorState.view;
  const maxLine = view ? view.getModel()?.getLineCount() ?? 1 : 1;
  const showBottomPanel = !isZenMode && panelState.isBottomPanelOpen;

  // Show workspace loading overlay when loading workspace
  const isWorkspaceLoading =
    loadingState.isLoading && loadingState.loadingContext === "workspace";

  return (
    <div className="h-screen flex flex-col ide-container">
      {/* Workspace loading overlay */}
      {isWorkspaceLoading && (
        <div className="absolute inset-0 z-50">
          <LoadingScreen
            stages={loadingState.stages}
            context={loadingState.loadingContext}
          />
        </div>
      )}
      <MenuBar
        onOpenQuickOpen={() => setIsQuickOpenOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenThemeSwitcher={() => setIsThemeSwitcherOpen(true)}
        onOpenGoToLine={() => setIsGoToLineOpen(true)}
        onOpenExtensionMarketplace={() => setIsExtensionMarketplaceOpen(true)}
        onOpenExtensionManager={() => setIsExtensionManagerOpen(true)}
        onOpenCloneDialog={() => setIsCloneDialogOpen(true)}
        onOpenKeyboardShortcuts={() => console.log("TODO: Keyboard shortcuts")}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {currentView === "startup" && <StartupPage />}

      {currentView === "settings" && <SettingsPage />}

      {currentView === "editor" && (
        <>
          {/* Conditionally render based on view mode - BUT keep both mounted to preserve state */}

          {/* Agents View - Always mounted, hidden when not active */}
          <div
            className={cn(
              "flex flex-1 min-h-0 overflow-hidden",
              viewMode !== "agents" && "hidden"
            )}
          >
            <AgentsView />
          </div>

          {/* Main Editor Layout - Always mounted, hidden when acting as agents view */}
          <div
            className={cn(
              "flex flex-1 overflow-hidden",
              viewMode === "agents" && "hidden"
            )}
          >
            {!isZenMode && <Sidebar />}
            <div className="flex-1 flex h-full overflow-hidden">
              {/* Main editor area */}
              <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Editor panel */}
                <div
                  className={cn(
                    "flex-1 min-h-[200px] overflow-hidden",
                    showBottomPanel && "max-h-[calc(100%-220px)]"
                  )}
                >
                  <FileViewer />
                </div>

                {/* Bottom panel - Terminal/Problems */}
                {showBottomPanel && (
                  <div className="h-[220px] shrink-0 border-t border-border overflow-hidden">
                    <Tabs
                      value={panelState.activeBottomTab}
                      onValueChange={(value) =>
                        panelActions.setActiveTab(
                          value as
                            | "terminal"
                            | "problems"
                            | "diff"
                            | "output"
                            | "preview"
                        )
                      }
                      className="h-full flex flex-col gap-0"
                    >
                      <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 p-0 h-8 shrink-0">
                        <TabsTrigger
                          value="terminal"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          Terminal
                        </TabsTrigger>
                        <TabsTrigger
                          value="problems"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          Problems
                        </TabsTrigger>
                        <TabsTrigger
                          value="preview"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          Preview
                        </TabsTrigger>
                        <button
                          type="button"
                          onClick={() => panelActions.hidePanel()}
                          className="ml-auto mr-2 p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                          aria-label="Close Panel"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </TabsList>

                      <TabsContent
                        value="terminal"
                        forceMount
                        className={cn(
                          "flex-1 m-0 overflow-hidden",
                          panelState.activeBottomTab !== "terminal" && "hidden"
                        )}
                      >
                        <TerminalPanel />
                      </TabsContent>

                      <TabsContent
                        value="problems"
                        className="flex-1 m-0 overflow-hidden"
                      >
                        <ProblemsPanel
                          onClose={() => panelActions.hidePanel()}
                        />
                      </TabsContent>

                      <TabsContent
                        value="preview"
                        className="flex-1 m-0 overflow-hidden"
                      >
                        <PreviewBrowserPanel
                          onClose={() => panelActions.hidePanel()}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>

              {/* Right sidebar - fixed width */}
              {state().isRightSidebarOpen && (
                <aside className="w-[320px] shrink-0 border-l border-border h-full overflow-hidden">
                  <RightSidebar />
                </aside>
              )}
            </div>
          </div>
          {!isZenMode && (
            <div className={cn(viewMode === "agents" && "hidden")}>
              <StatusBar
                onToggleProblemsPanel={() =>
                  panelActions.togglePanel("problems")
                }
              />
            </div>
          )}
        </>
      )}

      <ThemeSwitcher
        isOpen={isThemeSwitcherOpen}
        onClose={() => setIsThemeSwitcherOpen(false)}
      />

      <QuickOpen
        isOpen={isQuickOpenOpen}
        onClose={() => setIsQuickOpenOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenThemeSwitcher={() => setIsThemeSwitcherOpen(true)}
        onOpenMCPManager={() => setIsMCPManagerOpen(true)}
        onOpenSubagentManager={() => setIsSubagentManagerOpen(true)}
      />

      <GoToLineDialog
        open={isGoToLineOpen}
        onOpenChange={setIsGoToLineOpen}
        maxLine={maxLine}
        onConfirm={(line) => editorActions.goToLine(line)}
      />

      <TabSwitcher
        isOpen={isTabSwitcherOpen}
        files={snapshot.openFiles}
        highlightId={tabSwitchHighlight}
      />

      <ExtensionMarketplace
        isOpen={isExtensionMarketplaceOpen}
        onClose={() => setIsExtensionMarketplaceOpen(false)}
      />

      <ExtensionManager
        isOpen={isExtensionManagerOpen}
        onClose={() => setIsExtensionManagerOpen(false)}
      />

      <CloneDialog
        isOpen={isCloneDialogOpen}
        onClose={() => setIsCloneDialogOpen(false)}
        onSuccess={(path) => {
          setIsCloneDialogOpen(false);
          actionsRef.current.loadWorkspace({
            name: path.split(/[/\\]/).pop() || path,
            path,
            type: "folder",
          });
        }}
      />

      {/* About Dialog */}
      <AboutDialog open={isAboutOpen} onOpenChange={setIsAboutOpen} />

      {/* MCP Manager */}
      <MCPManager
        isOpen={isMCPManagerOpen}
        onClose={() => setIsMCPManagerOpen(false)}
        workspace={snapshot.workspace?.path || undefined}
        onOpenFile={(path) => {
          // Create a FileNode and open the file in editor
          const name = path.split("/").pop() || path;
          actions.openFile({ name, path, is_directory: false });
        }}
      />

      {/* Subagent Manager */}
      <SubagentManager
        isOpen={isSubagentManagerOpen}
        onClose={() => setIsSubagentManagerOpen(false)}
      />

      {/* Update notification */}
      <UpdateNotification />
    </div>
  );
};

export default IDE;
