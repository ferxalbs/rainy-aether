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
  staged?: boolean;
};

export type Branch = {
  name: string;
  current: boolean;
  remote?: string;
};

export type StashEntry = {
  stash: string;
  message: string;
};

export type GitState = {
  workspacePath?: string;
  isRepo: boolean;
  commits: Commit[];
  status: StatusEntry[];
  branches: Branch[];
  stashes: StashEntry[];
  selectedCommit?: string;
  loadingHistory: boolean;
  loadingDiff: boolean;
  loadingBranches: boolean;
  loadingStashes: boolean;
  unpushedHashes: Set<string>;
  currentBranch?: string;
};

const git: GitState = {
  workspacePath: undefined,
  isRepo: false,
  commits: [],
  status: [],
  branches: [],
  stashes: [],
  selectedCommit: undefined,
  loadingHistory: false,
  loadingDiff: false,
  loadingBranches: false,
  loadingStashes: false,
  unpushedHashes: new Set<string>(),
  currentBranch: undefined,
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

export async function refreshBranches() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;
  updateGitState({ loadingBranches: true });
  try {
    const branches = await invoke<Branch[]>("git_branches", { path: wsPath });
    const currentBranch = branches.find(b => b.current)?.name;
    updateGitState({ branches, currentBranch });
  } finally {
    updateGitState({ loadingBranches: false });
  }
}

export async function refreshStashes() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;
  updateGitState({ loadingStashes: true });
  try {
    const stashes = await invoke<StashEntry[]>("git_stash_list", { path: wsPath });
    updateGitState({ stashes });
  } finally {
    updateGitState({ loadingStashes: false });
  }
}

export function selectCommit(hash?: string) {
  updateGitState({ selectedCommit: hash });
}

export async function commit(message: string, stageAll = true) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  await invoke<string>("git_commit", { path: wsPath, message, stage_all: stageAll });
  await Promise.all([refreshStatus(), refreshHistory(), refreshBranches()]);
}

export async function stageFile(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_stage_file", { path: wsPath, file_path: filePath });
  await refreshStatus();
}

export async function unstageFile(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_unstage_file", { path: wsPath, file_path: filePath });
  await refreshStatus();
}

export async function discardChanges(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_discard_changes", { path: wsPath, file_path: filePath });
  await Promise.all([refreshStatus(), refreshHistory()]);
}

export async function checkoutBranch(branchName: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_checkout_branch", { path: wsPath, branch_name: branchName });
  await Promise.all([refreshStatus(), refreshHistory(), refreshBranches()]);
}

export async function createBranch(branchName: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_create_branch", { path: wsPath, branch_name: branchName });
  await Promise.all([refreshStatus(), refreshHistory(), refreshBranches()]);
}

export async function push(remote?: string, branch?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_push", { path: wsPath, remote, branch });
  await Promise.all([refreshHistory(), refreshBranches()]);
}

export async function pull(remote?: string, branch?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_pull", { path: wsPath, remote, branch });
  await Promise.all([refreshStatus(), refreshHistory(), refreshBranches()]);
}

export async function stashPush(message?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_stash_push", { path: wsPath, message });
  await Promise.all([refreshStatus(), refreshStashes()]);
}

export async function stashPop(stash?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_stash_pop", { path: wsPath, stash });
  await Promise.all([refreshStatus(), refreshStashes()]);
}

export async function getFileDiff(filePath: string, staged = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  return await invoke<string>("git_diff_file", { path: wsPath, file_path: filePath, staged });
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

export function branches() {
  return git.branches;
}

export function stashes() {
  return git.stashes;
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

export function loadingBranches() {
  return git.loadingBranches;
}

export function loadingStashes() {
  return git.loadingStashes;
}

export function unpushedSet() {
  return git.unpushedHashes;
}

export function getCurrentBranch() {
  return git.currentBranch;
}

export { git as gitState };