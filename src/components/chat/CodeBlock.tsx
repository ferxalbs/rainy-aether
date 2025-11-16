/**
 * CodeBlock Component
 *
 * Syntax-highlighted code block with interactive actions:
 * - Copy to clipboard
 * - Insert at cursor (optional)
 * - Run code (future)
 * - Save as file (future)
 *
 * Supports 50+ languages via react-syntax-highlighter with:
 * - Line numbers
 * - Copy feedback
 * - Theme integration
 * - Language badge
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   language="typescript"
 *   code="const x = 42;"
 *   showCopyButton={true}
 *   onInsert={(code) => editor.insert(code)}
 * />
 * ```
 */

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Button } from '@/components/ui/button';
import { Check, Copy, CornerDownRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Props for CodeBlock component
 */
export interface CodeBlockProps {
  /** Programming language */
  language: string;

  /** Code content */
  code: string;

  /** Show copy button */
  showCopyButton?: boolean;

  /** Show insert button */
  showInsertButton?: boolean;

  /** Callback when code is inserted */
  onInsert?: (code: string, language: string) => void;

  /** Additional CSS classes */
  className?: string;

  /** Show line numbers */
  showLineNumbers?: boolean;

  /** Custom theme (defaults to VS Code Dark+) */
  customStyle?: Record<string, any>;
}

/**
 * Language display names mapping
 */
const languageNames: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  js: 'JavaScript',
  jsx: 'JavaScript React',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  scala: 'Scala',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  ps1: 'PowerShell',
  yaml: 'YAML',
  yml: 'YAML',
  json: 'JSON',
  xml: 'XML',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  md: 'Markdown',
  tex: 'LaTeX',
  r: 'R',
  matlab: 'MATLAB',
  julia: 'Julia',
  haskell: 'Haskell',
  elixir: 'Elixir',
  erlang: 'Erlang',
  clojure: 'Clojure',
  lua: 'Lua',
  perl: 'Perl',
  vim: 'Vim Script',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  toml: 'TOML',
  ini: 'INI',
};

/**
 * Get display name for a language
 */
function getLanguageName(language: string): string {
  return languageNames[language.toLowerCase()] || language.toUpperCase();
}

/**
 * CodeBlock component
 */
export function CodeBlock({
  language,
  code,
  showCopyButton = true,
  showInsertButton = false,
  onInsert,
  className,
  showLineNumbers = true,
  customStyle,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Copy code to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  /**
   * Insert code at cursor
   */
  const handleInsert = () => {
    onInsert?.(code, language);
  };

  return (
    <div className={cn('code-block group relative my-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border border-border rounded-t-md">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {getLanguageName(language)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showInsertButton && onInsert && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInsert}
              className="h-7 px-2 text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <CornerDownRight className="size-3" />
              Insert
            </Button>
          )}

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={cn(
                'h-7 px-2 text-xs gap-1.5 transition-all',
                copied
                  ? 'text-green-500 hover:text-green-600'
                  : 'opacity-0 group-hover:opacity-100'
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div className="relative overflow-x-auto border-x border-b border-border rounded-b-md">
        <SyntaxHighlighter
          language={language}
          style={customStyle || vscDarkPlus}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            background: '#1e1e1e',
            borderRadius: 0,
          }}
          codeTagProps={{
            style: {
              fontFamily:
                '"Fira Code", "Cascadia Code", "JetBrains Mono", "SF Mono", Monaco, "Courier New", monospace',
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
