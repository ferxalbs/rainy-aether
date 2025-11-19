import { useSyncExternalStore } from "react";

// Types
export type SplitDirection = "horizontal" | "vertical";

export interface EditorGroup {
  id: string;
  activeFileId: string | null;
  openFileIds: string[];
}

export interface EditorGroupState {
  groups: EditorGroup[];
  activeGroupId: string;
  splitDirection: SplitDirection;
}

const initialState: EditorGroupState = {
  groups: [
    {
      id: "group-1",
      activeFileId: null,
      openFileIds: [],
    },
  ],
  activeGroupId: "group-1",
  splitDirection: "horizontal",
};

let state: EditorGroupState = { ...initialState };
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Editor group state listener error:", error);
    }
  });
};

const setState = (updater: (prev: EditorGroupState) => EditorGroupState) => {
  state = updater(state);
  notifyListeners();
};

const getState = () => state;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useEditorGroupState = () =>
  useSyncExternalStore(subscribe, getState, getState);

// Actions
export const editorGroupActions = {
  /**
   * Split the current editor group
   */
  split(direction: SplitDirection = "horizontal") {
    setState((prev) => {
      if (prev.groups.length >= 3) {
        // Limit to 3 splits for now
        return prev;
      }

      const activeGroup = prev.groups.find((g) => g.id === prev.activeGroupId);
      if (!activeGroup) return prev;

      const newGroupId = `group-${Date.now()}`;
      const newGroup: EditorGroup = {
        id: newGroupId,
        activeFileId: activeGroup.activeFileId,
        openFileIds: activeGroup.activeFileId ? [activeGroup.activeFileId] : [],
      };

      return {
        ...prev,
        groups: [...prev.groups, newGroup],
        activeGroupId: newGroupId,
        splitDirection: direction,
      };
    });
  },

  /**
   * Close a specific editor group
   */
  closeGroup(groupId: string) {
    setState((prev) => {
      if (prev.groups.length <= 1) {
        // Can't close the last group
        return prev;
      }

      const remainingGroups = prev.groups.filter((g) => g.id !== groupId);
      const newActiveGroupId =
        prev.activeGroupId === groupId
          ? remainingGroups[0].id
          : prev.activeGroupId;

      return {
        ...prev,
        groups: remainingGroups,
        activeGroupId: newActiveGroupId,
      };
    });
  },

  /**
   * Set the active editor group
   */
  setActiveGroup(groupId: string) {
    setState((prev) => ({
      ...prev,
      activeGroupId: groupId,
    }));
  },

  /**
   * Open a file in the active group
   */
  openFileInGroup(fileId: string, groupId?: string) {
    setState((prev) => {
      const targetGroupId = groupId || prev.activeGroupId;
      return {
        ...prev,
        groups: prev.groups.map((group) => {
          if (group.id === targetGroupId) {
            const hasFile = group.openFileIds.includes(fileId);
            return {
              ...group,
              openFileIds: hasFile
                ? group.openFileIds
                : [...group.openFileIds, fileId],
              activeFileId: fileId,
            };
          }
          return group;
        }),
        activeGroupId: targetGroupId,
      };
    });
  },

  /**
   * Close a file in a specific group
   */
  closeFileInGroup(fileId: string, groupId: string) {
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((group) => {
        if (group.id === groupId) {
          const newOpenFileIds = group.openFileIds.filter((id) => id !== fileId);
          let newActiveFileId = group.activeFileId;

          if (group.activeFileId === fileId) {
            const closedIndex = group.openFileIds.indexOf(fileId);
            newActiveFileId =
              newOpenFileIds[Math.min(closedIndex, newOpenFileIds.length - 1)] ||
              null;
          }

          return {
            ...group,
            openFileIds: newOpenFileIds,
            activeFileId: newActiveFileId,
          };
        }
        return group;
      }),
    }));
  },

  /**
   * Set active file in a group
   */
  setActiveFileInGroup(fileId: string, groupId: string) {
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId ? { ...group, activeFileId: fileId } : group
      ),
      activeGroupId: groupId,
    }));
  },

  /**
   * Move file to a different group
   */
  moveFileToGroup(fileId: string, fromGroupId: string, toGroupId: string) {
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((group) => {
        if (group.id === fromGroupId) {
          const newOpenFileIds = group.openFileIds.filter((id) => id !== fileId);
          return {
            ...group,
            openFileIds: newOpenFileIds,
            activeFileId:
              group.activeFileId === fileId
                ? newOpenFileIds[0] || null
                : group.activeFileId,
          };
        }
        if (group.id === toGroupId) {
          const hasFile = group.openFileIds.includes(fileId);
          return {
            ...group,
            openFileIds: hasFile
              ? group.openFileIds
              : [...group.openFileIds, fileId],
            activeFileId: fileId,
          };
        }
        return group;
      }),
      activeGroupId: toGroupId,
    }));
  },

  /**
   * Set split direction
   */
  setSplitDirection(direction: SplitDirection) {
    setState((prev) => ({
      ...prev,
      splitDirection: direction,
    }));
  },

  /**
   * Close all splits and return to single editor
   */
  closeSplits() {
    setState((prev) => {
      // Merge all open files into the first group
      const allFileIds = new Set<string>();
      let lastActiveFileId: string | null = null;

      prev.groups.forEach((group) => {
        group.openFileIds.forEach((id) => allFileIds.add(id));
        if (group.id === prev.activeGroupId && group.activeFileId) {
          lastActiveFileId = group.activeFileId;
        }
      });

      return {
        ...prev,
        groups: [
          {
            id: "group-1",
            activeFileId: lastActiveFileId || Array.from(allFileIds)[0] || null,
            openFileIds: Array.from(allFileIds),
          },
        ],
        activeGroupId: "group-1",
      };
    });
  },

  /**
   * Sync with IDE store when files are opened/closed
   */
  syncWithOpenFiles(openFileIds: string[], activeFileId: string | null) {
    setState((prev) => {
      // If only one group, keep it synced with IDE store
      if (prev.groups.length === 1) {
        return {
          ...prev,
          groups: [
            {
              ...prev.groups[0],
              openFileIds,
              activeFileId,
            },
          ],
        };
      }

      // With multiple groups, remove closed files from all groups
      const closedFiles = new Set(
        prev.groups.flatMap((g) => g.openFileIds).filter((id) => !openFileIds.includes(id))
      );

      if (closedFiles.size === 0) return prev;

      return {
        ...prev,
        groups: prev.groups.map((group) => ({
          ...group,
          openFileIds: group.openFileIds.filter((id) => !closedFiles.has(id)),
          activeFileId: closedFiles.has(group.activeFileId || "")
            ? group.openFileIds.filter((id) => !closedFiles.has(id))[0] || null
            : group.activeFileId,
        })),
      };
    });
  },

  /**
   * Reset to initial state
   */
  reset() {
    setState(() => initialState);
  },
};

export { getState as getEditorGroupState };
