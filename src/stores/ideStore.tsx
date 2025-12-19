import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { loadFromStore, saveToStore } from "./app-store";
import { invoke } from "@tauri-apps/api/core";
import { open, message, save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

type UnlistenFn = () => void;
type TimeoutHandle = ReturnType<typeof setTimeout>;

// Robust Tauri environment detection (align with terminalStore and TerminalPanel)
const isTauriEnv = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const w = window as unknown as Record<string, unknown>;
    const byGlobal = Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__ || w.__TAURI_METADATA__);
    const byEnv = Boolean((import.meta as any)?.env?.TAURI_PLATFORM || (import.meta as any)?.env?.TAURI);
    const byUA = typeof navigator !== "undefined" && /\bTauri\b/i.test(navigator.userAgent || "");
    return byGlobal || byEnv || byUA;
  } catch {
    return false;
  }
};

type IDEView = "startup" | "editor" | "settings";

export interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
  size?: number;
  modified?: number;
  children_loaded?: boolean; // Indicates if children have been loaded from backend
}

export interface OpenFile {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirty: boolean;
  isPinned?: boolean;
}

export interface Workspace {
  name: string;
  path: string;
  type: "folder" | "file";
}

export type SidebarTab = "explorer" | "search" | "git" | `webview:${string}`;
export type ViewMode = "ide" | "agents";

export interface IDEState {
  currentView: IDEView;
  viewMode: ViewMode;
  openFiles: OpenFile[];
  activeFileId: string | null;
  workspace: Workspace | null;
  recentWorkspaces: Workspace[];
  projectTree: FileNode | null;
  isSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  autoSave: boolean;
  isZenMode: boolean;
  sidebarActive: SidebarTab;
}

const initialState: IDEState = {
  currentView: "startup",
  viewMode: "ide",
  openFiles: [],
  activeFileId: null,
  workspace: null,
  recentWorkspaces: [],
  projectTree: null,
  isSidebarOpen: true,
  isRightSidebarOpen: true,
  autoSave: false,
  isZenMode: false,
  sidebarActive: "explorer",
};

let currentState: IDEState = initialState;
let cachedSnapshot: IDEState = { ...initialState };

type IDEStateListener = () => void;
const listeners = new Set<IDEStateListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("IDE state listener error:", error);
    }
  });
};

const setState = (updater: (prev: IDEState) => IDEState) => {
  const next = updater(currentState);
  currentState = next;
  cachedSnapshot = next;
  notifyListeners();
  return next;
};

const getState = () => cachedSnapshot;

const subscribe = (listener: IDEStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Export getState for non-React contexts (e.g., agent initialization)
export const getIDEState = getState;

// Hook to subscribe to IDE state changes
export const useIDEState = () => useSyncExternalStore(subscribe, getState, getState);

const autoSaveTimers = new Map<string, TimeoutHandle>();
let isLoadingWorkspace = false; // Prevent concurrent workspace loads

const normalizePath = (path: string) => path.replace(/\\/g, "/");

const pathsEqual = (a: string, b: string) => normalizePath(a) === normalizePath(b);

// Helper to handle saveToStore with proper error handling
const safeSaveToStore = async <T,>(key: string, value: T): Promise<void> => {
  try {
    await saveToStore(key, value);
  } catch (error) {
    console.error(`[IDE Store] Failed to save ${key}:`, error);
    // Non-fatal - continue execution but log the error
  }
};

const isGitInternalPath = (path: string, workspacePath: string) => {
  const normalizedPath = normalizePath(path);
  const normalizedWorkspace = normalizePath(workspacePath);
  const gitRoot = `${normalizedWorkspace}/.git`;
  return normalizedPath === gitRoot || normalizedPath.startsWith(`${gitRoot}/`);
};

const ensureWorkspaceInRecents = (workspace: Workspace, recents: Workspace[]): Workspace[] => {
  return [workspace, ...recents.filter((w) => w.path !== workspace.path)];
};

const refreshWorkspaceContents = async (workspace: Workspace) => {
  try {
    const structure = await invoke<FileNode>("load_project_structure", { path: workspace.path });
    const latestWorkspace = getState().workspace;
    if (!latestWorkspace || !pathsEqual(latestWorkspace.path, workspace.path)) {
      return;
    }
    setProjectTree(structure);
  } catch (error) {
    console.error("Failed to refresh workspace structure:", error);
  }

  try {
    const { refreshStatus } = await import("./gitStore");
    await refreshStatus();
  } catch (error) {
    console.warn("Failed to refresh git status after change", error);
  }
};

const setCurrentView = (view: IDEView) => {
  setState((prev) => ({ ...prev, currentView: view }));
  safeSaveToStore("rainy-coder-current-view", view);
};

const setViewMode = (mode: ViewMode) => {
  setState((prev) => ({ ...prev, viewMode: mode }));
  safeSaveToStore("rainy-coder-view-mode", mode);
};

const createFileAt = async (dirPath: string, name: string) => {
  const workspace = getState().workspace;
  if (!workspace) return;
  const separator = dirPath.includes("\\") ? "\\" : "/";
  const newPath = dirPath.endsWith(separator) ? `${dirPath}${name}` : `${dirPath}${separator}${name}`;
  try {
    await invoke("create_file", { path: newPath });
    const newFileNode: FileNode = {
      name,
      path: newPath,
      is_directory: false,
      children: [],
      size: 0,
      modified: Date.now() / 1000,
    };

    setState((prev) => {
      const updateTree = (node: FileNode): FileNode => {
        if (node.path === dirPath) {
          return {
            ...node,
            children: [...(node.children || []), newFileNode],
          };
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map(updateTree),
          };
        }
        return node;
      };

      return {
        ...prev,
        projectTree: prev.projectTree ? updateTree(prev.projectTree) : prev.projectTree,
      };
    });

    await openFile(newFileNode);
  } catch (error) {
    console.error("Failed to create file:", error);
    await message(`Failed to create file: ${error}`, { title: "Error" });
    await openWorkspace(workspace, false);
  }
};

