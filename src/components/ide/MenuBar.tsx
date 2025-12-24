import React, { useMemo } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
  MenubarSeparator,
  MenubarShortcut,
} from "../ui/menubar";
import { useIDEStore } from "../../stores/ideStore";
import { editorActions } from "../../stores/editorStore";
import { terminalActions, getTerminalState } from "../../stores/terminalStore";
import { panelActions, usePanelState } from "../../stores/panelStore";
import ModeSwitcher from "./ModeSwitcher";
import { PanelLeft, PanelBottom, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useNativeMenuEvents, useNativeMenu, MenuEventHandlers } from "../../hooks/useNativeMenuEvents";
import WindowControls from "./WindowControls";

interface MenuBarProps {
  onOpenQuickOpen?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenThemeSwitcher?: () => void;
  onOpenGoToLine?: () => void;
  onOpenExtensionMarketplace?: () => void;
  onOpenExtensionManager?: () => void;
  onOpenCloneDialog?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onOpenAbout?: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({
  onOpenQuickOpen,
  onOpenCommandPalette,
  onOpenThemeSwitcher,
  onOpenGoToLine,
  onOpenExtensionMarketplace,
  onOpenExtensionManager,
  onOpenCloneDialog,
  onOpenKeyboardShortcuts,
  onOpenAbout,
}) => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const panelState = usePanelState();
  const recentWorkspaces = snapshot.recentWorkspaces.slice(0, 5);
  const terminalState = getTerminalState();
  const activeSplit = terminalState.layout.splits.find(s => s.id === terminalState.layout.activeSplitId);
  const activeTerminalId = activeSplit?.activeSessionId;

  const handleQuickOpen = () => onOpenQuickOpen?.();
  const handleCommandPalette = () => onOpenCommandPalette?.();
  const handleThemeSwitcher = () => onOpenThemeSwitcher?.();
  const handleGoToLine = () => onOpenGoToLine?.();
  const handleExtensionMarketplace = () => onOpenExtensionMarketplace?.();
  const handleExtensionManager = () => onOpenExtensionManager?.();
  const handleCloneDialog = () => onOpenCloneDialog?.();
  const handleKeyboardShortcuts = () => onOpenKeyboardShortcuts?.();
  const handleAbout = () => onOpenAbout?.();

  const hasActiveFile = Boolean(snapshot.activeFileId);
  const hasWorkspace = Boolean(snapshot.workspace);

  // Detect platform for correct shortcuts
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const optKey = isMac ? '⌥' : 'Alt';

  // Check if we should use native macOS menu
  const useNative = useNativeMenu();

