import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

export type Commit = {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
};

export type StatusEntry = {
  path: string;
  code: string; // two-letter porcelain code (XY)
};

export type GitState = {
  workspacePath?: string;
  isRepo: boolean;
  commits: Commit[];
  status: StatusEntry[];
  selectedCommit?: string;
  loadingHistory: boolean;
  loadingDiff: boolean;
  unpushedHashes: Set<string>;
};

const git: GitState = {
  workspacePath: undefined,
  isRepo: false,
  commits: [],
  status: [],
  selectedCommit: undefined,
  loadingHistory: false,
  loadingDiff: false,
  unpushedHashes: new Set<string>(),
};

type GitStateListener = () => void;

const listeners = new Set<GitStateListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Git state listener error:", error);
    }
  });
};

const updateGitState = (partial: Partial<GitState>) => {
  Object.assign(git, partial);
  notify();
};

const subscribe = (listener: GitStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => git;

export const useGitState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export function setWorkspacePath(path?: string) {
  updateGitState({ workspacePath: path });
}

export function refreshRepoDetection() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;
  invoke<boolean>("git_is_repo", { path: wsPath })
    .then((ok: boolean) => updateGitState({ isRepo: ok }))
    .catch(() => updateGitState({ isRepo: false }));
}

export async function refreshHistory(maxCount = 100) {
  const wsPath = git.workspacePath;
  if (!wsPath) return;
  updateGitState({ loadingHistory: true });
  try {
    const [commits, unpushed]: [Commit[], string[]] = await Promise.all([
      invoke<Commit[]>("git_log", { path: wsPath, max_count: maxCount }),
      invoke<string[]>("git_unpushed", { path: wsPath }),
    ]);
    updateGitState({
      commits,
      unpushedHashes: new Set(
        unpushed.map((h) => h.trim()).filter((h) => h.length > 0)
      ),
    });
  } finally {
    updateGitState({ loadingHistory: false });
  }
}

export async function refreshStatus() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;
  const entries = await invoke<StatusEntry[]>("git_status", { path: wsPath });
  updateGitState({ status: entries });
}

export function selectCommit(hash?: string) {
  updateGitState({ selectedCommit: hash });
}

export async function commit(message: string, stageAll = true) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  await invoke<string>("git_commit", { path: wsPath, message, stage_all: stageAll });
  await Promise.all([refreshStatus(), refreshHistory()]);
}

export function isRepo() {
  return git.isRepo;
}

export function commits() {
  return git.commits;
}

export function status() {
  return git.status;
}

export function selectedCommit() {
  return git.selectedCommit;
}

export function loadingHistory() {
  return git.loadingHistory;
}

export function loadingDiff() {
  return git.loadingDiff;
}

export function unpushedSet() {
  return git.unpushedHashes;
}

export { git as gitState };