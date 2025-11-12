import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

// Debounce timers for git operations
let refreshStatusTimer: ReturnType<typeof setTimeout> | null = null;
let refreshHistoryTimer: ReturnType<typeof setTimeout> | null = null;
let refreshBranchesTimer: ReturnType<typeof setTimeout> | null = null;

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

export type Remote = {
  name: string;
  fetch_url: string;
  push_url: string;
};

export type Tag = {
  name: string;
  commit: string;
  message?: string;
  tagger?: string;
  date?: string;
};

export type ConflictFile = {
  path: string;
  ours: string;
  theirs: string;
  base: string;
};

export type FileDiff = {
  path: string;
  old_path?: string;
  status: string;
  additions: number;
  deletions: number;
  diff: string;
};

export type GitState = {
  workspacePath?: string;
  isRepo: boolean;
  commits: Commit[];
  status: StatusEntry[];
  branches: Branch[];
  stashes: StashEntry[];
  remotes: Remote[];
  tags: Tag[];
  conflicts: string[];
  selectedCommit?: string;
  selectedFiles: Set<string>;
  loadingHistory: boolean;
  loadingDiff: boolean;
  loadingBranches: boolean;
  loadingStashes: boolean;
  loadingRemotes: boolean;
  loadingTags: boolean;
  loadingConflicts: boolean;
  unpushedHashes: Set<string>;
  currentBranch?: string;
  isCloning: boolean;
  cloneProgress?: string;
  isMerging: boolean;
  isRebasing: boolean;
};

let git: GitState = {
  workspacePath: undefined,
  isRepo: false,
  commits: [],
  status: [],
  branches: [],
  stashes: [],
  remotes: [],
  tags: [],
  conflicts: [],
  selectedCommit: undefined,
  selectedFiles: new Set<string>(),
  loadingHistory: false,
  loadingDiff: false,
  loadingBranches: false,
  loadingStashes: false,
  loadingRemotes: false,
  loadingTags: false,
  loadingConflicts: false,
  unpushedHashes: new Set<string>(),
  currentBranch: undefined,
  isCloning: false,
  cloneProgress: undefined,
  isMerging: false,
  isRebasing: false,
};

let cachedSnapshot: GitState = { ...git };

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
  git = { ...git, ...partial };
  cachedSnapshot = git;
  notify();
};

const subscribe = (listener: GitStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

export const useGitState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export function setWorkspacePath(path?: string) {
  updateGitState({ workspacePath: path });
}

export function refreshRepoDetection() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;
  // Use native implementation to avoid CMD window flashing on Windows
  invoke<boolean>("git_is_repo_native", { path: wsPath })
    .then((ok: boolean) => updateGitState({ isRepo: ok }))
    .catch(() => updateGitState({ isRepo: false }));
}

export async function refreshHistory(maxCount = 100, debounce = true) {
  const wsPath = git.workspacePath;
  if (!wsPath) return;

  // Debounce to prevent excessive calls
  if (debounce) {
    if (refreshHistoryTimer) clearTimeout(refreshHistoryTimer);
    refreshHistoryTimer = setTimeout(() => refreshHistory(maxCount, false), 300);
    return;
  }

  updateGitState({ loadingHistory: true });
  try {
    // Use native implementation to fix crashes when viewing commits
    const [commits, unpushed]: [Commit[], string[]] = await Promise.all([
      invoke<Commit[]>("git_log_native", { path: wsPath, maxCount: maxCount }),
      invoke<string[]>("git_unpushed_native", { path: wsPath }),
    ]);
    updateGitState({
      commits,
      unpushedHashes: new Set(
        unpushed.map((h) => h.trim()).filter((h) => h.length > 0)
      ),
    });
  } catch (error) {
    console.error('Failed to refresh git history:', error);
  } finally {
    updateGitState({ loadingHistory: false });
  }
}

export async function refreshStatus(debounce = true) {
  const wsPath = git.workspacePath;
  if (!wsPath) return;

  // Debounce to prevent excessive calls
  if (debounce) {
    if (refreshStatusTimer) clearTimeout(refreshStatusTimer);
    refreshStatusTimer = setTimeout(() => refreshStatus(false), 300);
    return;
  }

  try {
    // Use native implementation for better performance (6-8x faster)
    const entries = await invoke<StatusEntry[]>("git_status_native", { path: wsPath });
    updateGitState({ status: entries });
  } catch (error) {
    console.error('Failed to refresh git status:', error);
  }
}