  // Set up native menu event handlers (macOS only)
  const nativeMenuHandlers: MenuEventHandlers = useMemo(() => ({
    // App menu
    'app:settings': () => actions.openSettings(),

    // File menu
    'file:open-project': () => actions.openFolderDialog(),
    'file:quick-open': handleQuickOpen,
    'file:close-project': () => actions.closeProject(),
    'file:new-file': () => actions.createNewFile(),
    'file:new-file-in-project': async () => {
      const base = state().workspace?.path;
      if (!base) return;
      const name = window.prompt("Enter file name (with extension)", "new-file.txt");
      if (!name) return;
      await actions.createFileAt(base, name);
    },
    'file:new-folder': async () => {
      const base = state().workspace?.path;
      if (!base) return;
      const name = window.prompt("Enter folder name", "NewFolder");
      if (!name) return;
      await actions.createFolderAt(base, name);
    },
    'file:close-editor': () => {
      const active = state().activeFileId;
      if (active) actions.closeFile(active);
    },
    'file:close-all': () => actions.closeAllEditors(),
    'file:save': () => {
      const active = state().activeFileId;
      if (active) actions.saveFile(active);
    },
    'file:save-as': () => {
      const active = state().activeFileId;
      if (active) actions.saveFileAs(active);
    },
    'file:save-all': () => actions.saveAllFiles(),
    'file:reveal-file': () => actions.revealActiveFile(),
    'file:reveal-workspace': () => actions.revealWorkspace(),
    'file:toggle-autosave': () => actions.setAutoSave(!state().autoSave),

    // Edit menu
    'edit:undo': () => editorActions.undo(),
    'edit:redo': () => editorActions.redo(),
    'edit:copy-line-up': () => editorActions.copyLineUp(),
    'edit:copy-line-down': () => editorActions.copyLineDown(),
    'edit:move-line-up': () => editorActions.moveLinesUp(),
    'edit:move-line-down': () => editorActions.moveLinesDown(),
    'edit:find': () => editorActions.openSearchPanel(),
    'edit:find-next': () => editorActions.findNext(),
    'edit:find-previous': () => editorActions.findPrevious(),
    'edit:replace': () => {
      editorActions.openSearchPanel();
      editorActions.replaceAll();
    },
    'edit:go-to-line': handleGoToLine,
    'edit:indent': () => editorActions.indentMore(),
    'edit:outdent': () => editorActions.indentLess(),
    'edit:comment-line': () => editorActions.commentLine(),
    'edit:block-comment': () => editorActions.toggleBlockComment(),
    'edit:toggle-wrap': () => editorActions.toggleWrap(),

    // View menu
    'view:command-palette': handleCommandPalette,
    'view:quick-open': handleQuickOpen,
    'view:toggle-sidebar': () => actions.toggleSidebar(),
    'view:toggle-zen-mode': () => actions.toggleZenMode(),
    'view:toggle-fullscreen': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_toggle_fullscreen', { label: null });
    },
    'view:toggle-minimap': () => editorActions.toggleMinimap(),
    'view:toggle-breadcrumbs': () => editorActions.toggleBreadcrumbs(),
    'view:explorer': () => actions.setSidebarActive("explorer"),
    'view:search': () => actions.setSidebarActive("search"),
    'view:git': () => actions.setSidebarActive("git"),
    'view:extensions': handleExtensionMarketplace,
    'view:terminal': () => panelActions.togglePanel('terminal'),
    'view:problems': () => panelActions.togglePanel('problems'),
    'view:output': () => panelActions.togglePanel('output'),
    'view:color-theme': handleThemeSwitcher,
    'view:toggle-theme': async () => {
      const mod = await import("../../stores/themeStore");
      await mod.toggleDayNight();
    },

    // Selection menu
    'selection:select-all': () => editorActions.selectAll(),
    'selection:expand': () => editorActions.expandSelection(),
    'selection:shrink': () => editorActions.shrinkSelection(),
    'selection:copy-line-up': () => editorActions.copyLinesUp(),
    'selection:copy-line-down': () => editorActions.copyLinesDown(),
    'selection:move-line-up': () => editorActions.moveLinesUp(),
    'selection:move-line-down': () => editorActions.moveLinesDown(),
    'selection:add-cursor-above': () => editorActions.addCursorAbove(),
    'selection:add-cursor-below': () => editorActions.addCursorBelow(),
    'selection:add-next-occurrence': () => editorActions.addSelectionToNextFindMatch(),
    'selection:select-all-occurrences': () => editorActions.selectAllMatches(),
    'selection:select-line': () => editorActions.selectLine(),
    'selection:delete-line': () => editorActions.deleteLines(),

    // Go menu
    'go:definition': () => editorActions.goToDefinition(),
    'go:type-definition': () => editorActions.goToTypeDefinition(),
    'go:references': () => editorActions.goToReferences(),
    'go:line': handleGoToLine,
    'go:symbol': () => editorActions.goToSymbol(),
    'go:file': handleQuickOpen,
    'go:next-editor': () => actions.activateNextTab(),
    'go:prev-editor': () => actions.activatePrevTab(),
    'go:back': () => editorActions.goBack(),
    'go:forward': () => editorActions.goForward(),

    // Git menu
    'git:clone': handleCloneDialog,
    'git:refresh': async () => {
      const { refreshStatus } = await import("../../stores/gitStore");
      await refreshStatus();
    },
    'git:open-source-control': () => actions.setSidebarActive("git"),

    // Extensions menu
    'extensions:marketplace': handleExtensionMarketplace,
    'extensions:manage': handleExtensionManager,

    // Terminal menu
    'terminal:new': () => terminalActions.createSession({ cwd: state().workspace?.path }),
    'terminal:kill': () => {
      const termState = getTerminalState();
      const split = termState.layout.splits.find(s => s.id === termState.layout.activeSplitId);
      const termId = split?.activeSessionId;
      if (termId) terminalActions.removeSession(termId);
    },
    'terminal:toggle': () => panelActions.togglePanel('terminal'),
    'terminal:toggle-search': () => terminalActions.toggleSearch(),
    'terminal:external': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_system_terminal', { cwd: state().workspace?.path });
    },

    // Window menu
    'window:new': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_open_new');
    },
    'window:toggle-fullscreen': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_toggle_fullscreen', { label: null });
    },
    'window:center': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_center', { label: null });
    },
    'window:reload': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_reload', { label: null });
    },

    // Help menu
    'help:commands': handleCommandPalette,
    'help:getting-started': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', {
        url: 'https://github.com/rainy-aether/rainy-aether#readme'
      });
    },
    'help:documentation': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', {
        url: 'https://github.com/rainy-aether/rainy-aether/wiki'
      });
    },
    'help:release-notes': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', {
        url: 'https://github.com/rainy-aether/rainy-aether/releases'
      });
    },
    'help:keyboard-shortcuts': handleKeyboardShortcuts,
    'help:report-issue': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', {
        url: 'https://github.com/rainy-aether/rainy-aether/issues/new'
      });
    },
    'help:github': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', {
        url: 'https://github.com/rainy-aether/rainy-aether'
      });
    },
    'help:website': async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', {
        url: 'https://rainyaether.com'
      });
    },
    'help:about': handleAbout,
  }), [
    actions, state, handleQuickOpen, handleCommandPalette, handleThemeSwitcher,
    handleGoToLine, handleExtensionMarketplace, handleExtensionManager,
    handleCloneDialog, handleKeyboardShortcuts, handleAbout
  ]);

  // Register native menu event listeners (only active on macOS)
  useNativeMenuEvents(nativeMenuHandlers);

  // Right-aligned controls (always visible)
  const RightControls = (
    <div className="ml-auto flex items-center pr-2 gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => actions.toggleSidebar()}
        title="Toggle Sidebar"
        className={cn("h-7 w-7 text-secondary p-1", snapshot.isSidebarOpen && "bg-muted text-foreground")}
      >
        <PanelLeft size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => panelActions.togglePanel('terminal')}
        title="Toggle Panel"
        className={cn("h-7 w-7 text-secondary p-1", panelState.isBottomPanelOpen && "bg-muted text-foreground")}
      >
        <PanelBottom size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => actions.toggleRightSidebar()}
        title="Toggle Agents View"
        className={cn("h-7 w-7 text-secondary p-1", snapshot.isRightSidebarOpen && "bg-muted text-foreground")}
      >
        <PanelRight size={16} />
      </Button>
    </div>
  );

  // On macOS with native menu: render only the mode switcher and panel controls
  if (useNative) {
    return (
      <div
        className="h-10 border-b border-border flex items-center px-1 bg-background select-none"
      >
        <WindowControls />

        {/* Mode Switcher */}
        <div className="flex items-center px-2">
          <ModeSwitcher />
        </div>

        <div className="flex-1 h-full" data-tauri-drag-region />

        {/* Right-aligned Layout Controls */}
        {RightControls}
      </div>
    );
  }

  // On Windows/Linux: render the full shadcn menu bar
  return (
    <div
      className="h-10 border-b border-border flex items-center w-full bg-background select-none"
    >
      <div className="flex items-center h-full">
        {/* Mode Switcher */}
        <div className="flex items-center px-2 h-full">
          <ModeSwitcher />
        </div>

        <Menubar className="h-full border-none rounded-none px-1 py-0 gap-1 shadow-none bg-transparent">

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-sm font-normal">File</MenubarTrigger>
            <MenubarContent align="start" className="min-w-56 py-1 text-sm">
              <MenubarItem onSelect={() => actions.openFolderDialog()}>
                Open Project…
                <MenubarShortcut>{cmdKey}+O</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={handleQuickOpen}>
                Quick Open…
                <MenubarShortcut>{cmdKey}+P</MenubarShortcut>
              </MenubarItem>
              {snapshot.recentWorkspaces.length > 0 && (
                <MenubarSub>
                  <MenubarSubTrigger>Open Recent</MenubarSubTrigger>
                  <MenubarSubContent className="min-w-52 py-1 text-sm">
                    {recentWorkspaces.map((workspace) => (
                      <MenubarItem
                        key={workspace.path}
                        disabled={snapshot.workspace?.path === workspace.path}
                        onSelect={() => {
                          const current = state();
                          if (current.workspace?.path === workspace.path) return;
                          actions.openRecentWorkspace(workspace);
                        }}
                      >
                        {workspace.name}
                        {snapshot.workspace?.path === workspace.path ? " (current)" : ""}
                      </MenubarItem>
                    ))}
                    <MenubarSeparator />
                    <MenubarItem
                      disabled={snapshot.recentWorkspaces.length === 0}
                      onSelect={() => actions.clearRecentWorkspaces()}
                    >
                      Clear Recently Opened
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
              )}
              <MenubarSeparator />
              <MenubarItem disabled={!hasWorkspace} onSelect={() => actions.closeProject()}>
                Close Project
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => actions.createNewFile()}>
                New Untitled File
                <MenubarShortcut>{cmdKey}+N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                disabled={!hasWorkspace}
                onSelect={async () => {
                  const base = state().workspace?.path;
                  if (!base) return;
                  const name = window.prompt("Enter file name (with extension)", "new-file.txt");
                  if (!name) return;
                  await actions.createFileAt(base, name);
                }}
              >
                New File…
              </MenubarItem>
              <MenubarItem
                disabled={!hasWorkspace}
                onSelect={async () => {
                  const base = state().workspace?.path;
                  if (!base) return;
                  const name = window.prompt("Enter folder name", "NewFolder");
                  if (!name) return;
                  await actions.createFolderAt(base, name);
                }}
              >
                New Folder…
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                disabled={!hasActiveFile}
                onSelect={() => {
                  const active = state().activeFileId;
                  if (active) actions.closeFile(active);
                }}
              >
                Close Editor
                <MenubarShortcut>{cmdKey}+W</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => actions.openSettings()}>
                Open Settings
                <MenubarShortcut>{cmdKey}+,</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                disabled={!hasActiveFile}
                onSelect={() => {
                  const active = state().activeFileId;
                  if (active) actions.saveFile(active);
                }}
              >
                Save
                <MenubarShortcut>{cmdKey}+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                disabled={!hasActiveFile}
                onSelect={() => {
                  const active = state().activeFileId;
                  if (active) actions.saveFileAs(active);
                }}
              >
                Save As…
                <MenubarShortcut>{cmdKey}+Shift+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => actions.saveAllFiles()}>
                Save All
                <MenubarShortcut>{cmdKey}+{optKey}+S</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled={!hasActiveFile} onSelect={() => actions.revealActiveFile()}>
                Reveal Active File in Explorer
              </MenubarItem>
              <MenubarItem disabled={!hasWorkspace} onSelect={() => actions.revealWorkspace()}>
                Open Workspace in Explorer
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                disabled={snapshot.openFiles.length === 0}
                onSelect={() => actions.closeAllEditors()}
              >
                Close All Editors
              </MenubarItem>
              <MenubarItem onSelect={() => actions.setAutoSave(!state().autoSave)}>
                Auto Save: {snapshot.autoSave ? "On" : "Off"}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Edit</MenubarTrigger>
            <MenubarContent align="start" className="min-w-48 py-1 text-sm">
              <MenubarItem onSelect={() => editorActions.undo()}>
                Undo
                <MenubarShortcut>{cmdKey}+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.redo()}>
                Redo
                <MenubarShortcut>{cmdKey}+Shift+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.cut()}>
                Cut
                <MenubarShortcut>{cmdKey}+X</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.copy()}>
                Copy
                <MenubarShortcut>{cmdKey}+C</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.paste()}>
                Paste
                <MenubarShortcut>{cmdKey}+V</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.selectAll()}>
                Select All
                <MenubarShortcut>{cmdKey}+A</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.copyLineUp()}>
                Copy Line Up
                <MenubarShortcut>{optKey}+Shift+↑</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.copyLineDown()}>
                Copy Line Down
                <MenubarShortcut>{optKey}+Shift+↓</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.moveLinesUp()}>
                Move Line Up
                <MenubarShortcut>{optKey}+↑</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.moveLinesDown()}>
                Move Line Down
                <MenubarShortcut>{optKey}+↓</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.openSearchPanel()}>
                Find…
                <MenubarShortcut>{cmdKey}+F</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.findNext()}>
                Find Next
                <MenubarShortcut>F3</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.findPrevious()}>
                Find Previous
                <MenubarShortcut>Shift+F3</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onSelect={() => {
                  editorActions.openSearchPanel();
                  editorActions.replaceAll();
                }}
              >
                Replace…
                <MenubarShortcut>{cmdKey}+H</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={handleGoToLine}>
                Go to Line/Column…
                <MenubarShortcut>{cmdKey}+G</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.indentMore()}>
                Indent Line
                <MenubarShortcut>Tab</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.indentLess()}>
                Outdent Line
                <MenubarShortcut>Shift+Tab</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.commentLine()}>
                Toggle Line Comment
                <MenubarShortcut>{cmdKey}+/</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.toggleBlockComment()}>
                Toggle Block Comment
                <MenubarShortcut>{cmdKey}+Shift+/</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.toggleWrap()}>
                Toggle Word Wrap
                <MenubarShortcut>{optKey}+Z</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">View</MenubarTrigger>
            <MenubarContent align="start" className="min-w-56 py-1 text-sm">
              <MenubarItem onSelect={handleCommandPalette}>
                Command Palette…
                <MenubarShortcut>{cmdKey}+Shift+P</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={handleQuickOpen}>
                Open View…
                <MenubarShortcut>{cmdKey}+Q</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Appearance</MenubarSubTrigger>
                <MenubarSubContent className="min-w-52 py-1 text-sm">
                  <MenubarItem onSelect={() => actions.toggleSidebar()}>
                    Toggle Sidebar
                    <MenubarShortcut>{cmdKey}+B</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem onSelect={() => actions.toggleZenMode()}>
                    Toggle Zen Mode {snapshot.isZenMode ? "(On)" : "(Off)"}
                    <MenubarShortcut>{cmdKey}+K Z</MenubarShortcut>
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem
                    onSelect={async () => {
                      const { invoke } = await import('@tauri-apps/api/core');
                      await invoke('window_toggle_fullscreen', { label: null });
                    }}
                  >
                    Toggle Full Screen
                    <MenubarShortcut>F11</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem onSelect={() => editorActions.toggleMinimap()}>
                    Toggle Minimap
                  </MenubarItem>
                  <MenubarItem onSelect={() => editorActions.toggleBreadcrumbs()}>
                    Toggle Breadcrumbs
                  </MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem onSelect={() => actions.setSidebarActive("explorer")}>
                Explorer
                <MenubarShortcut>{cmdKey}+Shift+E</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => actions.setSidebarActive("search")}>
                Search
                <MenubarShortcut>{cmdKey}+Shift+F</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => actions.setSidebarActive("git")}>
                Source Control
                <MenubarShortcut>{cmdKey}+Shift+G</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={handleExtensionMarketplace}>
                Extensions
                <MenubarShortcut>{cmdKey}+Shift+X</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => panelActions.togglePanel('terminal')}>
                Terminal
                <MenubarShortcut>{cmdKey}+`</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => panelActions.togglePanel('problems')}>
                Problems
                <MenubarShortcut>{cmdKey}+Shift+M</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => panelActions.togglePanel('output')}>
                Output
                <MenubarShortcut>{cmdKey}+Shift+U</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={handleThemeSwitcher}>
                Color Theme…
                <MenubarShortcut>{cmdKey}+K {cmdKey}+T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onSelect={async () => {
                  const mod = await import("../../stores/themeStore");
                  await mod.toggleDayNight();
                }}
              >
                Toggle Light/Dark Theme
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Selection</MenubarTrigger>
            <MenubarContent align="start" className="min-w-56 py-1 text-sm">
              <MenubarItem onSelect={() => editorActions.selectAll()}>
                Select All
                <MenubarShortcut>{cmdKey}+A</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.expandSelection()}>
                Expand Selection
                <MenubarShortcut>{optKey}+Shift+→</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.shrinkSelection()}>
                Shrink Selection
                <MenubarShortcut>{optKey}+Shift+←</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.copyLinesUp()}>
                Copy Line Up
                <MenubarShortcut>{optKey}+Shift+↑</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.copyLinesDown()}>
                Copy Line Down
                <MenubarShortcut>{optKey}+Shift+↓</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.moveLinesUp()}>
                Move Line Up
                <MenubarShortcut>{optKey}+↑</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.moveLinesDown()}>
                Move Line Down
                <MenubarShortcut>{optKey}+↓</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.addCursorAbove()}>
                Add Cursor Above
                <MenubarShortcut>{cmdKey}+{optKey}+↑</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.addCursorBelow()}>
                Add Cursor Below
                <MenubarShortcut>{cmdKey}+{optKey}+↓</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.addSelectionToNextFindMatch()}>
                Add Next Occurrence
                <MenubarShortcut>{cmdKey}+D</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.selectAllMatches()}>
                Select All Occurrences
                <MenubarShortcut>{cmdKey}+Shift+L</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.selectLine()}>
                Select Line
                <MenubarShortcut>{cmdKey}+L</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.deleteLines()}>
                Delete Line
                <MenubarShortcut>{cmdKey}+Shift+K</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Go</MenubarTrigger>
            <MenubarContent align="start" className="min-w-52 py-1 text-sm">
              <MenubarItem onSelect={() => editorActions.goToDefinition()}>
                Go to Definition
                <MenubarShortcut>F12</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.goToTypeDefinition()}>
                Go to Type Definition
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.goToReferences()}>
                Go to References
                <MenubarShortcut>Shift+F12</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={handleGoToLine}>
                Go to Line/Column…
                <MenubarShortcut>{cmdKey}+G</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.goToSymbol()}>
                Go to Symbol in Editor…
                <MenubarShortcut>{cmdKey}+Shift+O</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={handleQuickOpen}>
                Go to File…
                <MenubarShortcut>{cmdKey}+P</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => actions.activateNextTab()}>
                Next Editor
                <MenubarShortcut>{cmdKey}+Tab</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => actions.activatePrevTab()}>
                Previous Editor
                <MenubarShortcut>{cmdKey}+Shift+Tab</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => editorActions.goBack()}>
                Go Back
                <MenubarShortcut>{cmdKey}+{optKey}+←</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => editorActions.goForward()}>
                Go Forward
                <MenubarShortcut>{cmdKey}+{optKey}+→</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Git</MenubarTrigger>
            <MenubarContent align="start" className="min-w-48 py-1 text-sm">
              <MenubarItem onSelect={handleCloneDialog}>
                Clone Repository…
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled={!hasWorkspace} onSelect={async () => {
                const { refreshStatus } = await import("../../stores/gitStore");
                await refreshStatus();
              }}>
                Refresh Status
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled={!hasWorkspace} onSelect={() => actions.setSidebarActive("git")}>
                Open Source Control
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Extensions</MenubarTrigger>
            <MenubarContent align="start" className="min-w-48 py-1 text-sm">
              <MenubarItem onSelect={handleExtensionMarketplace}>
                Open Extension Marketplace…
                <MenubarShortcut>{cmdKey}+Shift+X</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={handleExtensionManager}>
                Manage Extensions…
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Terminal</MenubarTrigger>
            <MenubarContent align="start" className="min-w-52 py-1 text-sm">
              <MenubarItem onSelect={() => terminalActions.createSession({ cwd: state().workspace?.path })}>
                New Terminal
                <MenubarShortcut>{cmdKey}+Shift+`</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                disabled={!activeTerminalId}
                onSelect={() => {
                  if (activeTerminalId) terminalActions.removeSession(activeTerminalId);
                }}
              >
                Kill Terminal
                <MenubarShortcut>{cmdKey}+Shift+W</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => panelActions.togglePanel('terminal')}>
                Toggle Terminal Panel
                <MenubarShortcut>{cmdKey}+`</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => terminalActions.toggleSearch()}>
                Toggle Search in Terminal
                <MenubarShortcut>{cmdKey}+Shift+F</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                disabled={!hasWorkspace}
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_system_terminal', { cwd: state().workspace?.path });
                }}
              >
                Open External Terminal
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Window</MenubarTrigger>
            <MenubarContent align="start" className="min-w-52 py-1 text-sm">
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('window_open_new');
                }}
              >
                New Window
                <MenubarShortcut>{cmdKey}+Shift+N</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  const isMaximized = await invoke<boolean>('window_is_maximized', { label: null });
                  if (isMaximized) {
                    await invoke('window_unmaximize', { label: null });
                  } else {
                    await invoke('window_maximize', { label: null });
                  }
                }}
              >
                Maximize Window
              </MenubarItem>
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('window_minimize', { label: null });
                }}
              >
                Minimize Window
              </MenubarItem>
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('window_toggle_fullscreen', { label: null });
                }}
              >
                Toggle Full Screen
                <MenubarShortcut>F11</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('window_center', { label: null });
                }}
              >
                Center Window
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('window_reload', { label: null });
                }}
              >
                Reload Window
                <MenubarShortcut>{cmdKey}+R</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => window.close()}>
                Close Window
                <MenubarShortcut>{cmdKey}+W</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-7 px-3 text-xs font-normal">Help</MenubarTrigger>
            <MenubarContent align="start" className="min-w-56 py-1 text-sm">
              <MenubarItem onSelect={handleCommandPalette}>
                Show All Commands
                <MenubarShortcut>{cmdKey}+Shift+P</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_external_url', {
                    url: 'https://github.com/rainy-aether/rainy-aether#readme'
                  });
                }}
              >
                Getting Started
              </MenubarItem>
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_external_url', {
                    url: 'https://github.com/rainy-aether/rainy-aether/wiki'
                  });
                }}
              >
                Documentation
              </MenubarItem>
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_external_url', {
                    url: 'https://github.com/rainy-aether/rainy-aether/releases'
                  });
                }}
              >
                Release Notes
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={handleKeyboardShortcuts}>
                Keyboard Shortcuts Reference
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_external_url', {
                    url: 'https://github.com/rainy-aether/rainy-aether/issues/new'
                  });
                }}
              >
                Report Issue
              </MenubarItem>
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_external_url', {
                    url: 'https://github.com/rainy-aether/rainy-aether'
                  });
                }}
              >
                View on GitHub
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_external_url', {
                    url: 'https://rainyaether.com'
                  });
                }}
              >
                Visit Our Website
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={handleAbout}>
                About Rainy Aether
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

        </Menubar>
      </div>

      <div className="flex-1 h-full" data-tauri-drag-region />

      <div className="flex items-center h-full gap-2 pr-2">
        {RightControls}
        <WindowControls />
      </div>
    </div>
  );
};

export default MenuBar;
