import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { DocumentationLink, AppInfo } from '@/types/help';
import { cn } from '@/lib/cn';

interface HelpMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onOpenKeyboardShortcuts?: () => void;
}

export function HelpMenu({
  isOpen,
  onClose,
  triggerRef,
  onMouseEnter,
  onMouseLeave,
  onOpenKeyboardShortcuts,
}: HelpMenuProps) {
  const [links, setLinks] = useState<DocumentationLink[]>([]);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Load documentation links and app info
  useEffect(() => {
    const loadData = async () => {
      try {
        const [docsLinks, info] = await Promise.all([
          invoke<DocumentationLink[]>('get_documentation_links'),
          invoke<AppInfo>('get_app_info'),
        ]);
        setLinks(docsLinks);
        setAppInfo(info);
      } catch (error) {
        console.error('Failed to load help data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 300, // Show above the statusbar
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  const handleLinkClick = async (link: DocumentationLink) => {
    if (link.url.startsWith('http')) {
      try {
        await invoke('open_external_url', { url: link.url });
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    } else if (link.url === 'keyboard-shortcuts://local') {
      // Open keyboard shortcuts dialog
      onOpenKeyboardShortcuts?.();
    }
    onClose();
  };

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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Help & Resources</h3>
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
      </div>

      {/* Links */}
      <div className="max-h-96 overflow-y-auto">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => handleLinkClick(link)}
            className={cn(
              'w-full px-4 py-3 text-left transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'border-b border-border last:border-b-0',
              'flex items-start gap-3'
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getIconForLink(link.icon)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {link.title}
              </div>
              {link.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {link.description}
                </div>
              )}
            </div>

            {/* External link indicator */}
            {link.url.startsWith('http') && (
              <div className="flex-shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer - App Info */}
      {appInfo && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">{appInfo.name}</div>
            <div>Version {appInfo.version}</div>
            <div>
              {appInfo.os} {appInfo.arch}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getIconForLink(iconName?: string) {
  const iconProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'text-primary',
  };

  switch (iconName) {
    case 'book-open':
      return (
        <svg {...iconProps}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      );
    case 'keyboard':
      return (
        <svg {...iconProps}>
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <path d="M6 8h.01"></path>
          <path d="M10 8h.01"></path>
          <path d="M14 8h.01"></path>
          <path d="M18 8h.01"></path>
          <path d="M8 12h.01"></path>
          <path d="M12 12h.01"></path>
          <path d="M16 12h.01"></path>
          <path d="M7 16h10"></path>
        </svg>
      );
    case 'bug':
      return (
        <svg {...iconProps}>
          <rect width="8" height="14" x="8" y="6" rx="4"></rect>
          <path d="m8 10-4 2"></path>
          <path d="m20 12-4-2"></path>
          <path d="M6 14h.01"></path>
          <path d="M18 14h.01"></path>
          <path d="m12 20 0-10"></path>
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...iconProps}>
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
          <path d="M5 3v4"></path>
          <path d="M19 17v4"></path>
          <path d="M3 5h4"></path>
          <path d="M17 19h4"></path>
        </svg>
      );
    case 'github':
      return (
        <svg {...iconProps}>
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
          <path d="M9 18c-4.51 2-5-2-7-2"></path>
        </svg>
      );
    case 'globe':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      );
  }
}
