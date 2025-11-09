import React, { useEffect, useState, useRef } from 'react';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { IMarker } from '@/services/markerService';
import { getCodeActionService, ICodeAction, CodeActionKind } from '@/services/codeActionService';
import { cn } from '@/lib/cn';

/**
 * Props for QuickFixMenu component
 */
export interface QuickFixMenuProps {
  /** The marker to show quick fixes for */
  marker: IMarker;
  /** Position of the menu (optional, defaults to marker position) */
  position?: { x: number; y: number };
  /** Callback when menu is closed */
  onClose: () => void;
  /** Callback when a fix is applied */
  onFixApplied?: (action: ICodeAction) => void;
}

/**
 * QuickFix Menu Component
 * Displays available quick fixes for a diagnostic marker
 */
export const QuickFixMenu: React.FC<QuickFixMenuProps> = ({
  marker,
  position,
  onClose,
  onFixApplied,
}) => {
  const [actions, setActions] = useState<ICodeAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [applying, setApplying] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);

  // Load code actions
  useEffect(() => {
    let mounted = true;

    const loadActions = async () => {
      setLoading(true);
      const codeActionService = getCodeActionService();
      const result = await codeActionService.getCodeActionsForMarker(marker);

      if (mounted) {
        setActions(result.actions);
        setLoading(false);
        disposeRef.current = result.dispose;
      }
    };

    loadActions();

    return () => {
      mounted = false;
      if (disposeRef.current) {
        disposeRef.current();
        disposeRef.current = null;
      }
    };
  }, [marker]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, actions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (actions[selectedIndex]) {
            handleApplyAction(actions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actions, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (menuRef.current) {
      const selectedElement = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Apply code action
  const handleApplyAction = async (action: ICodeAction) => {
    if (applying || action.disabled) return;

    setApplying(true);
    const codeActionService = getCodeActionService();
    const success = await codeActionService.applyCodeAction(action);

    if (success) {
      onFixApplied?.(action);
      onClose();
    } else {
      setApplying(false);
    }
  };

  // Get icon for code action kind
  const getActionIcon = (kind?: string) => {
    if (!kind) return <Lightbulb className="w-4 h-4" />;

    if (kind.startsWith(CodeActionKind.Refactor)) {
      return <Sparkles className="w-4 h-4" />;
    }

    return <Lightbulb className="w-4 h-4" />;
  };

  // Get display text for kind
  const getKindLabel = (kind?: string): string | null => {
    if (!kind) return null;

    if (kind === CodeActionKind.QuickFix) return 'Quick Fix';
    if (kind === CodeActionKind.Refactor) return 'Refactor';
    if (kind === CodeActionKind.RefactorExtract) return 'Extract';
    if (kind === CodeActionKind.RefactorInline) return 'Inline';
    if (kind === CodeActionKind.RefactorRewrite) return 'Rewrite';
    if (kind === CodeActionKind.Source) return 'Source Action';
    if (kind === CodeActionKind.SourceOrganizeImports) return 'Organize Imports';
    if (kind === CodeActionKind.SourceFixAll) return 'Fix All';

    return null;
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute z-50 min-w-[300px] max-w-[500px]',
        'bg-background border border-border rounded-md shadow-lg',
        'overflow-hidden'
      )}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
            }
          : undefined
      }
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">Quick Fixes</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading fixes...</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <p className="text-sm text-muted-foreground">No quick fixes available</p>
          </div>
        ) : (
          <div className="py-1">
            {actions.map((action, index) => {
              const isSelected = index === selectedIndex;
              const isDisabled = !!action.disabled;
              const kindLabel = getKindLabel(action.kind);

              return (
                <button
                  key={index}
                  data-index={index}
                  disabled={isDisabled || applying}
                  onClick={() => handleApplyAction(action)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-start gap-2',
                    'transition-colors duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 text-foreground'
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(action.kind)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {action.title}
                      </span>
                      {action.isPreferred && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">
                          Preferred
                        </span>
                      )}
                    </div>
                    {kindLabel && (
                      <span className="text-xs text-muted-foreground">
                        {kindLabel}
                      </span>
                    )}
                    {action.disabled && (
                      <span className="text-xs text-destructive">
                        {action.disabled}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && actions.length > 0 && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Use ↑↓ to navigate • Enter to apply • Esc to close
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickFixMenu;
