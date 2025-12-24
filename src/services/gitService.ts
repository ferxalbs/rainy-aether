import { invoke } from '@tauri-apps/api/core';

// Git status interface
export interface GitStatus {
  branch?: string;
  ahead?: number;
  behind?: number;
  staged: number;
  modified: number;
  untracked: number;
  conflicts: number;
  clean: boolean;
  commit?: string;
  remote?: string;
  hasRemote?: boolean;
}

// Sync status from backend
interface SyncStatus {
  ahead: number;
  behind: number;
  has_remote: boolean;
  branch?: string;
  remote?: string;
}

// Git service for handling git operations
export class GitService {
  private workspacePath: string | null = null;

  constructor(workspacePath?: string) {
    this.workspacePath = workspacePath || null;
  }

  // Check if current directory is a git repository
  async isGitRepository(): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_is_repo', { path: this.workspacePath });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get current git status with sync information
  async getGitStatus(): Promise<GitStatus> {
    if (!this.workspacePath) {
      return {
        staged: 0,
        modified: 0,
        untracked: 0,
        conflicts: 0,
        clean: true
      };
    }

    try {
      // Get sync status (ahead/behind)
      const syncStatus = await invoke<SyncStatus>('git_sync_status', { path: this.workspacePath });

      // Get file status
      const status = await invoke<{ path: string; code: string }[]>('git_status', { path: this.workspacePath });

      // Count status types
      let staged = 0;
      let modified = 0;
      let untracked = 0;
      let conflicts = 0;

      for (const entry of status) {
        const indexStatus = entry.code[0];
        const workTreeStatus = entry.code[1];

        // Check for staged changes (first char not space or ?)
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged++;
        }
        // Check for modified working tree
        if (workTreeStatus === 'M' || workTreeStatus === 'D') {
          modified++;
        }
        // Check for untracked
        if (entry.code === '??') {
          untracked++;
        }
        // Check for conflicts
        if (workTreeStatus === 'U' || indexStatus === 'U') {
          conflicts++;
        }
      }

      return {
        branch: syncStatus.branch,
        ahead: syncStatus.ahead,
        behind: syncStatus.behind,
        hasRemote: syncStatus.has_remote,
        remote: syncStatus.remote,
        staged,
        modified,
        untracked,
        conflicts,
        clean: staged === 0 && modified === 0 && untracked === 0 && conflicts === 0
      };
    } catch (error) {
      console.debug('Failed to get git status:', error);
      return {
        staged: 0,
        modified: 0,
        untracked: 0,
        conflicts: 0,
        clean: true
      };
    }
  }

  // Get current branch name
  async getCurrentBranch(): Promise<string | null> {
    if (!this.workspacePath) return null;

    try {
      const branch = await invoke<string>('git_get_current_branch', { path: this.workspacePath });
      return branch;
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return null;
    }
  }

  // Get commit info
  async getCommitInfo(): Promise<{ hash: string; message: string; author: string; date: string } | null> {
    if (!this.workspacePath) return null;

    try {
      const commit = await invoke<{ hash: string; message: string; author: string; date: string }>('git_get_commit_info', { path: this.workspacePath });
      return commit;
    } catch (error) {
      console.error('Failed to get commit info:', error);
      return null;
    }
  }

  // Stage all changes
  async stageAll(): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_stage_all', { path: this.workspacePath });
      return true;
    } catch (error) {
      console.error('Failed to stage all changes:', error);
      return false;
    }
  }

  // Unstage all changes
  async unstageAll(): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_unstage_all', { path: this.workspacePath });
      return true;
    } catch (error) {
      console.error('Failed to unstage all changes:', error);
      return false;
    }
  }

  // Commit changes
  async commit(message: string): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_commit', { path: this.workspacePath, message, stageAll: true });
      return true;
    } catch (error) {
      console.error('Failed to commit changes:', error);
      return false;
    }
  }

  // Pull changes from remote
  async pull(): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_pull', { path: this.workspacePath, remote: null, branch: null });
      return true;
    } catch (error) {
      console.error('Failed to pull changes:', error);
      return false;
    }
  }

  // Push changes to remote
  async push(): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_push', { path: this.workspacePath, remote: null, branch: null });
      return true;
    } catch (error) {
      console.error('Failed to push changes:', error);
      return false;
    }
  }

  // Create a new branch
  async createBranch(branchName: string): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_create_branch', { path: this.workspacePath, branchName });
      return true;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  // Switch to a branch
  async switchBranch(branchName: string): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await invoke('git_switch_branch', { path: this.workspacePath, branchName });
      return true;
    } catch (error) {
      console.error('Failed to switch branch:', error);
      return false;
    }
  }

  // Get list of branches
  async getBranches(): Promise<string[]> {
    if (!this.workspacePath) return [];

    try {
      const branches = await invoke<string[]>('git_get_branches', { path: this.workspacePath });
      return branches;
    } catch (error) {
      console.error('Failed to get branches:', error);
      return [];
    }
  }

  // Update workspace path
  setWorkspacePath(path: string) {
    this.workspacePath = path;
  }
}

// Create a singleton instance
let gitServiceInstance: GitService | null = null;

export const getGitService = (workspacePath?: string): GitService => {
  if (!gitServiceInstance || workspacePath) {
    gitServiceInstance = new GitService(workspacePath);
  }
  return gitServiceInstance;
};
