import React, { useEffect, useState } from 'react';
import { getCurrentTheme, getAllThemes, setCurrentTheme } from '@/stores/themeStore';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export function ThemeSelector({ isOpen, onClose, triggerRef }: ThemeSelectorProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const currentTheme = getCurrentTheme();
  const allThemes = getAllThemes();

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

  // Filter themes by search query
  const filteredThemes = allThemes.filter((theme) =>
    theme.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group themes by mode (day/night)
  const dayThemes = filteredThemes.filter((t) => t.mode === 'day');
  const nightThemes = filteredThemes.filter((t) => t.mode === 'night');

  const handleThemeSelect = async (theme: any) => {
    await setCurrentTheme(theme);
    onClose();
  };

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
          <h3 className="text-sm font-semibold text-foreground">Select Color Theme</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-muted p-1"
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
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
          <Input
            type="text"
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
            autoFocus
          />
        </div>
      </div>

      {/* Themes List */}
      <ScrollArea className="flex-1 h-[300px]">
        {filteredThemes.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No themes found
          </div>
        ) : (
          <div>
            {/* Day Themes */}
            {dayThemes.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  Light Themes
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {dayThemes.length}
                  </Badge>
                </div>
                {dayThemes.map((theme) => (
                  <ThemeItem
                    key={theme.name}
                    theme={theme}
                    isActive={currentTheme.name === theme.name}
                    onClick={() => handleThemeSelect(theme)}
                  />
                ))}
              </div>
            )}

            {/* Night Themes */}
            {nightThemes.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  Dark Themes
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {nightThemes.length}
                  </Badge>
                </div>
                {nightThemes.map((theme) => (
                  <ThemeItem
                    key={theme.name}
                    theme={theme}
                    isActive={currentTheme.name === theme.name}
                    onClick={() => handleThemeSelect(theme)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex-shrink-0 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredThemes.length} theme{filteredThemes.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 text-xs bg-muted border border-border rounded font-mono">Esc</kbd>{' '}
          to close
        </p>
      </div>
    </div>
  );
}

interface ThemeItemProps {
  theme: any; // Using any for now, should be Theme type from themeStore
  isActive: boolean;
  onClick: () => void;
}

function ThemeItem({ theme, isActive, onClick }: ThemeItemProps) {
  // Get color preview from theme variables
  const bgColor = theme.variables?.['--bg-primary'] || theme.colors?.background || '#1e1e1e';
  const primaryColor = theme.variables?.['--accent-primary'] || theme.colors?.primary || '#007acc';
  const accentColor = theme.variables?.['--accent-secondary'] || theme.colors?.accent || '#094771';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2 text-left transition-all duration-150',
        'hover:bg-accent hover:text-accent-foreground',
        'flex items-center justify-between group',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
        isActive && 'bg-accent text-accent-foreground'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Color Preview */}
        <div className="flex-shrink-0 w-7 h-7 rounded-md border border-border overflow-hidden shadow-sm ring-1 ring-black/5">
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px]">
            <div
              className="col-span-2"
              style={{ backgroundColor: bgColor }}
            ></div>
            <div style={{ backgroundColor: primaryColor }}></div>
            <div style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>

        {/* Theme Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {theme.displayName}
            {theme.source === 'extension' && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Extension
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="flex-shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
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
}
