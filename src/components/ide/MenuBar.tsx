import React from "react";
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
import ModeSwitcher from "./ModeSwitcher";

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

  return (
    <Menubar className="h-10 border-b border-border border-x-0 border-t-0 rounded-none px-1 py-0 gap-1 shadow-none bg-background">
      {/* Mode Switcher */}
      <div className="flex items-center px-2">
        <ModeSwitcher />
      </div>

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
          <MenubarItem onSelect={() => terminalActions.toggle()}>
            Terminal
            <MenubarShortcut>{cmdKey}+`</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.toggleProblems()}>
            Problems
            <MenubarShortcut>{cmdKey}+Shift+M</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.toggleOutput()}>
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
          <MenubarItem onSelect={() => terminalActions.toggle()}>
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
              await invoke('window_open_new', { workspacePath: null });
            }}
          >
            New Window
            <MenubarShortcut>{cmdKey}+Shift+N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            disabled={!hasWorkspace}
            onSelect={async () => {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('window_open_new', { workspacePath: state().workspace?.path });
            }}
          >
            Duplicate Workspace in New Window
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
  );
};

export default MenuBar;
