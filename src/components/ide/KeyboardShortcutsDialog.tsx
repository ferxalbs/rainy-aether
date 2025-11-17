import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { KeyboardShortcut } from '@/types/help';
import { cn } from '@/lib/cn';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load shortcuts when dialog opens
  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const data = await invoke<KeyboardShortcut[]>('get_keyboard_shortcuts');
        setShortcuts(data);
      } catch (error) {
        console.error('Failed to load keyboard shortcuts:', error);
      }
    };

    if (isOpen) {
      loadShortcuts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(shortcuts.map((s) => s.category)))];

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter((shortcut) => {
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Group by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredShortcuts.length} shortcuts
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded hover:bg-muted"
          >
            <svg
              width="20"
              height="20"
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

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-border flex gap-4 flex-shrink-0">
          {/* Search */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="16"
              height="16"
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
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded border',
                'bg-background border-border text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={cn(
              'px-4 py-2 rounded border',
              'bg-background border-border text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <svg
                className="mx-auto mb-4"
                width="48"
                height="48"
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
              <p>No shortcuts found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut) => (
                      <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Tip: You can search by shortcut name, description, or key combination
          </p>
        </div>
      </div>
    </div>
  );
}

interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  // Determine platform
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  // Get appropriate key combination
  const keys = shortcut.keys.find((k) => {
    if (isMac) {
      return k.includes('Cmd') || k.includes('⌘');
    } else {
      return k.includes('Ctrl');
    }
  }) || shortcut.keys[0];

  return (
    <div
      className={cn(
        'flex items-center justify-between py-3 px-4 rounded',
        'hover:bg-muted/50 transition-colors'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{shortcut.label}</div>
        <div className="text-xs text-muted-foreground mt-1">{shortcut.description}</div>
        {shortcut.when && (
          <div className="text-xs text-muted-foreground/70 mt-1 italic">
            When: {shortcut.when}
          </div>
        )}
      </div>
      <div className="ml-4 flex-shrink-0">
        <KeyboardKey keys={keys} />
      </div>
    </div>
  );
}

interface KeyboardKeyProps {
  keys: string;
}

function KeyboardKey({ keys }: KeyboardKeyProps) {
  // Parse key combination
  const parts = keys.split('+').map((k) => k.trim());

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-muted-foreground text-xs">+</span>}
          <kbd
            className={cn(
              'px-2 py-1 text-xs font-mono rounded',
              'bg-muted border border-border',
              'text-foreground shadow-sm',
              'min-w-[28px] text-center'
            )}
          >
            {formatKey(part)}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );
}

function formatKey(key: string): string {
  // Map special keys to symbols or better names
  const keyMap: Record<string, string> = {
    Ctrl: 'Ctrl',
    Control: 'Ctrl',
    Cmd: '⌘',
    Command: '⌘',
    Alt: 'Alt',
    Option: '⌥',
    Shift: '⇧',
    Enter: '↵',
    Return: '↵',
    Backspace: '⌫',
    Delete: 'Del',
    Escape: 'Esc',
    Tab: '⇥',
    Space: 'Space',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backquote: '`',
  };

  return keyMap[key] || key;
}