const createFolderAt = async (dirPath: string, name: string) => {
  const workspace = getState().workspace;
  if (!workspace) return;
  const separator = dirPath.includes("\\") ? "\\" : "/";
  const newPath = dirPath.endsWith(separator) ? `${dirPath}${name}` : `${dirPath}${separator}${name}`;
  try {
    await invoke("create_folder", { path: newPath });
    const newFolderNode: FileNode = {
      name,
      path: newPath,
      is_directory: true,
      children: [],
      size: 0,
      modified: Date.now() / 1000,
    };

    setState((prev) => {
      const updateTree = (node: FileNode): FileNode => {
        if (node.path === dirPath) {
          return {
            ...node,
            children: [...(node.children || []), newFolderNode],
          };
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map(updateTree),
          };
        }
        return node;
      };

      return {
        ...prev,
        projectTree: prev.projectTree ? updateTree(prev.projectTree) : prev.projectTree,
      };
    });
  } catch (error) {
    console.error("Failed to create folder:", error);
    await message(`Failed to create folder: ${error}`, { title: "Error" });
    await openWorkspace(workspace, false);
  }
};

const renameNode = async (node: FileNode, newName: string) => {
  const oldPath = node.path;
  const separator = oldPath.includes("\\") ? "\\" : "/";
  const basePath = oldPath.includes(separator)
    ? oldPath.substring(0, oldPath.lastIndexOf(separator))
    : "";
  const newPath = basePath ? `${basePath}${separator}${newName}` : newName;

  try {
    await invoke("rename_path", { oldPath, newPath });

    setState((prev) => {
      const updateTree = (current: FileNode): FileNode => {
        if (current.path === oldPath) {
          return { ...current, name: newName, path: newPath };
        }
        if (current.children) {
          return {
            ...current,
            children: current.children.map(updateTree),
          };
        }
        return current;
      };

      const updatedOpenFiles = prev.openFiles.map((file) =>
        file.path === oldPath ? { ...file, id: newPath, path: newPath, name: newName } : file,
      );

      const updatedActive = prev.activeFileId === oldPath ? newPath : prev.activeFileId;

      return {
        ...prev,
        projectTree: prev.projectTree ? updateTree(prev.projectTree) : prev.projectTree,
        openFiles: updatedOpenFiles,
        activeFileId: updatedActive,
      };
    });
  } catch (error) {
    console.error("Failed to rename:", error);
    await message(`Failed to rename: ${error}`, { title: "Error" });
    const workspace = getState().workspace;
    if (workspace) {
      await openWorkspace(workspace, false);
    }
  }
};

const deleteNode = async (node: FileNode) => {
  try {
    await invoke("delete_path", { path: node.path });

    setState((prev) => {
      const removeFromTree = (current: FileNode): FileNode | null => {
        if (current.path === node.path) {
          return null;
        }
        if (current.children) {
          const filteredChildren = current.children
            .map(removeFromTree)
            .filter((child): child is FileNode => child !== null);
          return { ...current, children: filteredChildren };
        }
        return current;
      };

      const filesToClose = prev.openFiles.filter(
        (file) => file.path === node.path || (node.is_directory && file.path.startsWith(node.path)),
      );

      const remainingFiles = prev.openFiles.filter((file) => !filesToClose.includes(file));

      const activeFileId = filesToClose.some((file) => file.id === prev.activeFileId)
        ? remainingFiles[0]?.id ?? null
        : prev.activeFileId;

      return {
        ...prev,
        projectTree: prev.projectTree ? removeFromTree(prev.projectTree) ?? null : prev.projectTree,
        openFiles: remainingFiles,
        activeFileId,
      };
    });
  } catch (error) {
    console.error("Failed to delete:", error);
    await message(`Failed to delete: ${error}`, { title: "Error" });
    const workspace = getState().workspace;
    if (workspace) {
      await openWorkspace(workspace, false);
    }
  }
};

const setProjectTree = (tree: FileNode | null) => {
  setState((prev) => ({ ...prev, projectTree: tree }));
};