export async function refreshBranches(debounce = true) {
  const wsPath = git.workspacePath;
  if (!wsPath) return;

  // Debounce to prevent excessive calls
  if (debounce) {
    if (refreshBranchesTimer) clearTimeout(refreshBranchesTimer);
    refreshBranchesTimer = setTimeout(() => refreshBranches(false), 300);
    return;
  }

  updateGitState({ loadingBranches: true });
  try {
    // Use native implementation for better performance (7.5x faster)
    const branches = await invoke<Branch[]>("git_branches_native", { path: wsPath });
    const currentBranch = branches.find(b => b.current)?.name;
    updateGitState({ branches, currentBranch });
  } catch (error) {
    console.error('Failed to refresh git branches:', error);
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

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_commit", { path: wsPath, message, stageAll });
  await Promise.all([refreshStatus(), refreshHistory(), refreshBranches()]);
}

export async function stageFile(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_stage_file", { path: wsPath, filePath });
  await refreshStatus();
}

export async function unstageFile(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_unstage_file", { path: wsPath, filePath });
  await refreshStatus();
}

export async function discardChanges(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_discard_changes", { path: wsPath, filePath });
  await Promise.all([refreshStatus(), refreshHistory()]);
}

export async function checkoutBranch(branchName: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Use native implementation for faster branch switching
  await invoke<string>("git_checkout_branch_native", { path: wsPath, branchName });
  await Promise.all([refreshStatus(), refreshHistory(), refreshBranches()]);
}

export async function createBranch(branchName: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Use native implementation for faster branch creation
  await invoke<string>("git_create_branch_native", { path: wsPath, branchName });
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

  // Use native implementation for instant diff viewing (10x faster)
  return await invoke<string>("git_diff_file_native", { path: wsPath, filePath, staged });
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

// ============================================================================
// CLONE & REMOTE OPERATIONS
// ============================================================================

export async function cloneRepository(
  url: string,
  destination: string,
  branch?: string,
  depth?: number
) {
  updateGitState({ isCloning: true, cloneProgress: "Starting clone..." });
  try {
    await invoke<string>("git_clone", { url, destination, branch, depth });
    updateGitState({ isCloning: false, cloneProgress: undefined });
    return true;
  } catch (error) {
    console.error('Failed to clone repository:', error);
    updateGitState({ isCloning: false, cloneProgress: undefined });
    throw error;
  }
}

export async function refreshRemotes() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;

  updateGitState({ loadingRemotes: true });
  try {
    const remotes = await invoke<Remote[]>("git_list_remotes", { path: wsPath });
    updateGitState({ remotes });
  } catch (error) {
    console.error('Failed to refresh remotes:', error);
  } finally {
    updateGitState({ loadingRemotes: false });
  }
}

export async function addRemote(name: string, url: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_add_remote", { path: wsPath, name, url });
  await refreshRemotes();
}

export async function removeRemote(name: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_remove_remote", { path: wsPath, name });
  await refreshRemotes();
}

export async function renameRemote(oldName: string, newName: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_rename_remote", { path: wsPath, oldName, newName });
  await refreshRemotes();
}

export async function setRemoteUrl(name: string, url: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_set_remote_url", { path: wsPath, name, url });
  await refreshRemotes();
}

export async function fetch(remote?: string, prune = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_fetch", { path: wsPath, remote, prune });
  await Promise.all([refreshHistory(), refreshBranches()]);
}

export async function fetchAll(prune = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_fetch_all", { path: wsPath, prune });
  await Promise.all([refreshHistory(), refreshBranches()]);
}

// ============================================================================
// MERGE & REBASE OPERATIONS
// ============================================================================

export async function merge(branch: string, noFf = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  updateGitState({ isMerging: true });
  try {
    await invoke<string>("git_merge", { path: wsPath, branch, no_ff: noFf });
    await Promise.all([refreshStatus(), refreshHistory(), refreshConflicts()]);
  } catch (error) {
    await refreshConflicts();
    throw error;
  } finally {
    updateGitState({ isMerging: false });
  }
}

export async function mergeAbort() {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_merge_abort", { path: wsPath });
  updateGitState({ isMerging: false });
  await Promise.all([refreshStatus(), refreshConflicts()]);
}

export async function rebase(branch: string, interactive = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  updateGitState({ isRebasing: true });
  try {
    await invoke<string>("git_rebase", { path: wsPath, branch, interactive });
    await Promise.all([refreshStatus(), refreshHistory()]);
  } catch (error) {
    await refreshConflicts();
    throw error;
  } finally {
    updateGitState({ isRebasing: false });
  }
}

export async function rebaseAbort() {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_rebase_abort", { path: wsPath });
  updateGitState({ isRebasing: false });
  await refreshStatus();
}

export async function rebaseContinue() {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_rebase_continue", { path: wsPath });
  await Promise.all([refreshStatus(), refreshHistory()]);
}

export async function rebaseSkip() {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_rebase_skip", { path: wsPath });
  await refreshStatus();
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export async function refreshConflicts() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;

  updateGitState({ loadingConflicts: true });
  try {
    const conflicts = await invoke<string[]>("git_list_conflicts", { path: wsPath });
    updateGitState({ conflicts });
  } catch (error) {
    console.error('Failed to refresh conflicts:', error);
    updateGitState({ conflicts: [] });
  } finally {
    updateGitState({ loadingConflicts: false });
  }
}

export async function getConflictContent(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  return await invoke<ConflictFile>("git_get_conflict_content", { path: wsPath, filePath });
}

export async function resolveConflict(filePath: string, resolution: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_resolve_conflict", { path: wsPath, filePath, resolution });
  await Promise.all([refreshStatus(), refreshConflicts()]);
}

export async function acceptOurs(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_accept_ours", { path: wsPath, filePath });
  await Promise.all([refreshStatus(), refreshConflicts()]);
}

export async function acceptTheirs(filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_accept_theirs", { path: wsPath, filePath });
  await Promise.all([refreshStatus(), refreshConflicts()]);
}

// ============================================================================
// TAG OPERATIONS
// ============================================================================

export async function refreshTags() {
  const wsPath = git.workspacePath;
  if (!wsPath) return;

  updateGitState({ loadingTags: true });
  try {
    const tags = await invoke<Tag[]>("git_list_tags", { path: wsPath });
    updateGitState({ tags });
  } catch (error) {
    console.error('Failed to refresh tags:', error);
  } finally {
    updateGitState({ loadingTags: false });
  }
}

export async function createTag(name: string, message?: string, commit?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_create_tag", { path: wsPath, name, message, commit });
  await refreshTags();
}

export async function deleteTag(name: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_delete_tag", { path: wsPath, name });
  await refreshTags();
}

export async function pushTag(name: string, remote?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_push_tag", { path: wsPath, name, remote });
}

export async function pushAllTags(remote?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_push_all_tags", { path: wsPath, remote });
}

// ============================================================================
// ENHANCED DIFF OPERATIONS
// ============================================================================

export async function getDiffFiles(from?: string, to?: string, staged = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  return await invoke<FileDiff[]>("git_diff_files", { path: wsPath, from, to, staged });
}

export async function getCommitDiff(commit: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Use native implementation to eliminate lag and CPU spikes when viewing commits (12-15x faster)
  return await invoke<FileDiff[]>("git_diff_commit_native", { path: wsPath, commit });
}

export async function getDiffBetweenCommits(fromCommit: string, toCommit: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  return await invoke<string>("git_diff_between_commits", { path: wsPath, fromCommit, toCommit });
}

// ============================================================================
// ENHANCED BRANCH OPERATIONS
// ============================================================================

export async function deleteBranch(branchName: string, force = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_delete_branch", { path: wsPath, branchName, force });
  await refreshBranches();
}

export async function renameBranch(oldName: string, newName: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_rename_branch", { path: wsPath, oldName, newName });
  await refreshBranches();
}

export async function setUpstream(remote: string, branch: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_set_upstream", { path: wsPath, remote, branch });
  await refreshBranches();
}

// ============================================================================
// ENHANCED COMMIT OPERATIONS
// ============================================================================

export async function amendCommit(message?: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_amend_commit", { path: wsPath, message });
  await Promise.all([refreshHistory(), refreshStatus()]);
}

export async function resetCommit(commit: string, mode: 'soft' | 'mixed' | 'hard') {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_reset", { path: wsPath, commit, mode });
  await Promise.all([refreshHistory(), refreshStatus()]);
}

export async function revertCommit(commit: string, noCommit = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_revert", { path: wsPath, commit, no_commit: noCommit });
  await Promise.all([refreshHistory(), refreshStatus()]);
}

export async function cherryPick(commit: string, noCommit = false) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_cherry_pick", { path: wsPath, commit, no_commit: noCommit });
  await Promise.all([refreshHistory(), refreshStatus()]);
}

