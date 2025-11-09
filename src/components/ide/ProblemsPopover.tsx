import React, { useEffect, useState } from 'react';
import { XCircle, AlertCircle, Info, X, ChevronRight } from 'lucide-react';
import { getMarkerService, IMarker, MarkerSeverity } from '../../services/markerService';
import { editorActions } from '../../stores/editorStore';
import { cn } from '@/lib/cn';

interface ProblemsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ProblemsPopover: React.FC<ProblemsPopoverProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [position, setPosition] = useState({ bottom: 32, left: 0 });

  useEffect(() => {
    const markerService = getMarkerService();

    const unsubscribe = markerService.onMarkerChanged(() => {
      const allMarkers = markerService.read();
      setMarkers(allMarkers);
    });

    // Initial load
    setMarkers(markerService.read());

    return unsubscribe;
  }, []);

  // Calculate position based on trigger element
  useEffect(() => {
    if (triggerRef?.current && isOpen) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        bottom: window.innerHeight - rect.top + 8, // 8px gap above status bar
        left: rect.left,
      });
    }
  }, [triggerRef, isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get icon for severity
  const getSeverityIcon = (severity: MarkerSeverity) => {
    const iconProps = { size: 14 };

    switch (severity) {
      case MarkerSeverity.Error:
        return <XCircle {...iconProps} className="text-red-500 flex-shrink-0" />;
      case MarkerSeverity.Warning:
        return <AlertCircle {...iconProps} className="text-yellow-500 flex-shrink-0" />;
      case MarkerSeverity.Info:
      case MarkerSeverity.Hint:
      default:
        return <Info {...iconProps} className="text-blue-500 flex-shrink-0" />;
    }
  };

  // Handle marker click
  const handleMarkerClick = (marker: IMarker) => {
    // Navigate to the marker location
    editorActions.goToPosition(marker.startLineNumber, marker.startColumn);

    // Close popover after navigation
    onClose();
  };

  // Group by severity
  const errors = markers.filter(m => m.severity === MarkerSeverity.Error);
  const warnings = markers.filter(m => m.severity === MarkerSeverity.Warning);
  const others = markers.filter(m => m.severity !== MarkerSeverity.Error && m.severity !== MarkerSeverity.Warning);

  // Show only first 10 items of each type
  const displayMarkers = [
    ...errors.slice(0, 5),
    ...warnings.slice(0, 5),
    ...others.slice(0, 3),
  ];

  const totalCount = markers.length;
  const displayCount = displayMarkers.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />

      {/* Popover Card */}
      <div
        className={cn(
          'fixed z-50',
          'w-[500px] max-h-[400px]',
          'bg-background border border-border rounded-md shadow-2xl',
          'flex flex-col',
          'animate-in fade-in slide-in-from-bottom-2 duration-200'
        )}
        style={{
          bottom: `${position.bottom}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Problems</span>
            <span className="text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'problem' : 'problems'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {displayMarkers.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No problems detected
            </div>
          ) : (
            <div className="py-1">
              {displayMarkers.map((marker, index) => {
                const fileName = marker.resource.split('/').pop() || 'Unknown';

                return (
                  <button
                    key={`${marker.resource}-${marker.startLineNumber}-${index}`}
                    onClick={() => handleMarkerClick(marker)}
                    className={cn(
                      'w-full px-3 py-2 text-left',
                      'flex items-start gap-2',
                      'hover:bg-muted/50 transition-colors',
                      'border-b border-border/50 last:border-0'
                    )}
                  >
                    {/* Icon */}
                    <div className="mt-0.5">
                      {getSeverityIcon(marker.severity)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">
                        {marker.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="truncate max-w-[200px]">{fileName}</span>
                        <span>Ln {marker.startLineNumber}, Col {marker.startColumn}</span>
                        {marker.source && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {marker.source}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight size={14} className="flex-shrink-0 mt-1 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {displayCount < totalCount && (
          <div className="px-3 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground text-center">
            Showing {displayCount} of {totalCount} problems. Press Ctrl+Shift+M for full panel.
          </div>
        )}

        {displayMarkers.length > 0 && (
          <div className="px-3 py-1.5 border-t border-border/50 text-xs text-muted-foreground text-center">
            Click on a problem to jump to its location • Esc to close
          </div>
        )}
      </div>
    </>
  );
};

export default ProblemsPopover;
