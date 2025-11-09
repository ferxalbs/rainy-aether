import React, { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import MenuBar from "./MenuBar";

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
import { terminalActions, useTerminalState } from "../../stores/terminalStore";
import { useLoadingState } from "../../stores/loadingStore";
import LoadingScreen from "../ui/loading-screen";
import GoToLineDialog from "../ui/go-to-line-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import ExtensionMarketplace from "./ExtensionMarketplace";
import ExtensionManager from "./ExtensionManager";
import { initializeUpdateService, startAutoUpdateCheck } from "../../services/updateService";
import ProblemsPanel from "./ProblemsPanel";

const IDE: React.FC = () => {
  const { state, actions } = useIDEStore();
  useIDEState(); // Subscribe to state changes to trigger re-renders
  const terminalSnapshot = useTerminalState();
  const loadingState = useLoadingState();

  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTabSwitcherOpen, setIsTabSwitcherOpen] = useState(false);
  const [tabSwitchHighlight, setTabSwitchHighlight] = useState<string | null>(null);
  const [isGoToLineOpen, setIsGoToLineOpen] = useState(false);
  const [isExtensionMarketplaceOpen, setIsExtensionMarketplaceOpen] = useState(false);
  const [isExtensionManagerOpen, setIsExtensionManagerOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isProblemsPanelOpen, setIsProblemsPanelOpen] = useState(false);

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

  // Initialize update service
  useEffect(() => {
    const initUpdates = async () => {
      await initializeUpdateService();
      // Start auto-checking for updates every 24 hours
      startAutoUpdateCheck(24);
    };

    initUpdates().catch(console.error);
  }, []);

  const cycleTab = useCallback(
    (direction: "next" | "prev") => {
      const snapshot = stateRef.current();
      const files = snapshot.openFiles;
      if (!files.length) {
        return;
      }

      const activeId = snapshot.activeFileId;
      const currentIndex = Math.max(0, files.findIndex((file) => file.id === activeId));
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
    },
    [],
  );

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
        const active = snapshot.openFiles.find((file) => file.id === snapshot.activeFileId);
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
        terminalActions.toggle();
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
        console.log('[IDE] Ctrl+Shift+M pressed, toggling problems panel');
        setIsProblemsPanelOpen((prev) => {
          console.log('[IDE] Problems panel state changing from', prev, 'to', !prev);
          return !prev;
        });
        return;
      }
    };

    window.addEventListener("keydown", handler, { capture: true });

    const isTauriEnv = typeof window !== "undefined" && (window as any).__TAURI__;
    const unlistenFns: (() => void)[] = [];
    let unregisterAll: (() => Promise<void>) | null = null;
    let cancelled = false;

    const attachListener = (eventName: string, callback: (event: unknown) => void) => {
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
      attachListener("shortcut/command-palette", () => setIsCommandPaletteOpen(true));
      attachListener("shortcut/open-settings", () => actionsRef.current.openSettings());
      attachListener("shortcut/save-file", () => {
        const snapshot = stateRef.current();
        const active = snapshot.openFiles.find((file) => file.id === snapshot.activeFileId);
        if (active) {
          actionsRef.current.saveFile(active.id);
        }
      });
      attachListener("shortcut/save-all", () => actionsRef.current.saveAllFiles());
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
      attachListener("shortcut/open-project", () => actionsRef.current.openFolderDialog());
      attachListener("shortcut/new-file", () => actionsRef.current.createNewFile());
      attachListener("shortcut/toggle-sidebar", () => actionsRef.current.toggleSidebar());
      attachListener("shortcut/toggle-terminal", () => terminalActions.toggle());
      attachListener("shortcut/redo", () => editorActions.redo());
      attachListener("shortcut/toggle-problems", () => setIsProblemsPanelOpen((prev) => !prev));

      (async () => {
        try {
          const mod = await import("@tauri-apps/plugin-global-shortcut");
          if (cancelled) {
            await mod.unregisterAll();
            return;
          }

          unregisterAll = mod.unregisterAll;

          const registerShortcut = async (shortcut: string, callback: () => void) => {
            try {
              await mod.register(shortcut, callback);
            } catch (error) {
              console.warn(`Failed to register shortcut ${shortcut}`, error);
            }
          };

          await registerShortcut("CommandOrControl+P", () => setIsQuickOpenOpen(true));
          await registerShortcut("CommandOrControl+Shift+P", () => setIsCommandPaletteOpen(true));
          await registerShortcut("CommandOrControl+,", () => actionsRef.current.openSettings());
          await registerShortcut("CommandOrControl+S", () => {
            const snapshot = stateRef.current();
            const active = snapshot.openFiles.find((file) => file.id === snapshot.activeFileId);
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
          await registerShortcut("CommandOrControl+Alt+S", () => actionsRef.current.saveAllFiles());
          await registerShortcut("CommandOrControl+W", () => {
            const snapshot = stateRef.current();
            const active = snapshot.activeFileId;
            if (active) {
              actionsRef.current.closeFile(active);
            }
          });
          await registerShortcut("CommandOrControl+Tab", () => cycleTab("next"));
          await registerShortcut("CommandOrControl+Shift+Tab", () => cycleTab("prev"));
          await registerShortcut("CommandOrControl+G", () => setIsGoToLineOpen(true));
          await registerShortcut("CommandOrControl+F", () => editorActions.openSearchPanel());
          await registerShortcut("F3", () => editorActions.findNext());
          await registerShortcut("CommandOrControl+Shift+H", () => {
            editorActions.openSearchPanel();
            editorActions.replaceAll();
          });
          await registerShortcut("Alt+Z", () => editorActions.toggleWrap());
          await registerShortcut("CommandOrControl+O", () => actionsRef.current.openFolderDialog());
          await registerShortcut("CommandOrControl+N", () => actionsRef.current.createNewFile());
          await registerShortcut("CommandOrControl+B", () => actionsRef.current.toggleSidebar());
          await registerShortcut("CommandOrControl+Shift+Z", () => editorActions.redo());
          await registerShortcut("CommandOrControl+Shift+X", () => setIsExtensionMarketplaceOpen(true));
          await registerShortcut("CommandOrControl+Shift+M", () => setIsProblemsPanelOpen((prev) => !prev));
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
  const terminalVisible = !isZenMode && terminalSnapshot.visible;
  const problemsPanelVisible = !isZenMode && isProblemsPanelOpen;

  // Debug logging
  console.log('[IDE] Render state:', {
    isProblemsPanelOpen,
    isZenMode,
    problemsPanelVisible,
    terminalVisible,
    currentView: snapshot.currentView
  });

  // Show workspace loading overlay when loading workspace
  const isWorkspaceLoading = loadingState.isLoading && loadingState.loadingContext === 'workspace';

  return (
    <div className="h-screen flex flex-col ide-container">
      {/* Workspace loading overlay */}
      {isWorkspaceLoading && (
        <div className="absolute inset-0 z-50">
          <LoadingScreen stages={loadingState.stages} context={loadingState.loadingContext} />
        </div>
      )}
      {currentView === "startup" && <StartupPage />}

      {currentView === "settings" && <SettingsPage />}

      {currentView === "editor" && (
        <>
          <MenuBar
            onOpenQuickOpen={() => setIsQuickOpenOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenThemeSwitcher={() => setIsThemeSwitcherOpen(true)}
            onOpenGoToLine={() => setIsGoToLineOpen(true)}
            onOpenExtensionMarketplace={() => setIsExtensionMarketplaceOpen(true)}
            onOpenExtensionManager={() => setIsExtensionManagerOpen(true)}
            onOpenCloneDialog={() => setIsCloneDialogOpen(true)}
          />

          {/* Conditionally render based on view mode */}
          {viewMode === "agents" ? (
            <AgentsView />
          ) : (
            <>
              <div className="flex flex-1 overflow-hidden">
                {!isZenMode && <Sidebar />}
                <div className="flex-1 overflow-hidden">
                  <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel
                      defaultSize={(terminalVisible || problemsPanelVisible) ? 70 : 100}
                      minSize={30}
                      className="min-h-[200px]"
                    >
                      <FileViewer />
                    </ResizablePanel>
                    {(terminalVisible || problemsPanelVisible) && (
                      <>
                        <ResizableHandle withHandle />
                        <ResizablePanel
                          defaultSize={30}
                          minSize={20}
                          collapsedSize={0}
                          collapsible
                          className="min-h-[160px]"
                        >
                          {/* Bottom panel area - can show either terminal or problems */}
                          {terminalVisible && <TerminalPanel />}
                          {problemsPanelVisible && !terminalVisible && (
                            <ProblemsPanel onClose={() => setIsProblemsPanelOpen(false)} />
                          )}
                          {/* If both are visible, show them side by side or in tabs */}
                          {terminalVisible && problemsPanelVisible && (
                            <div className="h-full flex flex-col">
                              <div className="flex-1 overflow-hidden">
                                <ProblemsPanel onClose={() => setIsProblemsPanelOpen(false)} />
                              </div>
                            </div>
                          )}
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
              {!isZenMode && <StatusBar onToggleProblemsPanel={() => setIsProblemsPanelOpen((prev) => !prev)} />}
            </>
          )}
        </>
      )}

      <ThemeSwitcher isOpen={isThemeSwitcherOpen} onClose={() => setIsThemeSwitcherOpen(false)} />

      <QuickOpen isOpen={isQuickOpenOpen} onClose={() => setIsQuickOpenOpen(false)} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenThemeSwitcher={() => setIsThemeSwitcherOpen(true)}
      />

      <GoToLineDialog
        open={isGoToLineOpen}
        onOpenChange={setIsGoToLineOpen}
        maxLine={maxLine}
        onConfirm={(line) => editorActions.goToLine(line)}
      />

      <TabSwitcher isOpen={isTabSwitcherOpen} files={snapshot.openFiles} highlightId={tabSwitchHighlight} />

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
          actionsRef.current.loadWorkspace({ name: path.split(/[/\\]/).pop() || path, path, type: "folder" });
        }}
      />

      {/* Update notification */}
      <UpdateNotification />
    </div>
  );
};

export default IDE;
