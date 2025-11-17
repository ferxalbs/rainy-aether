/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  id: string;
  label: string;
  description: string;
  keys: string[]; // Multiple key combinations per platform
  category: string;
  when?: string; // Context when shortcut is active
}

/**
 * Help documentation link
 */
export interface DocumentationLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
}

/**
 * Application information
 */
export interface AppInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository: string;
  homepage: string;
  electron_version?: string;
  chrome_version?: string;
  node_version?: string;
  v8_version?: string;
  os: string;
  arch: string;
}

/**
 * Command definition for command palette
 */
export interface Command {
  id: string;
  label: string;
  description?: string;
  category: string;
  keybinding?: string;
}

/**
 * System information
 */
export interface SystemInfo {
  os: string;
  os_version: string;
  arch: string;
  hostname: string;
  cpu_count: number;
  total_memory: number;
}
