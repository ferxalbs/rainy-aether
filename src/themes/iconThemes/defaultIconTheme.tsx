/**
 * Default Icon Theme
 *
 * Built-in icon theme using Lucide icons with color coding.
 * Follows VS Code file icon theme structure.
 */

import { IconTheme, IconDefinition } from '@/stores/iconThemeStore';
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
  Lock,
} from 'lucide-react';
import React from 'react';

/**
 * Create a colored icon component wrapped in IconDefinition
 */
const createColoredIcon = (Icon: React.ComponentType<any>, color: string): IconDefinition => {
  const ColoredIcon = ({ size = 16, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
    <Icon size={size} className={className} style={{ color, ...style }} />
  );
  return { iconComponent: ColoredIcon };
};

/**
 * Wrap a Lucide icon in IconDefinition
 */
const wrapIcon = (Icon: React.ComponentType<any>): IconDefinition => ({
  iconComponent: Icon,
});

/**
 * Default icon theme - VS Code compatible structure
 */
export const defaultIconTheme: IconTheme = {
  id: 'rainy-default',
  label: 'Rainy Default',
  builtIn: true,

  // Icon definitions (all icons must be defined here)
  iconDefinitions: {
    // Default icons
    _file: wrapIcon(File),
    _folder: wrapIcon(Folder),
    _folder_open: wrapIcon(FolderOpen),

    // Languages
    _typescript: createColoredIcon(FileCode, '#3178c6'),
    _javascript: createColoredIcon(FileCode, '#f7df1e'),
    _react: createColoredIcon(FileCode, '#61dafb'),
    _python: createColoredIcon(FileCode, '#3776ab'),
    _rust: createColoredIcon(FileCode, '#ce422b'),
    _go: createColoredIcon(FileCode, '#00add8'),
    _java: createColoredIcon(FileCode, '#f89820'),
    _csharp: createColoredIcon(FileCode, '#239120'),
    _php: createColoredIcon(FileCode, '#777bb4'),
    _ruby: createColoredIcon(FileCode, '#cc342d'),
    _swift: createColoredIcon(FileCode, '#fa7343'),
    _kotlin: createColoredIcon(FileCode, '#7f52ff'),
    _dart: createColoredIcon(FileCode, '#0175c2'),

    // Web
    _html: createColoredIcon(FileCode, '#e34f26'),
    _css: createColoredIcon(FileCode, '#1572b6'),
    _scss: createColoredIcon(FileCode, '#cc6699'),
    _markdown: createColoredIcon(FileText, '#083fa1'),

    // Data
    _json: createColoredIcon(FileJson, '#fbbf24'),
    _yaml: createColoredIcon(FileText, '#cb171e'),
    _xml: createColoredIcon(FileCode, '#e34f26'),

    // Images
    _image: createColoredIcon(Image, '#8b5cf6'),

    // Config
    _config: createColoredIcon(Settings, '#6366f1'),
    _env: createColoredIcon(Lock, '#ef4444'),

    // Package managers
    _npm: createColoredIcon(Package, '#cb3837'),
    _cargo: createColoredIcon(Package, '#ce422b'),

    // Special folders
    _folder_src: createColoredIcon(FolderCode, '#3b82f6'),
    _folder_src_open: createColoredIcon(FolderCode, '#3b82f6'),
    _folder_dist: createColoredIcon(Folder, '#10b981'),
    _folder_dist_open: createColoredIcon(FolderOpen, '#10b981'),
    _folder_node: createColoredIcon(Folder, '#cb3837'),
    _folder_node_open: createColoredIcon(FolderOpen, '#cb3837'),
    _folder_git: createColoredIcon(FolderGit, '#f05032'),
    _folder_git_open: createColoredIcon(FolderGit, '#f05032'),
    _folder_public: createColoredIcon(Folder, '#8b5cf6'),
    _folder_public_open: createColoredIcon(FolderOpen, '#8b5cf6'),
    _folder_components: createColoredIcon(FolderCode, '#61dafb'),
    _folder_components_open: createColoredIcon(FolderCode, '#61dafb'),
  },

  // Default icons (references to iconDefinitions)
  file: '_file',
  folder: '_folder',
  folderExpanded: '_folder_open',

  // File extension associations
  fileExtensions: {
    // TypeScript
    ts: '_typescript',
    tsx: '_react',
    'd.ts': '_typescript',

    // JavaScript
    js: '_javascript',
    jsx: '_react',
    mjs: '_javascript',
    cjs: '_javascript',

    // Web
    html: '_html',
    htm: '_html',
    css: '_css',
    scss: '_scss',
    sass: '_scss',
    less: '_scss',

    // Data
    json: '_json',
    jsonc: '_json',
    json5: '_json',
    yaml: '_yaml',
    yml: '_yaml',
    xml: '_xml',

    // Markdown
    md: '_markdown',
    markdown: '_markdown',
    mdx: '_markdown',

    // Programming languages
    py: '_python',
    rs: '_rust',
    go: '_go',
    java: '_java',
    cs: '_csharp',
    php: '_php',
    rb: '_ruby',
    swift: '_swift',
    kt: '_kotlin',
    kts: '_kotlin',
    dart: '_dart',

    // Images
    png: '_image',
    jpg: '_image',
    jpeg: '_image',
    gif: '_image',
    svg: '_image',
    webp: '_image',
    ico: '_image',

    // Config
    env: '_env',
    ini: '_config',
    conf: '_config',
    config: '_config',

    // Misc
    txt: '_file',
    log: '_file',
  },

  // File name associations
  fileNames: {
    'package.json': '_npm',
    'package-lock.json': '_npm',
    'yarn.lock': '_npm',
    'pnpm-lock.yaml': '_npm',
    'cargo.toml': '_cargo',
    'cargo.lock': '_cargo',
    '.env': '_env',
    '.env.local': '_env',
    '.env.development': '_env',
    '.env.production': '_env',
    '.gitignore': '_config',
    '.prettierrc': '_config',
    '.eslintrc': '_config',
    'tsconfig.json': '_typescript',
    'jsconfig.json': '_javascript',
    'vite.config.ts': '_config',
    'vite.config.js': '_config',
    'tailwind.config.js': '_config',
    'tailwind.config.ts': '_config',
    'readme.md': '_markdown',
    'README.md': '_markdown',
  },

  // Folder name associations (collapsed)
  folderNames: {
    src: '_folder_src',
    dist: '_folder_dist',
    build: '_folder_dist',
    out: '_folder_dist',
    node_modules: '_folder_node',
    '.git': '_folder_git',
    public: '_folder_public',
    assets: '_folder_public',
    components: '_folder_components',
    '.vscode': '_folder_git',
    '.idea': '_folder_git',
  },

  // Folder name associations (expanded)
  folderNamesExpanded: {
    src: '_folder_src_open',
    dist: '_folder_dist_open',
    build: '_folder_dist_open',
    out: '_folder_dist_open',
    node_modules: '_folder_node_open',
    '.git': '_folder_git_open',
    public: '_folder_public_open',
    assets: '_folder_public_open',
    components: '_folder_components_open',
    '.vscode': '_folder_git_open',
    '.idea': '_folder_git_open',
  },
};