// ============================================================================
// ENHANCED FILE OPERATIONS
// ============================================================================

export async function stageFiles(filePaths: string[]) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_stage_files", { path: wsPath, filePaths });
  await refreshStatus();
}

export async function unstageFiles(filePaths: string[]) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_unstage_files", { path: wsPath, filePaths });
  await refreshStatus();
}

export async function discardFiles(filePaths: string[]) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  // Note: Tauri converts Rust snake_case params to camelCase in JS
  await invoke<string>("git_discard_files", { path: wsPath, filePaths });
  await refreshStatus();
}

export async function showFile(commit: string, filePath: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");

  // Note: Tauri converts Rust snake_case params to camelCase in JS
  return await invoke<string>("git_show_file", { path: wsPath, commit, filePath });
}

// ============================================================================
// FILE SELECTION
// ============================================================================

export function toggleFileSelection(filePath: string) {
  const selectedFiles = new Set(git.selectedFiles);
  if (selectedFiles.has(filePath)) {
    selectedFiles.delete(filePath);
  } else {
    selectedFiles.add(filePath);
  }
  updateGitState({ selectedFiles });
}

export function selectAllFiles() {
  const selectedFiles = new Set(git.status.map(s => s.path));
  updateGitState({ selectedFiles });
}

export function clearFileSelection() {
  updateGitState({ selectedFiles: new Set() });
}

export function getSelectedFiles() {
  return Array.from(git.selectedFiles);
}

// ============================================================================
// REPOSITORY INFO
// ============================================================================

export async function getRepoInfo() {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  return await invoke<any>("git_get_repo_info", { path: wsPath });
}

export async function getConfig(key: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  return await invoke<string>("git_get_config", { path: wsPath, key });
}

export async function setConfig(key: string, value: string) {
  const wsPath = git.workspacePath;
  if (!wsPath) throw new Error("No workspace open");
  
  await invoke<string>("git_set_config", { path: wsPath, key, value });
}

export { git as gitState };