const toggleSidebar = () => {
  setState((prev) => {
    const next = !prev.isSidebarOpen;
    safeSaveToStore("rainy-coder-sidebar-open", next);

    // Trigger Monaco editor layout after sidebar toggle
    setTimeout(() => {
      try {
        const { editorActions } = require("./editorStore");
        editorActions.layout();
      } catch (error) {
        // Ignore if editor store is not available
      }
    }, 100);

    return { ...prev, isSidebarOpen: next };
  });
};

const toggleRightSidebar = () => {
  setState((prev) => {
    const next = !prev.isRightSidebarOpen;
    safeSaveToStore("rainy-coder-right-sidebar-open", next);

    // Trigger Monaco editor layout after sidebar toggle
    setTimeout(() => {
      try {
        const { editorActions } = require("./editorStore");
        editorActions.layout();
      } catch (error) {
        // Ignore if editor store is not available
      }
    }, 100);

    return { ...prev, isRightSidebarOpen: next };
  });
};

const setSidebarOpen = (open: boolean) => {
  setState((prev) => {
    safeSaveToStore("rainy-coder-sidebar-open", open);
    return { ...prev, isSidebarOpen: open };
  });
};

const setSidebarActive = (tab: SidebarTab) => {
  setState((prev) => {
    // If clicking the same tab and sidebar is open, collapse it
    if (prev.sidebarActive === tab && prev.isSidebarOpen) {
      safeSaveToStore("rainy-coder-sidebar-open", false);
      return { ...prev, isSidebarOpen: false };
    }
    // If clicking a different tab or sidebar is collapsed, expand and switch
    safeSaveToStore("rainy-coder-sidebar-active", tab);
    safeSaveToStore("rainy-coder-sidebar-open", true);
    return { ...prev, sidebarActive: tab, isSidebarOpen: true };
  });
};

const setAutoSave = (enabled: boolean) => {
  setState((prev) => ({ ...prev, autoSave: enabled }));
  safeSaveToStore("rainy-coder-auto-save", enabled);
};

const toggleZenMode = () => {
  setState((prev) => {
    const next = !prev.isZenMode;
    safeSaveToStore("rainy-coder-zen-mode", next);

    // Trigger Monaco editor layout after zen mode toggle
    setTimeout(() => {
      try {
        const { editorActions } = require("./editorStore");
        editorActions.layout();
      } catch (error) {
        // Ignore if editor store is not available
      }
    }, 100);

    return { ...prev, isZenMode: next };
  });
};

const closeAllEditors = () => {
  setState((prev) => ({
    ...prev,
    openFiles: [],
    activeFileId: null,
    currentView: prev.workspace ? "editor" : "startup",
  }));
};

const revealActiveFile = async () => {
  const activeId = getState().activeFileId;
  const file = getState().openFiles.find((openFile) => openFile.id === activeId);
  if (!file || !file.path) {
    await message("No hay archivo activo para revelar.", { title: "Reveal In Explorer" });
    return;
  }
  if (!isTauriEnv()) {
    await message("Reveal in Explorer solo está disponible en la app de escritorio.", {
      title: "Reveal In Explorer",
    });
    return;
  }
  try {
    await invoke("open_in_directory", { path: file.path });
  } catch (error) {
    console.error(error);
    await message(`No se pudo revelar el archivo: ${error}`, { title: "Reveal In Explorer" });
  }
};

const revealWorkspace = async () => {
  const workspace = getState().workspace;
  if (!workspace) {
    await message("No hay workspace para abrir en Explorer.", { title: "Reveal In Explorer" });
    return;
  }
  if (!isTauriEnv()) {
    await message("Reveal in Explorer solo está disponible en la app de escritorio.", {
      title: "Reveal In Explorer",
    });
    return;
  }
  try {
    await invoke("open_in_directory", { path: workspace.path });
  } catch (error) {
    console.error(error);
    await message(`No se pudo abrir el workspace en Explorer: ${error}`, {
      title: "Reveal In Explorer",
    });
  }
};

const createNewFile = () => {
  const newFile: OpenFile = {
    id: `file-${Date.now()}`,
    name: "Untitled-1",
    path: "",
    content: "",
    isDirty: false,
  };

  setState((prev) => ({
    ...prev,
    currentView: "editor",
    openFiles: [...prev.openFiles, newFile],
    activeFileId: newFile.id,
  }));
};

const openFile = async (fileNode: FileNode) => {
  const existingFile = getState().openFiles.find((file) => file.path === fileNode.path);
  if (existingFile) {
    setState((prev) => ({ ...prev, activeFileId: existingFile.id }));
    return;
  }

  try {
    const content = await invoke<string>("get_file_content", { path: fileNode.path });
    const newFile: OpenFile = {
      id: fileNode.path,
      name: fileNode.name,
      path: fileNode.path,
      content,
      isDirty: false,
    };

    setState((prev) => ({
      ...prev,
      currentView: "editor",
      openFiles: [...prev.openFiles, newFile],
      activeFileId: newFile.id,
    }));
  } catch (error) {
    console.error("Failed to read file content:", error);
  }
};

