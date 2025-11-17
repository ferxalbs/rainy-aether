/**
 * Language display name mappings for Monaco Editor
 * Used across the IDE for consistent language name display
 */
export const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  javascriptreact: 'JavaScript React',
  typescriptreact: 'TypeScript React',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  markdown: 'Markdown',
  rust: 'Rust',
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML',
  sql: 'SQL',
  python: 'Python',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  php: 'PHP',
  go: 'Go',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  plaintext: 'Plain Text',
  shell: 'Shell Script',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  vue: 'Vue',
  svelte: 'Svelte',
  dart: 'Dart',
  r: 'R',
  julia: 'Julia',
  scala: 'Scala',
  clojure: 'Clojure',
  elixir: 'Elixir',
  haskell: 'Haskell',
  lua: 'Lua',
  perl: 'Perl',
  'objective-c': 'Objective-C',
} as const;

/**
 * Get display name for a language ID
 */
export function getLanguageDisplayName(languageId: string): string {
  return LANGUAGE_DISPLAY_MAP[languageId] ||
         languageId.charAt(0).toUpperCase() + languageId.slice(1);
}
