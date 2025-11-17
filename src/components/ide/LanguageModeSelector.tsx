import React from 'react';
import { StatusBarSelect, SelectGroup } from '@/components/ui/statusbar-select';

interface LanguageModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentLanguage: string;
  onLanguageChange: (languageId: string) => void;
}

// Auto detect icon component
const AutoDetectIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

// Language categories for better organization
const LANGUAGE_GROUPS: SelectGroup[] = [
  {
    label: 'Auto Detection',
    options: [
      {
        id: 'auto',
        name: 'Auto Detect',
        description: 'Detect language from file extension',
        icon: <AutoDetectIcon />,
      },
    ],
  },
  {
    label: 'Web Development',
    options: [
      { id: 'javascript', name: 'JavaScript', description: '.js, .mjs, .cjs' },
      { id: 'typescript', name: 'TypeScript', description: '.ts' },
      { id: 'javascriptreact', name: 'JavaScript React', description: '.jsx' },
      { id: 'typescriptreact', name: 'TypeScript React', description: '.tsx' },
      { id: 'html', name: 'HTML', description: '.html, .htm' },
      { id: 'css', name: 'CSS', description: '.css' },
      { id: 'scss', name: 'SCSS', description: '.scss' },
      { id: 'less', name: 'Less', description: '.less' },
      { id: 'vue', name: 'Vue', description: '.vue' },
      { id: 'svelte', name: 'Svelte', description: '.svelte' },
    ],
  },
  {
    label: 'System Programming',
    options: [
      { id: 'rust', name: 'Rust', description: '.rs' },
      { id: 'go', name: 'Go', description: '.go' },
      { id: 'cpp', name: 'C++', description: '.cpp, .cc, .cxx, .hpp, .h' },
      { id: 'c', name: 'C', description: '.c, .h' },
      { id: 'csharp', name: 'C#', description: '.cs' },
      { id: 'swift', name: 'Swift', description: '.swift' },
      { id: 'kotlin', name: 'Kotlin', description: '.kt, .kts' },
      { id: 'objective-c', name: 'Objective-C', description: '.m, .mm' },
    ],
  },
  {
    label: 'General Purpose',
    options: [
      { id: 'python', name: 'Python', description: '.py, .pyw' },
      { id: 'java', name: 'Java', description: '.java' },
      { id: 'php', name: 'PHP', description: '.php' },
      { id: 'ruby', name: 'Ruby', description: '.rb' },
      { id: 'perl', name: 'Perl', description: '.pl, .pm' },
      { id: 'lua', name: 'Lua', description: '.lua' },
      { id: 'r', name: 'R', description: '.r, .R' },
      { id: 'julia', name: 'Julia', description: '.jl' },
      { id: 'dart', name: 'Dart', description: '.dart' },
    ],
  },
  {
    label: 'Functional Programming',
    options: [
      { id: 'scala', name: 'Scala', description: '.scala' },
      { id: 'clojure', name: 'Clojure', description: '.clj, .cljs' },
      { id: 'elixir', name: 'Elixir', description: '.ex, .exs' },
      { id: 'haskell', name: 'Haskell', description: '.hs' },
    ],
  },
  {
    label: 'Data & Markup',
    options: [
      { id: 'json', name: 'JSON', description: '.json, .jsonc' },
      { id: 'xml', name: 'XML', description: '.xml' },
      { id: 'yaml', name: 'YAML', description: '.yaml, .yml' },
      { id: 'toml', name: 'TOML', description: '.toml' },
      { id: 'ini', name: 'INI', description: '.ini, .cfg' },
      { id: 'markdown', name: 'Markdown', description: '.md, .markdown' },
      { id: 'graphql', name: 'GraphQL', description: '.graphql, .gql' },
    ],
  },
  {
    label: 'Database',
    options: [
      { id: 'sql', name: 'SQL', description: '.sql' },
    ],
  },
  {
    label: 'Shell & Scripting',
    options: [
      { id: 'shell', name: 'Shell Script', description: '.sh, .bash, .zsh' },
      { id: 'powershell', name: 'PowerShell', description: '.ps1, .psm1' },
      { id: 'dockerfile', name: 'Dockerfile', description: 'Dockerfile' },
    ],
  },
  {
    label: 'Other',
    options: [
      { id: 'plaintext', name: 'Plain Text', description: '.txt' },
    ],
  },
];

export function LanguageModeSelector({
  isOpen,
  onClose,
  triggerRef,
  currentLanguage,
  onLanguageChange,
}: LanguageModeSelectorProps) {
  return (
    <StatusBarSelect
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      options={LANGUAGE_GROUPS}
      selectedId={currentLanguage.toLowerCase()}
      onSelect={onLanguageChange}
      title="Select Language Mode"
      placeholder="Search languages..."
      searchable={true}
      grouped={true}
    />
  );
}