const openFolderDialog = async () => {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Project",
  });

  if (typeof selected === "string") {
    const folderName = selected.replace(/\\/g, "/").split("/").pop() || "Unknown";
    const workspace: Workspace = {
      name: folderName,
      path: selected,
      type: "folder",
    };
    await openWorkspace(workspace, true);
  }
};

const openWorkspace = async (workspace: Workspace, saveToRecents: boolean = true) => {
  // Prevent concurrent workspace loads
  if (isLoadingWorkspace) {
    console.warn("Workspace load already in progress, ignoring duplicate request");
    return;
  }

  isLoadingWorkspace = true;

  try {
    // Import loading actions and start workspace loading context
    const { loadingActions } = await import("./loadingStore");
    loadingActions.startWorkspaceLoading();

    // Stage 1: Workspace provisioning
    loadingActions.startStage('workspace');
    const structure = await invoke<FileNode>("load_project_structure", { path: workspace.path });
    setProjectTree(structure);

    await invoke("watch_project_changes", { path: workspace.path });
    loadingActions.completeStage('workspace');

    // Stage 2: Monaco initialization
    loadingActions.startStage('monaco');
    try {
      if (isTauriEnv()) {
        const { terminalActions, getTerminalState } = await import("./terminalStore");
        const { getTerminalService } = await import("@/services/terminalService");

        const terminalState = getTerminalState();
        const activeSplit = terminalState.layout.splits.find(s => s.id === terminalState.layout.activeSplitId);
        const activeSessionId = activeSplit?.activeSessionId;

        if (activeSessionId) {
          // Change directory in existing terminal
          const service = getTerminalService();
          await service.changeDirectory(activeSessionId, workspace.path);
        } else {
          // Create new terminal in workspace directory
          await terminalActions.createSession({ cwd: workspace.path });
        }
      }
    } catch (error) {
      console.warn("Failed to align terminal to workspace", error);
    }

    setState((prev) => {
      const recentWorkspaces = saveToRecents
        ? ensureWorkspaceInRecents(workspace, prev.recentWorkspaces)
        : prev.recentWorkspaces;

      if (saveToRecents) {
        safeSaveToStore("rainy-coder-recent-workspaces", recentWorkspaces);
      }

      return {
        ...prev,
        currentView: "editor",
        workspace,
        recentWorkspaces,
      };
    });

    safeSaveToStore("rainy-coder-current-view", "editor");

    try {
      const { setWorkspacePath, refreshHistory, refreshStatus, refreshRepoDetection, refreshBranches, refreshStashes } = await import("./gitStore");
      setWorkspacePath(workspace.path);
      refreshRepoDetection();
      await Promise.all([
        refreshHistory(100),
        refreshStatus(),
        refreshBranches(),
        refreshStashes()
      ]);
    } catch (error) {
      console.warn("Failed to initialize git state", error);
    }

    // Reinitialize configuration system with workspace path
    try {
      console.log('[IDE] Reinitializing configuration system with workspace:', workspace.path);
      const { configurationActions } = await import("./configurationStore");
      await configurationActions.initialize(workspace.path);
      console.log('[IDE] Configuration system reinitialized with workspace successfully');
    } catch (error) {
      console.warn("Failed to reinitialize configuration system with workspace:", error);
      // Non-fatal error - continue
    }

    // Configure Monaco with workspace-specific settings (tsconfig.json, package.json)
    try {
      console.log('[IDE] Configuring Monaco with workspace settings');
      const { configureMonacoForWorkspace } = await import("@/services/monacoConfig");
      await configureMonacoForWorkspace(workspace.path);
      console.log('[IDE] Monaco configured with workspace settings successfully');
    } catch (error) {
      console.warn("Failed to configure Monaco with workspace settings:", error);
      // Non-fatal error - continue
    }

    // Small delay to ensure Monaco is ready
    await new Promise(resolve => setTimeout(resolve, 200));
    loadingActions.completeStage('monaco');

    // Mark workspace loading as finished
    loadingActions.finishLoading();
  } catch (error) {
    console.error("Failed to open workspace:", error);
    await message(`Failed to open workspace: ${error}`, { title: "Workspace Error" });
    // Ensure we stay on startup view if workspace fails to open
    setState((prev) => ({ ...prev, currentView: "startup", workspace: null }));

    // Mark loading as finished even on error
    const { loadingActions } = await import("./loadingStore");
    loadingActions.errorStage('workspace', 'Failed to open workspace');
    loadingActions.finishLoading();
  } finally {
    // Always reset the loading flag
    isLoadingWorkspace = false;
  }
};

const openRecentWorkspace = async (workspace: Workspace) => {
  const activeWorkspace = getState().workspace;
  if (activeWorkspace?.path === workspace.path) {
    return;
  }
  await openWorkspace(workspace, true);
};

