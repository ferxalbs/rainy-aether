import React, { useEffect, useState } from 'react';
import { getCurrentTheme, getAllThemes, setCurrentTheme } from '@/stores/themeStore';
import { SelectGroup } from '@/components/ui/statusbar-select';
import { cn } from '@/lib/cn';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export function ThemeSelector({ isOpen, onClose, triggerRef }: ThemeSelectorProps) {
  const currentTheme = getCurrentTheme();
  const allThemes = getAllThemes();
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 240,
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

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-selector="popover"]') &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  // Group themes by mode (day/night)
  const dayThemes = allThemes.filter((t) => t.mode === 'day');
  const nightThemes = allThemes.filter((t) => t.mode === 'night');

  // Convert themes to SelectGroup format with theme preview as icon
  const groupedThemes: SelectGroup[] = [];

  if (dayThemes.length > 0) {
    groupedThemes.push({
      label: `Light Themes (${dayThemes.length})`,
      options: dayThemes.map((theme) => ({
        id: theme.name,
        name: theme.displayName,
        icon: <ThemePreview theme={theme} />,
      })),
    });
  }

  if (nightThemes.length > 0) {
    groupedThemes.push({
      label: `Dark Themes (${nightThemes.length})`,
      options: nightThemes.map((theme) => ({
        id: theme.name,
        name: theme.displayName,
        icon: <ThemePreview theme={theme} />,
      })),
    });
  }

  const handleThemeSelect = async (themeId: string) => {
    const selectedTheme = allThemes.find((t) => t.name === themeId);
    if (selectedTheme) {
      await setCurrentTheme(selectedTheme);
    }
  };

  return (
    <div
      data-selector="popover"
      className={cn(
        'fixed z-50 rounded-md shadow-lg border',
        'bg-background border-border',
        'overflow-hidden'
      )}
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        width: '280px',
        maxHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border shrink-0 bg-muted/30">
        <h3 className="text-xs font-semibold text-foreground">Color Theme</h3>
      </div>

      {/* Themes List */}
      <div className="flex-1 overflow-y-auto">
        {groupedThemes.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted-foreground text-xs">
            No themes available
          </div>
        ) : (
          <div className="py-1">
            {groupedThemes.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </div>
                {group.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleThemeSelect(option.id)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left transition-colors text-xs',
                      'hover:bg-accent/50 hover:text-accent-foreground',
                      'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                      'flex items-center gap-2',
                      currentTheme.name === option.id && 'bg-primary/10 text-primary'
                    )}
                  >
                    {option.icon}
                    <span className="flex-1 font-medium truncate">{option.name}</span>
                    {currentTheme.name === option.id && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ThemePreviewProps {
  theme: any;
}

function ThemePreview({ theme }: ThemePreviewProps) {
  // Get color preview from theme variables
  const bgColor = theme.variables?.['--bg-primary'] || theme.colors?.background || '#1e1e1e';
  const primaryColor = theme.variables?.['--accent-primary'] || theme.colors?.primary || '#007acc';
  const accentColor = theme.variables?.['--accent-secondary'] || theme.colors?.accent || '#094771';

  return (
    <div className="shrink-0 w-4 h-4 rounded border border-border overflow-hidden">
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
        <div className="col-span-2" style={{ backgroundColor: bgColor }}></div>
        <div style={{ backgroundColor: primaryColor }}></div>
        <div style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  );
}
