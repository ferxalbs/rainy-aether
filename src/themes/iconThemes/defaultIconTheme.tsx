/**
 * Default Icon Theme
 *
 * Built-in icon theme using Lucide icons with color coding.
 * Provides a comprehensive set of icons for common file types and folders.
 */

import { IconTheme } from '@/stores/iconThemeStore';
import {
  File,
  FileCode,
  FileJson,
  FileText,
  Image,
  Folder,
  FolderOpen,
  FolderCode,
  FolderGit,
  Package,
  Settings,
  Database,
  Lock,
  Globe,
} from 'lucide-react';
import React from 'react';

/**
 * Create a colored icon component
 */
const createColoredIcon = (Icon: React.ComponentType<any>, color: string) => {
  return ({ size = 16, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
    <Icon size={size} className={className} style={{ color, ...style }} />
  );
};

/**
 * Default icon theme with Lucide icons
 */
export const defaultIconTheme: IconTheme = {
  id: 'rainy-default',
  label: 'Rainy Default',
  builtIn: true,
  iconDefinitions: {
    // Generic files
    file: File,
    'file-code': createColoredIcon(FileCode, '#3b82f6'),
    'file-json': createColoredIcon(FileJson, '#fbbf24'),
    'file-text': createColoredIcon(FileText, '#6b7280'),
    'file-image': createColoredIcon(Image, '#8b5cf6'),
    'file-config': createColoredIcon(Settings, '#6366f1'),
    'file-database': createColoredIcon(Database, '#10b981'),
    'file-lock': createColoredIcon(Lock, '#ef4444'),
    'file-web': createColoredIcon(Globe, '#06b6d4'),

    // Languages
    typescript: createColoredIcon(FileCode, '#3178c6'),
    javascript: createColoredIcon(FileCode, '#f7df1e'),
    react: createColoredIcon(FileCode, '#61dafb'),
    vue: createColoredIcon(FileCode, '#42b883'),
    python: createColoredIcon(FileCode, '#3776ab'),
    rust: createColoredIcon(FileCode, '#ce422b'),
    go: createColoredIcon(FileCode, '#00add8'),
    java: createColoredIcon(FileCode, '#f89820'),
    csharp: createColoredIcon(FileCode, '#239120'),
    php: createColoredIcon(FileCode, '#777bb4'),
    ruby: createColoredIcon(FileCode, '#cc342d'),
    swift: createColoredIcon(FileCode, '#fa7343'),
    kotlin: createColoredIcon(FileCode, '#7f52ff'),
    dart: createColoredIcon(FileCode, '#0175c2'),

    // Markup/Styles
    html: createColoredIcon(FileCode, '#e34f26'),
    css: createColoredIcon(FileCode, '#1572b6'),
    scss: createColoredIcon(FileCode, '#cc6699'),
    less: createColoredIcon(FileCode, '#1d365d'),
    markdown: createColoredIcon(FileText, '#083fa1'),

    // Data formats
    json: createColoredIcon(FileJson, '#fbbf24'),
    yaml: createColoredIcon(FileText, '#cb171e'),
    toml: createColoredIcon(FileText, '#9c4221'),
    xml: createColoredIcon(FileCode, '#e34f26'),

    // Config files
    config: createColoredIcon(Settings, '#6366f1'),
    env: createColoredIcon(Lock, '#ef4444'),

    // Package managers
    npm: createColoredIcon(Package, '#cb3837'),
    cargo: createColoredIcon(Package, '#ce422b'),

    // Folders
    folder: Folder,
    'folder-open': FolderOpen,
    'folder-src': createColoredIcon(FolderCode, '#3b82f6'),
    'folder-src-open': createColoredIcon(FolderCode, '#3b82f6'),
    'folder-dist': createColoredIcon(Folder, '#10b981'),
    'folder-dist-open': createColoredIcon(FolderOpen, '#10b981'),
    'folder-node': createColoredIcon(Folder, '#cb3837'),
    'folder-node-open': createColoredIcon(FolderOpen, '#cb3837'),
    'folder-git': createColoredIcon(FolderGit, '#f05032'),
    'folder-git-open': createColoredIcon(FolderGit, '#f05032'),
    'folder-public': createColoredIcon(Folder, '#8b5cf6'),
    'folder-public-open': createColoredIcon(FolderOpen, '#8b5cf6'),
    'folder-components': createColoredIcon(FolderCode, '#61dafb'),
    'folder-components-open': createColoredIcon(FolderCode, '#61dafb'),
  },
  associations: {
    fileExtensions: {
      // TypeScript
      ts: 'typescript',
      tsx: 'react',

      // JavaScript
      js: 'javascript',
      jsx: 'react',
      mjs: 'javascript',
      cjs: 'javascript',

      // Web
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'scss',
      less: 'less',

      // Data formats
      json: 'json',
      jsonc: 'json',
      json5: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      xml: 'xml',

      // Markdown
      md: 'markdown',
      markdown: 'markdown',
      mdx: 'markdown',

      // Programming languages
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      kts: 'kotlin',
      dart: 'dart',

      // Images
      png: 'file-image',
      jpg: 'file-image',
      jpeg: 'file-image',
      gif: 'file-image',
      svg: 'file-image',
      webp: 'file-image',
      ico: 'file-image',

      // Databases
      db: 'file-database',
      sqlite: 'file-database',
      sql: 'file-database',

      // Config
      env: 'env',
      ini: 'config',
      conf: 'config',
      config: 'config',

      // Misc
      txt: 'file-text',
      log: 'file-text',
    },
    fileNames: {
      'package.json': 'npm',
      'package-lock.json': 'npm',
      'yarn.lock': 'npm',
      'pnpm-lock.yaml': 'npm',
      'cargo.toml': 'cargo',
      'cargo.lock': 'cargo',
      '.env': 'env',
      '.env.local': 'env',
      '.env.development': 'env',
      '.env.production': 'env',
      '.gitignore': 'config',
      '.prettierrc': 'config',
      '.eslintrc': 'config',
      'tsconfig.json': 'typescript',
      'jsconfig.json': 'javascript',
      'vite.config.ts': 'config',
      'vite.config.js': 'config',
      'tailwind.config.js': 'config',
      'tailwind.config.ts': 'config',
      'readme.md': 'markdown',
      'README.md': 'markdown',
    },
    folderNames: {
      src: 'folder-src',
      dist: 'folder-dist',
      build: 'folder-dist',
      out: 'folder-dist',
      node_modules: 'folder-node',
      '.git': 'folder-git',
      public: 'folder-public',
      assets: 'folder-public',
      components: 'folder-components',
      '.vscode': 'folder-git',
      '.idea': 'folder-git',
    },
    folderNamesExpanded: {
      src: 'folder-src-open',
      dist: 'folder-dist-open',
      build: 'folder-dist-open',
      out: 'folder-dist-open',
      node_modules: 'folder-node-open',
      '.git': 'folder-git-open',
      public: 'folder-public-open',
      assets: 'folder-public-open',
      components: 'folder-components-open',
      '.vscode': 'folder-git-open',
      '.idea': 'folder-git-open',
    },
  },
  defaultFileIcon: 'file',
  defaultFolderIcon: 'folder',
  defaultFolderIconExpanded: 'folder-open',
};