const clearRecentWorkspaces = () => {
  safeSaveToStore("rainy-coder-recent-workspaces", []);
  setState((prev) => ({ ...prev, recentWorkspaces: [] }));
};

const cloneRepository = () => {
  console.log("Clone repository functionality will be implemented");
};

const openTerminal = async () => {
  setState((prev) => ({ ...prev, currentView: "editor" }));
  safeSaveToStore("rainy-coder-current-view", "editor");
  const { terminalActions } = await import("./terminalStore");
  await terminalActions.createSession({ cwd: getState().workspace?.path });
};

const openSettings = () => {
  setState((prev) => ({ ...prev, currentView: "settings" }));
  safeSaveToStore("rainy-coder-current-view", "settings");
};

const closeSettings = () => {
  const hasWorkspace = Boolean(getState().workspace);
  setState((prev) => ({ ...prev, currentView: hasWorkspace ? "editor" : "startup" }));
  safeSaveToStore("rainy-coder-current-view", hasWorkspace ? "editor" : "startup");
};

const closeFile = (fileId: string) => {
  // Clean up auto-save timer to prevent memory leak
  const timer = autoSaveTimers.get(fileId);
  if (timer) {
    clearTimeout(timer);
    autoSaveTimers.delete(fileId);
  }

  setState((prev) => {
    const openFiles = prev.openFiles.filter((file) => file.id !== fileId);
    const activeFileId = prev.activeFileId === fileId ? openFiles[0]?.id ?? null : prev.activeFileId;
    const currentView = openFiles.length === 0 && !prev.workspace ? "startup" : "editor";
    safeSaveToStore("rainy-coder-current-view", currentView);
    return {
      ...prev,
      openFiles,
      activeFileId,
      currentView,
    };
  });
};

const pinFile = (fileId: string) => {
  setState((prev) => {
    const fileIndex = prev.openFiles.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) return prev;

    const file = prev.openFiles[fileIndex];
    const updatedFile = { ...file, isPinned: true };

    // Remove file from current position and add to beginning (after other pinned files)
    const otherFiles = prev.openFiles.filter((f) => f.id !== fileId);
    const pinnedFiles = otherFiles.filter((f) => f.isPinned);
    const unpinnedFiles = otherFiles.filter((f) => !f.isPinned);

    return {
      ...prev,
      openFiles: [...pinnedFiles, updatedFile, ...unpinnedFiles],
    };
  });
};

const unpinFile = (fileId: string) => {
  setState((prev) => {
    const fileIndex = prev.openFiles.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) return prev;

    const file = prev.openFiles[fileIndex];
    const updatedFile = { ...file, isPinned: false };

    // Move to after all pinned files
    const otherFiles = prev.openFiles.filter((f) => f.id !== fileId);
    const pinnedFiles = otherFiles.filter((f) => f.isPinned);
    const unpinnedFiles = otherFiles.filter((f) => !f.isPinned);

    return {
      ...prev,
      openFiles: [...pinnedFiles, updatedFile, ...unpinnedFiles],
    };
  });
};

const togglePinFile = (fileId: string) => {
  const file = getState().openFiles.find((f) => f.id === fileId);
  if (!file) return;

  if (file.isPinned) {
    unpinFile(fileId);
  } else {
    pinFile(fileId);
  }
};

const closeUnpinnedFiles = () => {
  setState((prev) => {
    const pinnedFiles = prev.openFiles.filter((file) => file.isPinned);
    const activeFileId = pinnedFiles.some((file) => file.id === prev.activeFileId)
      ? prev.activeFileId
      : pinnedFiles[0]?.id ?? null;

    return {
      ...prev,
      openFiles: pinnedFiles,
      activeFileId,
    };
  });
};

const closeOtherFiles = (keepFileId: string) => {
  setState((prev) => {
    const fileToKeep = prev.openFiles.find((file) => file.id === keepFileId);
    const pinnedFiles = prev.openFiles.filter((file) => file.isPinned && file.id !== keepFileId);

    const openFiles = fileToKeep
      ? [...pinnedFiles, fileToKeep]
      : pinnedFiles;

    return {
      ...prev,
      openFiles,
      activeFileId: keepFileId,
    };
  });
};

const closeFilesToTheRight = (fileId: string) => {
  setState((prev) => {
    const fileIndex = prev.openFiles.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) return prev;

    // Keep files up to and including the target file, plus any pinned files after
    const filesToKeep = prev.openFiles.filter((file, index) => {
      if (index <= fileIndex) return true;
      return file.isPinned;
    });

    const activeFileId = filesToKeep.some((file) => file.id === prev.activeFileId)
      ? prev.activeFileId
      : filesToKeep[filesToKeep.length - 1]?.id ?? null;

    return {
      ...prev,
      openFiles: filesToKeep,
      activeFileId,
    };
  });
};

const setActiveFile = (fileId: string) => {
  setState((prev) => ({ ...prev, activeFileId: fileId }));

  // Trigger Monaco editor layout and focus when switching tabs
  setTimeout(() => {
    try {
      const { editorActions } = require("./editorStore");
      editorActions.layout();
    } catch (error) {
      // Ignore if editor store is not available
    }
  }, 50);
};

