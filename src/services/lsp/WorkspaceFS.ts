/**
 * Workspace File System Abstraction for LSP
 * Provides file system operations needed by LSP clients
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * File content and metadata
 */
export interface FileInfo {
  uri: string;
  content: string;
  languageId: string;
  version: number;
}

/**
 * Directory entry
 */
export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

/**
 * Workspace File System
 * Provides LSP-compatible file system operations
 */
export class WorkspaceFS {
  private rootPath: string | null = null;
  private openFiles = new Map<string, FileInfo>();

  /**
   * Set the workspace root path
   */
  setRootPath(path: string): void {
    this.rootPath = path;
  }

  /**
   * Get the workspace root path
   */
  getRootPath(): string | null {
    return this.rootPath;
  }

  /**
   * Convert file path to URI
   */
  pathToUri(path: string): string {
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, '/');

    // If path is already a URI, return it
    if (normalizedPath.startsWith('file://')) {
      return normalizedPath;
    }

    // Convert to file:// URI
    return `file://${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  }

  /**
   * Convert URI to file path
   */
  uriToPath(uri: string): string {
    if (uri.startsWith('file://')) {
      let path = uri.substring(7); // Remove 'file://'

      // Handle Windows paths (file:///C:/...)
      if (path.startsWith('/') && path[2] === ':') {
        path = path.substring(1);
      }

      return path;
    }

    return uri;
  }

  /**
   * Read file content
   */
  async readFile(uri: string): Promise<string> {
    const path = this.uriToPath(uri);

    try {
      const content = await invoke<string>('get_file_content', { path });
      return content;
    } catch (error) {
      console.error(`[WorkspaceFS] Error reading file: ${path}`, error);
      throw error;
    }
  }

  /**
   * Write file content
   */
  async writeFile(uri: string, content: string): Promise<void> {
    const path = this.uriToPath(uri);

    try {
      await invoke('save_file_content', { path, content });
    } catch (error) {
      console.error(`[WorkspaceFS] Error writing file: ${path}`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async exists(uri: string): Promise<boolean> {
    const path = this.uriToPath(uri);

    try {
      await invoke('get_file_content', { path });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List directory contents
   */
  async readDirectory(uri: string): Promise<DirectoryEntry[]> {
    const path = this.uriToPath(uri);

    try {
      // Note: This assumes a Tauri command exists for directory listing
      // If not, this would need to be implemented in the Rust backend
      const entries = await invoke<DirectoryEntry[]>('list_directory', { path });
      return entries;
    } catch (error) {
      console.error(`[WorkspaceFS] Error reading directory: ${path}`, error);
      return [];
    }
  }

  /**
   * Track an open file
   */
  trackOpenFile(uri: string, content: string, languageId: string, version: number = 1): void {
    this.openFiles.set(uri, {
      uri,
      content,
      languageId,
      version,
    });
  }

  /**
   * Update file content and version
   */
  updateFileContent(uri: string, content: string, version?: number): void {
    const fileInfo = this.openFiles.get(uri);
    if (fileInfo) {
      fileInfo.content = content;
      fileInfo.version = version ?? fileInfo.version + 1;
    } else {
      console.warn(`[WorkspaceFS] Attempting to update untracked file: ${uri}`);
    }
  }

  /**
   * Stop tracking a file
   */
  untrackFile(uri: string): void {
    this.openFiles.delete(uri);
  }

  /**
   * Get file info for an open file
   */
  getFileInfo(uri: string): FileInfo | null {
    return this.openFiles.get(uri) || null;
  }

  /**
   * Get all open files
   */
  getOpenFiles(): FileInfo[] {
    return Array.from(this.openFiles.values());
  }

  /**
   * Determine language ID from file path
   */
  getLanguageIdFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      // TypeScript/JavaScript
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'mjs': 'javascript',
      'cjs': 'javascript',

      // Python
      'py': 'python',
      'pyi': 'python',
      'pyw': 'python',

      // Rust
      'rs': 'rust',

      // Go
      'go': 'go',

      // Java
      'java': 'java',

      // C/C++
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'hh': 'cpp',
      'hxx': 'cpp',

      // C#
      'cs': 'csharp',

      // Web
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',

      // Markdown
      'md': 'markdown',
      'markdown': 'markdown',

      // Shell
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',

      // Others
      'sql': 'sql',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'kts': 'kotlin',
    };

    return languageMap[ext || ''] || 'plaintext';
  }

  /**
   * Resolve relative path against workspace root
   */
  resolvePath(relativePath: string): string | null {
    if (!this.rootPath) {
      return null;
    }

    // Normalize separators
    const normalizedRelative = relativePath.replace(/\\/g, '/');
    const normalizedRoot = this.rootPath.replace(/\\/g, '/');

    // Join paths
    const joined = normalizedRoot.endsWith('/')
      ? normalizedRoot + normalizedRelative
      : normalizedRoot + '/' + normalizedRelative;

    return joined;
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(absolutePath: string): string | null {
    if (!this.rootPath) {
      return null;
    }

    const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
    const normalizedRoot = this.rootPath.replace(/\\/g, '/');

    if (normalizedAbsolute.startsWith(normalizedRoot)) {
      return normalizedAbsolute.substring(normalizedRoot.length).replace(/^\//, '');
    }

    return null;
  }
}

/**
 * Global workspace file system instance
 */
let workspaceFS: WorkspaceFS | null = null;

/**
 * Get the workspace file system singleton
 */
export function getWorkspaceFS(): WorkspaceFS {
  if (!workspaceFS) {
    workspaceFS = new WorkspaceFS();
  }
  return workspaceFS;
}

/**
 * Initialize workspace file system with root path
 */
export function initializeWorkspaceFS(rootPath: string): WorkspaceFS {
  const fs = getWorkspaceFS();
  fs.setRootPath(rootPath);
  return fs;
}
