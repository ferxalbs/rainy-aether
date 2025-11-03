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
}

const MenuBar: React.FC<MenuBarProps> = ({
  onOpenQuickOpen,
  onOpenCommandPalette,
  onOpenThemeSwitcher,
  onOpenGoToLine,
  onOpenExtensionMarketplace,
  onOpenExtensionManager,
  onOpenCloneDialog,
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

  const hasActiveFile = Boolean(snapshot.activeFileId);
  const hasWorkspace = Boolean(snapshot.workspace);

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
            <MenubarShortcut>Ctrl+O</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handleQuickOpen}>
            Quick Open…
            <MenubarShortcut>Ctrl+P</MenubarShortcut>
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
            <MenubarShortcut>Ctrl+N</MenubarShortcut>
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
            <MenubarShortcut>Ctrl+W</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.openSettings()}>
            Open Settings
            <MenubarShortcut>Ctrl+,</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            disabled={!hasActiveFile}
            onSelect={() => {
              const active = state().activeFileId;
              if (active) actions.saveFile(active);
            }}
          >
            Save
            <MenubarShortcut>Ctrl+S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            disabled={!hasActiveFile}
            onSelect={() => {
              const active = state().activeFileId;
              if (active) actions.saveFileAs(active);
            }}
          >
            Save As…
            <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.saveAllFiles()}>
            Save All
            <MenubarShortcut>Ctrl+Alt+S</MenubarShortcut>
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
            <MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => editorActions.redo()}>
            Redo
            <MenubarShortcut>Ctrl+Shift+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => editorActions.selectAll()}>
            Select All
            <MenubarShortcut>Ctrl+A</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => editorActions.openSearchPanel()}>
            Find…
            <MenubarShortcut>Ctrl+F</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => editorActions.findNext()}>
            Find Next
            <MenubarShortcut>F3</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handleGoToLine}>
            Go to Line…
            <MenubarShortcut>Ctrl+G</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            onSelect={() => {
              editorActions.openSearchPanel();
              editorActions.replaceAll();
            }}
          >
            Replace All…
            <MenubarShortcut>Ctrl+Shift+H</MenubarShortcut>
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
          <MenubarSeparator />
          <MenubarItem onSelect={() => editorActions.toggleWrap()}>
            Toggle Word Wrap
            <MenubarShortcut>Alt+Z</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="h-7 px-3 text-xs font-normal">View</MenubarTrigger>
        <MenubarContent align="start" className="min-w-56 py-1 text-sm">
          <MenubarItem onSelect={() => actions.toggleSidebar()}>
            Toggle Sidebar
            <MenubarShortcut>Ctrl+B</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => terminalActions.toggle()}>
            Toggle Terminal
            <MenubarShortcut>Ctrl+`</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.toggleZenMode()}>
            Toggle Zen Mode {snapshot.isZenMode ? "(On)" : "(Off)"}
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={handleThemeSwitcher}>Theme: Open Switcher…</MenubarItem>
          <MenubarItem
            onSelect={async () => {
              const mod = await import("../../stores/themeStore");
              await mod.toggleDayNight();
            }}
          >
            Theme: Toggle Day/Night
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => terminalActions.createSession({ cwd: state().workspace?.path })}>
            New Terminal
          </MenubarItem>
          <MenubarItem
            disabled={!activeTerminalId}
            onSelect={() => {
              if (activeTerminalId) terminalActions.removeSession(activeTerminalId);
            }}
          >
            Kill Active Terminal
          </MenubarItem>
          <MenubarItem onSelect={() => {
            // Open in external Windows Terminal - using direct invoke
            const { invoke } = require('@tauri-apps/api/core');
            invoke('open_windows_terminal', { cwd: state().workspace?.path }).catch(console.error);
          }}>
            Open Windows Terminal
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="h-7 px-3 text-xs font-normal">Go</MenubarTrigger>
        <MenubarContent align="start" className="min-w-48 py-1 text-sm">
          <MenubarItem onSelect={handleQuickOpen}>
            Quick Open…
            <MenubarShortcut>Ctrl+P</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handleCommandPalette}>
            Command Palette…
            <MenubarShortcut>Ctrl+Shift+P</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.activateNextTab()}>
            Next Tab
            <MenubarShortcut>Ctrl+Tab</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => actions.activatePrevTab()}>
            Previous Tab
            <MenubarShortcut>Ctrl+Shift+Tab</MenubarShortcut>
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
            <MenubarShortcut>Ctrl+Shift+X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handleExtensionManager}>
            Manage Extensions…
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
};

export default MenuBar;