const activateNextTab = () => {
  const files = getState().openFiles;
  if (files.length === 0) return;
  const activeId = getState().activeFileId;
  const activeIndex = files.findIndex((file) => file.id === activeId);
  const nextIndex = activeIndex >= 0 ? (activeIndex + 1) % files.length : 0;
  setActiveFile(files[nextIndex].id);
};

const activatePrevTab = () => {
  const files = getState().openFiles;
  if (files.length === 0) return;
  const activeId = getState().activeFileId;
  const activeIndex = files.findIndex((file) => file.id === activeId);
  const prevIndex = activeIndex >= 0 ? (activeIndex - 1 + files.length) % files.length : files.length - 1;
  setActiveFile(files[prevIndex].id);
};

const updateFileContent = (fileId: string, content: string) => {
  setState((prev) => ({
    ...prev,
    openFiles: prev.openFiles.map((file) =>
      file.id === fileId ? { ...file, content, isDirty: true } : file,
    ),
  }));

  if (getState().autoSave) {
    const existing = autoSaveTimers.get(fileId);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      const file = getState().openFiles.find((openFile) => openFile.id === fileId);
      if (file?.path) {
        void saveFile(fileId);
      }
    }, 800);
    autoSaveTimers.set(fileId, timeout);
  }
};

const saveFile = async (fileId: string) => {
  const file = getState().openFiles.find((openFile) => openFile.id === fileId);
  if (!file) return;

  try {
    // Check if Format on Save is enabled
    const { getSettingsState } = await import("./settingsStore");
    const { editorActions } = await import("./editorStore");
    const settings = getSettingsState();

    if (settings.editor.formatOnSave && file.path) {
      // Format the document before saving
      try {
        editorActions.formatDocument();
        // Wait a bit for formatting to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get updated content after formatting
        const editor = editorActions.getCurrentEditor();
        if (editor) {
          const formattedContent = editor.getValue();
          // Update the file content with formatted version
          setState((prev) => ({
            ...prev,
            openFiles: prev.openFiles.map((openFile) =>
              openFile.id === fileId ? { ...openFile, content: formattedContent } : openFile,
            ),
          }));
          // Use formatted content for saving
          await invoke("save_file_content", { path: file.path, content: formattedContent });
        } else {
          await invoke("save_file_content", { path: file.path, content: file.content });
        }
      } catch (formatError) {
        console.warn("Format on save failed, saving without formatting:", formatError);
        await invoke("save_file_content", { path: file.path, content: file.content });
      }
    } else {
      await invoke("save_file_content", { path: file.path, content: file.content });
    }

    setState((prev) => ({
      ...prev,
      openFiles: prev.openFiles.map((openFile) =>
        openFile.id === fileId ? { ...openFile, isDirty: false } : openFile,
      ),
    }));
  } catch (error) {
    console.error("Failed to save file:", error);
    await message(`Failed to save file: ${error}`, { title: "Save Error" });
  }
};

const saveFileAs = async (fileId: string) => {
  const file = getState().openFiles.find((openFile) => openFile.id === fileId);
  if (!file) return;
  const defaultName = file.name || "Untitled-1";
  const workspacePath = getState().workspace?.path;

  try {
    const selected = await save({
      title: "Save As...",
      defaultPath: workspacePath ? `${workspacePath}/${defaultName}` : defaultName,
    });
    if (typeof selected !== "string" || !selected) return;

    await invoke("save_file_content", { path: selected, content: file.content });
    const name = selected.replace(/\\/g, "/").split("/").pop() || defaultName;

    setState((prev) => ({
      ...prev,
      openFiles: prev.openFiles.map((openFile) =>
        openFile.id === fileId
          ? { ...openFile, id: selected, path: selected, name, isDirty: false }
          : openFile,
      ),
      activeFileId: prev.activeFileId === fileId ? selected : prev.activeFileId,
    }));

    const currentWorkspace = getState().workspace;
    if (currentWorkspace) {
      await refreshWorkspaceContents(currentWorkspace);
    }
  } catch (error) {
    console.error("Failed to save as:", error);
    await message(`Failed to Save As: ${error}`, { title: "Save As Error" });
  }
};

const saveAllFiles = async () => {
  const dirtyFiles = getState().openFiles.filter((file) => file.isDirty);
  for (const file of dirtyFiles) {
    // eslint-disable-next-line no-await-in-loop
    await saveFile(file.id);
  }
};

