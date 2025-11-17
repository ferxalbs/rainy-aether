import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface LanguageModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentLanguage: string;
  onLanguageChange: (languageId: string) => void;
}

// Common programming languages supported by Monaco
const LANGUAGES = [
  { id: 'plaintext', name: 'Plain Text', extensions: ['.txt'] },
  { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.mjs', '.cjs'] },
  { id: 'typescript', name: 'TypeScript', extensions: ['.ts'] },
  { id: 'javascriptreact', name: 'JavaScript React', extensions: ['.jsx'] },
  { id: 'typescriptreact', name: 'TypeScript React', extensions: ['.tsx'] },
  { id: 'json', name: 'JSON', extensions: ['.json', '.jsonc'] },
  { id: 'html', name: 'HTML', extensions: ['.html', '.htm'] },
  { id: 'css', name: 'CSS', extensions: ['.css'] },
  { id: 'scss', name: 'SCSS', extensions: ['.scss'] },
  { id: 'less', name: 'Less', extensions: ['.less'] },
  { id: 'markdown', name: 'Markdown', extensions: ['.md', '.markdown'] },
  { id: 'python', name: 'Python', extensions: ['.py', '.pyw'] },
  { id: 'rust', name: 'Rust', extensions: ['.rs'] },
  { id: 'go', name: 'Go', extensions: ['.go'] },
  { id: 'java', name: 'Java', extensions: ['.java'] },
  { id: 'csharp', name: 'C#', extensions: ['.cs'] },
  { id: 'cpp', name: 'C++', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'] },
  { id: 'c', name: 'C', extensions: ['.c', '.h'] },
  { id: 'php', name: 'PHP', extensions: ['.php'] },
  { id: 'ruby', name: 'Ruby', extensions: ['.rb'] },
  { id: 'swift', name: 'Swift', extensions: ['.swift'] },
  { id: 'kotlin', name: 'Kotlin', extensions: ['.kt', '.kts'] },
  { id: 'sql', name: 'SQL', extensions: ['.sql'] },
  { id: 'xml', name: 'XML', extensions: ['.xml'] },
  { id: 'yaml', name: 'YAML', extensions: ['.yaml', '.yml'] },
  { id: 'toml', name: 'TOML', extensions: ['.toml'] },
  { id: 'ini', name: 'INI', extensions: ['.ini', '.cfg'] },
  { id: 'shell', name: 'Shell Script', extensions: ['.sh', '.bash', '.zsh'] },
  { id: 'powershell', name: 'PowerShell', extensions: ['.ps1', '.psm1'] },
  { id: 'dockerfile', name: 'Dockerfile', extensions: ['Dockerfile'] },
  { id: 'graphql', name: 'GraphQL', extensions: ['.graphql', '.gql'] },
  { id: 'vue', name: 'Vue', extensions: ['.vue'] },
  { id: 'svelte', name: 'Svelte', extensions: ['.svelte'] },
  { id: 'dart', name: 'Dart', extensions: ['.dart'] },
  { id: 'r', name: 'R', extensions: ['.r', '.R'] },
  { id: 'julia', name: 'Julia', extensions: ['.jl'] },
  { id: 'scala', name: 'Scala', extensions: ['.scala'] },
  { id: 'clojure', name: 'Clojure', extensions: ['.clj', '.cljs'] },
  { id: 'elixir', name: 'Elixir', extensions: ['.ex', '.exs'] },
  { id: 'haskell', name: 'Haskell', extensions: ['.hs'] },
  { id: 'lua', name: 'Lua', extensions: ['.lua'] },
  { id: 'perl', name: 'Perl', extensions: ['.pl', '.pm'] },
  { id: 'objective-c', name: 'Objective-C', extensions: ['.m', '.mm'] },
].sort((a, b) => a.name.localeCompare(b.name));

export function LanguageModeSelector({
  isOpen,
  onClose,
  triggerRef,
  currentLanguage,
  onLanguageChange,
}: LanguageModeSelectorProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 400, // Show above the statusbar
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, triggerRef]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter languages
  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.extensions.some((ext) => ext.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (languageId: string) => {
    onLanguageChange(languageId);
    onClose();
  };

  // Normalize language name for comparison
  const normalizeLanguageName = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z]/g, '');
  };

  const currentLanguageNormalized = normalizeLanguageName(currentLanguage);

  return (
    <div
      className={cn(
        'fixed z-[9999] w-96 rounded-lg shadow-2xl border',
        'bg-background border-border',
        'overflow-hidden flex flex-col max-h-96'
      )}
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Select Language Mode</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-1.5 text-sm rounded border',
              'bg-background border-border text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-primary'
            )}
            autoFocus
          />
        </div>
      </div>

      {/* Languages List */}
      <div className="flex-1 overflow-y-auto">
        {filteredLanguages.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No languages found
          </div>
        ) : (
          <div className="py-1">
            {filteredLanguages.map((language) => {
              const isActive =
                normalizeLanguageName(language.name) === currentLanguageNormalized ||
                language.id === currentLanguage.toLowerCase();

              return (
                <button
                  key={language.id}
                  onClick={() => handleSelect(language.id)}
                  className={cn(
                    'w-full px-4 py-2 text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'flex items-center justify-between',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{language.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {language.extensions.join(', ')}
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex-shrink-0 ml-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-medium text-foreground">{currentLanguage}</span>
        </p>
      </div>
    </div>
  );
}
