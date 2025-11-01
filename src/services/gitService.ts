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

  // Get current git status
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
      const status = await invoke<GitStatus>('git_get_status', { path: this.workspacePath });
      return status;
    } catch (error) {
      console.error('Failed to get git status:', error);
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