const closeProject = async () => {
  const dirtyFiles = getState().openFiles.filter((file) => file.isDirty);
  if (dirtyFiles.length > 0) {
    const confirmed = await message(
      `There are ${dirtyFiles.length} unsaved file(s). Do you want to save them before closing the project?`,
      { title: "Unsaved Changes" },
    );

    if (confirmed) {
      await saveAllFiles();
    } else {
      return;
    }
  }

  const workspace = getState().workspace;
  let recentWorkspaces = getState().recentWorkspaces;
  if (workspace) {
    // Ensure workspace is in recent workspaces when closing
    recentWorkspaces = ensureWorkspaceInRecents(workspace, recentWorkspaces);
    safeSaveToStore("rainy-coder-recent-workspaces", recentWorkspaces);
  }

  setState((prev) => ({
    ...prev,
    currentView: "startup",
    openFiles: [],
    activeFileId: null,
    workspace: null,
    projectTree: null,
    recentWorkspaces,
  }));

  safeSaveToStore("rainy-coder-current-view", "startup");
};

// Lazy load children for a directory node
const loadDirectoryChildren = async (dirPath: string) => {
  try {
    const children = await invoke<FileNode[]>("load_directory_children", { path: dirPath });

    // Update the project tree to include the loaded children
    setState((prev) => {
      if (!prev.projectTree) return prev;

      const updateNodeChildren = (node: FileNode): FileNode | null => {
        // Found the target node - update it
        if (node.path === dirPath) {
          return {
            ...node,
            children,
            children_loaded: true,
          };
        }

        // If this node has children, search them
        if (node.children) {
          let updated = false;
          const newChildren = node.children.map(child => {
            const result = updateNodeChildren(child);
            if (result !== null) {
              updated = true;
              return result;
            }
            return child;
          });

          // Only create new object if a child was actually updated
          if (updated) {
            return {
              ...node,
              children: newChildren,
            };
          }
        }

        // No changes needed for this node
        return null;
      };

      const updatedTree = updateNodeChildren(prev.projectTree);

      // Only update state if something actually changed
      if (updatedTree === null) {
        return prev;
      }

      return {
        ...prev,
        projectTree: updatedTree,
      };
    });
  } catch (error) {
    console.error("Failed to load directory children:", error);
    throw error;
  }
};

const ideActions = {
  setCurrentView,
  setViewMode,
  createFileAt,
  createFolderAt,
  renameNode,
  deleteNode,
  setProjectTree,
  loadDirectoryChildren,
  toggleSidebar,
  toggleRightSidebar,
  setSidebarOpen,
  setSidebarActive,
  setAutoSave,
  toggleZenMode,
  closeAllEditors,
  revealActiveFile,
  revealWorkspace,
  createNewFile,
  openFile,
  openFolderDialog,
  openWorkspace,
  loadWorkspace: openWorkspace, // Alias for openWorkspace
  openRecentWorkspace,
  clearRecentWorkspaces,
  cloneRepository,
  openTerminal,
  openSettings,
  closeSettings,
  closeFile,
  setActiveFile,
  activateNextTab,
  activatePrevTab,
  updateFileContent,
  saveFile,
  saveFileAs,
  saveAllFiles,
  closeProject,
  getState, // Add getState to actions for non-React access
  // Pinned tabs actions
  pinFile,
  unpinFile,
  togglePinFile,
  closeUnpinnedFiles,
  closeOtherFiles,
  closeFilesToTheRight,
};

// Export ideActions for use outside of React context
export { ideActions };

interface IDEContextValue {
  state: () => IDEState;
  actions: typeof ideActions;
}

const IDEContext = createContext<IDEContextValue | undefined>(undefined);

/**
 * Parse workspace path from URL query parameters
 * Used when a new window is opened with a specific workspace
 */
const getWorkspaceFromURL = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;

    // Debug: Log the current location
    console.log('[IDE] Current URL:', window.location.href);
    console.log('[IDE] Search params:', window.location.search);

    // Method 1: Try URLSearchParams (standard approach)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const workspacePath = urlParams.get('workspace');

      if (workspacePath) {
        // Decode the workspace path
        const decodedPath = decodeURIComponent(workspacePath);
        console.log('[IDE] ✓ Found workspace in URL via URLSearchParams:', decodedPath);
        return decodedPath;
      }
    } catch (e) {
      console.warn('[IDE] URLSearchParams method failed:', e);
    }

    // Method 2: Manual parsing as fallback
    if (window.location.search) {
      const searchString = window.location.search.substring(1); // Remove leading '?'
      const params = searchString.split('&');

      for (const param of params) {
        const [key, value] = param.split('=');
        if (key === 'workspace' && value) {
          const decodedPath = decodeURIComponent(value);
          console.log('[IDE] ✓ Found workspace in URL via manual parsing:', decodedPath);
          return decodedPath;
        }
      }
    }

    console.log('[IDE] No workspace parameter found in URL');
    return null;
  } catch (error) {
    console.error('[IDE] Failed to parse workspace from URL:', error);
    return null;
  }
};

