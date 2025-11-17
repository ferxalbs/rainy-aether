import React, { useEffect, useState } from 'react';
import { getCurrentTheme, getAllThemes, setCurrentTheme } from '@/stores/themeStore';
import { cn } from '@/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckIcon } from '@radix-ui/react-icons';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export function ThemeSelector({ isOpen, onClose, triggerRef }: ThemeSelectorProps) {
  const currentTheme = getCurrentTheme();
  const allThemes = getAllThemes();
  const [search, setSearch] = useState('');

  // Reset search when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // Group themes by mode (day/night)
  const dayThemes = allThemes.filter((t) => t.mode === 'day');
  const nightThemes = allThemes.filter((t) => t.mode === 'night');

  const handleThemeSelect = async (themeId: string) => {
    const selectedTheme = allThemes.find((t) => t.name === themeId);
    if (selectedTheme) {
      await setCurrentTheme(selectedTheme);
      onClose();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      {/* Invisible trigger positioned at the status bar item */}
      <PopoverTrigger asChild>
        <div
          className="absolute"
          style={{
            left: triggerRef.current?.getBoundingClientRect().left || 0,
            top: triggerRef.current?.getBoundingClientRect().top || 0,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className={cn("w-[340px] p-0 shadow-xl border-border/50")}
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
      >
        <Command className="rounded-lg">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border bg-muted/20">
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Color Theme
            </h3>
          </div>

          {/* Search */}
          <CommandInput
            placeholder="Search themes..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />

          {/* Themes List */}
          <CommandList>
            <CommandEmpty>No themes found.</CommandEmpty>

            {/* Light Themes */}
            {dayThemes.length > 0 && (
              <CommandGroup heading={`Light Themes (${dayThemes.length})`}>
                {dayThemes.map((theme) => (
                  <CommandItem
                    key={theme.name}
                    value={theme.displayName}
                    onSelect={() => handleThemeSelect(theme.name)}
                    className="gap-2"
                  >
                    <ThemePreview theme={theme} />
                    <span className="flex-1 font-medium truncate text-xs">
                      {theme.displayName}
                    </span>
                    {currentTheme.name === theme.name && (
                      <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Dark Themes */}
            {nightThemes.length > 0 && (
              <CommandGroup heading={`Dark Themes (${nightThemes.length})`}>
                {nightThemes.map((theme) => (
                  <CommandItem
                    key={theme.name}
                    value={theme.displayName}
                    onSelect={() => handleThemeSelect(theme.name)}
                    className="gap-2"
                  >
                    <ThemePreview theme={theme} />
                    <span className="flex-1 font-medium truncate text-xs">
                      {theme.displayName}
                    </span>
                    {currentTheme.name === theme.name && (
                      <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
    <div className="shrink-0 w-4 h-4 rounded border border-border/50 overflow-hidden shadow-sm">
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
        <div className="col-span-2" style={{ backgroundColor: bgColor }}></div>
        <div style={{ backgroundColor: primaryColor }}></div>
        <div style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  );
}
