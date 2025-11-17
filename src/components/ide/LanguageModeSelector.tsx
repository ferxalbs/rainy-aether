import React from 'react';
import { StatusBarSelect, SelectOption } from '@/components/ui/statusbar-select';

interface LanguageModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentLanguage: string;
  onLanguageChange: (languageId: string) => void;
}

// Common programming languages supported by Monaco
const LANGUAGE_OPTIONS: SelectOption[] = [
  { id: 'plaintext', name: 'Plain Text', description: '.txt' },
  { id: 'javascript', name: 'JavaScript', description: '.js, .mjs, .cjs' },
  { id: 'typescript', name: 'TypeScript', description: '.ts' },
  { id: 'javascriptreact', name: 'JavaScript React', description: '.jsx' },
  { id: 'typescriptreact', name: 'TypeScript React', description: '.tsx' },
  { id: 'json', name: 'JSON', description: '.json, .jsonc' },
  { id: 'html', name: 'HTML', description: '.html, .htm' },
  { id: 'css', name: 'CSS', description: '.css' },
  { id: 'scss', name: 'SCSS', description: '.scss' },
  { id: 'less', name: 'Less', description: '.less' },
  { id: 'markdown', name: 'Markdown', description: '.md, .markdown' },
  { id: 'python', name: 'Python', description: '.py, .pyw' },
  { id: 'rust', name: 'Rust', description: '.rs' },
  { id: 'go', name: 'Go', description: '.go' },
  { id: 'java', name: 'Java', description: '.java' },
  { id: 'csharp', name: 'C#', description: '.cs' },
  { id: 'cpp', name: 'C++', description: '.cpp, .cc, .cxx, .hpp, .h' },
  { id: 'c', name: 'C', description: '.c, .h' },
  { id: 'php', name: 'PHP', description: '.php' },
  { id: 'ruby', name: 'Ruby', description: '.rb' },
  { id: 'swift', name: 'Swift', description: '.swift' },
  { id: 'kotlin', name: 'Kotlin', description: '.kt, .kts' },
  { id: 'sql', name: 'SQL', description: '.sql' },
  { id: 'xml', name: 'XML', description: '.xml' },
  { id: 'yaml', name: 'YAML', description: '.yaml, .yml' },
  { id: 'toml', name: 'TOML', description: '.toml' },
  { id: 'ini', name: 'INI', description: '.ini, .cfg' },
  { id: 'shell', name: 'Shell Script', description: '.sh, .bash, .zsh' },
  { id: 'powershell', name: 'PowerShell', description: '.ps1, .psm1' },
  { id: 'dockerfile', name: 'Dockerfile', description: 'Dockerfile' },
  { id: 'graphql', name: 'GraphQL', description: '.graphql, .gql' },
  { id: 'vue', name: 'Vue', description: '.vue' },
  { id: 'svelte', name: 'Svelte', description: '.svelte' },
  { id: 'dart', name: 'Dart', description: '.dart' },
  { id: 'r', name: 'R', description: '.r, .R' },
  { id: 'julia', name: 'Julia', description: '.jl' },
  { id: 'scala', name: 'Scala', description: '.scala' },
  { id: 'clojure', name: 'Clojure', description: '.clj, .cljs' },
  { id: 'elixir', name: 'Elixir', description: '.ex, .exs' },
  { id: 'haskell', name: 'Haskell', description: '.hs' },
  { id: 'lua', name: 'Lua', description: '.lua' },
  { id: 'perl', name: 'Perl', description: '.pl, .pm' },
  { id: 'objective-c', name: 'Objective-C', description: '.m, .mm' },
].sort((a, b) => a.name.localeCompare(b.name));

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
      options={LANGUAGE_OPTIONS}
      selectedId={currentLanguage.toLowerCase()}
      onSelect={onLanguageChange}
      title="Language Mode"
      placeholder="Search languages..."
      searchable={true}
      grouped={false}
    />
  );
}