const initializeFromStorage = async () => {
  console.log('[IDE] Initializing IDE from storage...');
  const savedRecentWorkspaces = await loadFromStore<Workspace[]>("rainy-coder-recent-workspaces", []);
  console.log('[IDE] Loaded recent workspaces from storage:', savedRecentWorkspaces.length);

  // IMPORTANT: New windows should NOT auto-load last workspace
  // They will either:
  // 1. Receive a 'rainy:load-workspace' event (for Duplicate Workspace)
  // 2. Stay on StartupPage (for New Window)
  //
  // Only the MAIN window (first startup) should load last workspace
  let initialWorkspace: Workspace | null = null;

  // Check if this is the main window by checking the window label
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const currentWindow = getCurrentWindow();
    const label = currentWindow.label;

    console.log('[IDE] Current window label:', label);

    // Main window has label "main", new windows have "main-{timestamp}"
    if (label === 'main') {
      // Main window: load last workspace from storage
      initialWorkspace = savedRecentWorkspaces[0] ?? null;
      if (initialWorkspace) {
        console.log('[IDE] Main window - loading last workspace from storage:', initialWorkspace);
      } else {
        console.log('[IDE] Main window - no workspace found, will show StartupPage');
      }
    } else {
      // New window: don't load workspace, wait for event or stay on startup
      console.log('[IDE] New window - staying on StartupPage, waiting for workspace event');
      initialWorkspace = null;
    }
  } catch (error) {
    console.error('[IDE] Failed to get window label, assuming main window:', error);
    // Fallback: assume main window
    initialWorkspace = savedRecentWorkspaces[0] ?? null;
  }

  const [sidebarOpen, autoSaveEnabled, zenModeEnabled, sidebarActive, viewMode] = await Promise.all([
    loadFromStore<boolean>("rainy-coder-sidebar-open", true),
    loadFromStore<boolean>("rainy-coder-auto-save", false),
    loadFromStore<boolean>("rainy-coder-zen-mode", false),
    loadFromStore<SidebarTab>("rainy-coder-sidebar-active", "explorer"),
    loadFromStore<ViewMode>("rainy-coder-view-mode", "ide"),
  ]);

  // Set initial state with preferences
  setState((prev) => {
    const nextState = {
      ...prev,
      recentWorkspaces: savedRecentWorkspaces,
      isSidebarOpen: sidebarOpen,
      autoSave: autoSaveEnabled,
      isZenMode: zenModeEnabled,
      sidebarActive,
      viewMode,
      // If no workspace, stay on startup; otherwise, we'll open the workspace which sets currentView to editor
      currentView: initialWorkspace ? prev.currentView : "startup",
    };
    console.log('[IDE] State after loading preferences:', {
      currentView: nextState.currentView,
      hasWorkspace: !!initialWorkspace,
    });
    return nextState;
  });

  // Open workspace after setting other preferences
  // This ensures openWorkspace's state changes aren't overwritten
  if (initialWorkspace) {
    console.log('[IDE] Opening workspace...');
    await openWorkspace(initialWorkspace, false);
  } else {
    console.log('[IDE] No workspace to open - staying on StartupPage');
  }
};

const setupFileChangeListener = async (
  setReloadTimeout: (updater: (handle: TimeoutHandle | null) => TimeoutHandle | null) => void,
): Promise<UnlistenFn | null> => {
  if (!isTauriEnv()) {
    return null;
  }

  try {
    const unlisten = await listen("file-change", (event) => {
      const changedPaths = (event.payload as string[]) ?? [];
      const snapshot = getState();
      const workspace = snapshot.workspace;
      if (!workspace) {
        return;
      }

      const hasRelevantChanges = changedPaths.some((path) => !isGitInternalPath(path, workspace.path));
      if (!hasRelevantChanges) {
        return;
      }

      const hasDirtyOpenFile = changedPaths.some((path) =>
        snapshot.openFiles.some((file) => pathsEqual(file.path, path) && file.isDirty),
      );

      if (!hasDirtyOpenFile) {
        setReloadTimeout((current) => {
          if (current) clearTimeout(current);
          return setTimeout(() => {
            const latestWorkspace = getState().workspace;
            if (latestWorkspace) {
              void refreshWorkspaceContents(latestWorkspace);
            }
          }, 300);
        });
      }
    });

    return unlisten;
  } catch (error) {
    console.error("Failed to register file-change listener:", error);
    return null;
  }
};

export const IDEProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  useEffect(() => {
    let reloadTimeout: TimeoutHandle | null = null;
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    const setReloadTimeout = (updater: (handle: TimeoutHandle | null) => TimeoutHandle | null) => {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      reloadTimeout = updater(reloadTimeout);
    };

    (async () => {
      try {
        await initializeFromStorage();
      } catch (error) {
        console.error("Failed to initialize IDE store:", error);
      }

      if (cancelled) {
        return;
      }

      unlisten = await setupFileChangeListener(setReloadTimeout);
    })();

    return () => {
      cancelled = true;
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const contextValue = useMemo<IDEContextValue>(
    () => ({
      state: getState,
      actions: ideActions,
    }),
    [],
  );

  return <IDEContext.Provider value={contextValue}>{children}</IDEContext.Provider>;
};

export const useIDEStore = () => {
  const context = useContext(IDEContext);
  if (!context) {
    throw new Error("useIDEStore must be used within an IDEProvider");
  }
  return context;
};