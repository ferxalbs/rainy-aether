import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EOLSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentEOL: string;
  onEOLChange: (eol: string) => void;
}

// End of Line options
const EOL_OPTIONS = [
  {
    id: 'lf',
    name: 'LF',
    fullName: 'Line Feed',
    description: 'Unix/Linux/macOS (\\n)',
    symbol: '\\n',
    icon: (
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
        <path d="M3 3h18v18H3z"></path>
        <path d="M8 8v8"></path>
        <path d="M16 8l-4 4 4 4"></path>
      </svg>
    ),
  },
  {
    id: 'crlf',
    name: 'CRLF',
    fullName: 'Carriage Return + Line Feed',
    description: 'Windows (\\r\\n)',
    symbol: '\\r\\n',
    icon: (
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
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <path d="M8 8v8"></path>
        <path d="M16 8l-4 4 4 4"></path>
      </svg>
    ),
  },
  {
    id: 'cr',
    name: 'CR',
    fullName: 'Carriage Return',
    description: 'Classic Mac (\\r)',
    symbol: '\\r',
    icon: (
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
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M16 8l-4 4 4 4"></path>
      </svg>
    ),
  },
];

export function EOLSelector({
  isOpen,
  onClose,
  triggerRef,
  currentEOL,
  onEOLChange,
}: EOLSelectorProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 250, // Show above the statusbar
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

  const handleSelect = (eol: string) => {
    onEOLChange(eol);
    onClose();
  };

  // Normalize EOL for comparison
  const normalizeEOL = (eol: string): string => {
    return eol.toUpperCase().replace(/[^A-Z]/g, '');
  };

  const currentEOLNormalized = normalizeEOL(currentEOL);

  return (
    <div
      className={cn(
        'fixed z-[9999] w-80 rounded-lg shadow-2xl border',
        'bg-background border-border',
        'overflow-hidden'
      )}
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Select End of Line Sequence</h3>
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
      </div>

      {/* EOL Options */}
      <ScrollArea className="h-[220px]">
        <div className="py-1">
          {EOL_OPTIONS.map((option) => {
            const isActive = normalizeEOL(option.name) === currentEOLNormalized;

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.name)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-all duration-150',
                  'hover:bg-accent hover:text-accent-foreground',
                  'flex items-center gap-3 group',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
                  isActive && 'bg-accent text-accent-foreground'
                )}
              >
                {/* Icon */}
                <div className="flex-shrink-0 text-primary">{option.icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{option.name}</span>
                    <span className="text-xs text-muted-foreground">({option.fullName})</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                  <div className="text-xs font-mono text-muted-foreground/70 mt-0.5">
                    {option.symbol}
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
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-medium text-foreground">{currentEOL}</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          This affects how line breaks are saved in files
        </p>
      </div>
    </div>
  );
}
