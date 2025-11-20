import React, { useEffect, useState, useRef, useMemo } from 'react';
import { XCircle, AlertCircle, Info, Lightbulb, X, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { getMarkerService, IMarker, MarkerSeverity } from '../../services/markerService';
import { editorActions } from '../../stores/editorStore';
import { useSettingsState } from '../../stores/settingsStore';
import { useCurrentProblem } from './CurrentProblemIndicator';
import { getCodeActionService } from '../../services/codeActionService';
import { cn } from '@/lib/cn';

interface ProblemsPanelProps {
  onClose?: () => void;
  className?: string;
}

const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ onClose, className }) => {
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const settings = useSettingsState();
  const currentProblem = useCurrentProblem();

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

  // Get icon for severity
  const getSeverityIcon = (severity: MarkerSeverity) => {
    const iconProps = { size: 16 };

    switch (severity) {
      case MarkerSeverity.Error:
        return <XCircle {...iconProps} className="text-red-500" />;
      case MarkerSeverity.Warning:
        return <AlertCircle {...iconProps} className="text-yellow-500" />;
      case MarkerSeverity.Info:
        return <Info {...iconProps} className="text-blue-500" />;
      case MarkerSeverity.Hint:
        return <Lightbulb {...iconProps} className="text-green-500" />;
      default:
        return <Info {...iconProps} className="text-muted-foreground" />;
    }
  };

  // Get severity label
  const getSeverityLabel = (severity: MarkerSeverity): string => {
    switch (severity) {
      case MarkerSeverity.Error:
        return 'Error';
      case MarkerSeverity.Warning:
        return 'Warning';
      case MarkerSeverity.Info:
        return 'Info';
      case MarkerSeverity.Hint:
        return 'Hint';
      default:
        return 'Unknown';
    }
  };

  // Get source badge color
  const getSourceColor = (owner: string): string => {
    switch (owner) {
      case 'monaco':
        return 'bg-blue-500/20 text-blue-500';
      case 'typescript':
        return 'bg-blue-600/20 text-blue-600';
      case 'git':
        return 'bg-orange-500/20 text-orange-500';
      case 'linter':
      case 'eslint':
        return 'bg-purple-500/20 text-purple-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Get unique owners
  const uniqueOwners = useMemo(() => {
    const owners = new Set(markers.map(m => m.owner));
    return Array.from(owners).sort();
  }, [markers]);

  // Sort markers based on settings
  const sortedMarkers = useMemo(() => {
    const sorted = [...markers];

    switch (settings.problems.sortOrder) {
      case 'severity':
        sorted.sort((a, b) => {
          // Error (8) > Warning (4) > Info (2) > Hint (1)
          if (a.severity !== b.severity) {
            return b.severity - a.severity; // Higher severity first
          }
          // Same severity: sort by file then line
          if (a.resource !== b.resource) {
            return a.resource.localeCompare(b.resource);
          }
          return a.startLineNumber - b.startLineNumber;
        });
        break;

      case 'position':
        sorted.sort((a, b) => {
          // Sort by file first
          if (a.resource !== b.resource) {
            return a.resource.localeCompare(b.resource);
          }
          // Then by line number
          if (a.startLineNumber !== b.startLineNumber) {
            return a.startLineNumber - b.startLineNumber;
          }
          // Then by column
          return a.startColumn - b.startColumn;
        });
        break;

      case 'name':
        sorted.sort((a, b) => {
          // Sort by filename (not full path)
          const fileA = a.resource.split('/').pop() || a.resource;
          const fileB = b.resource.split('/').pop() || b.resource;
          if (fileA !== fileB) {
            return fileA.localeCompare(fileB);
          }
          // Then by line number
          return a.startLineNumber - b.startLineNumber;
        });
        break;
    }

    return sorted;
  }, [markers, settings.problems.sortOrder]);

  // Filter markers
  const filteredMarkers = useMemo(() => {
    return sortedMarkers.filter((marker) => {
      // Filter by severity
      if (filter === 'errors' && marker.severity !== MarkerSeverity.Error) return false;
      if (filter === 'warnings' && marker.severity !== MarkerSeverity.Warning) return false;
      if (filter === 'info' && marker.severity !== MarkerSeverity.Info) return false;

      // Filter by owner
      if (selectedOwners.length > 0 && !selectedOwners.includes(marker.owner)) return false;

      // Filter by search text
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const messageMatch = marker.message.toLowerCase().includes(searchLower);
        const fileMatch = marker.resource.toLowerCase().includes(searchLower);
        const ownerMatch = marker.owner.toLowerCase().includes(searchLower);
        const codeMatch = marker.code &&
          (typeof marker.code === 'string'
            ? marker.code.toLowerCase().includes(searchLower)
            : marker.code.value.toLowerCase().includes(searchLower));

        if (!messageMatch && !fileMatch && !ownerMatch && !codeMatch) return false;
      }

      return true;
    });
  }, [sortedMarkers, filter, selectedOwners, searchText]);

  // Group markers by file
  const groupedMarkers = useMemo(() => {
    return filteredMarkers.reduce((acc, marker) => {
      const file = marker.resource || 'Unknown';
      if (!acc[file]) {
        acc[file] = [];
      }
      acc[file].push(marker);
      return acc;
    }, {} as Record<string, IMarker[]>);
  }, [filteredMarkers]);

  // Flatten markers for keyboard navigation
  const flatMarkers = useMemo(() => {
    return Object.entries(groupedMarkers).flatMap(([file, fileMarkers]) =>
      fileMarkers.map(m => ({ file, marker: m }))
    );
  }, [groupedMarkers]);

  // Get counts
  const errorCount = markers.filter((m) => m.severity === MarkerSeverity.Error).length;
  const warningCount = markers.filter((m) => m.severity === MarkerSeverity.Warning).length;
  const infoCount = markers.filter((m) => m.severity === MarkerSeverity.Info).length;

  // Handle marker click - navigate to code
  const handleMarkerClick = (marker: IMarker) => {
    // Navigate to the marker position
    editorActions.revealRange(
      marker.startLineNumber,
      marker.startColumn,
      marker.endLineNumber,
      marker.endColumn
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatMarkers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatMarkers.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < flatMarkers.length) {
          handleMarkerClick(flatMarkers[selectedIndex].marker);
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (onClose) onClose();
        break;

      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setSelectedIndex(flatMarkers.length - 1);
        break;
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-marker-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Auto-reveal current problem (if setting enabled)
  useEffect(() => {
    if (!settings.problems.autoReveal || !currentProblem) return;

    // Find index of current problem
    const currentIndex = flatMarkers.findIndex(
      ({ marker }) =>
        marker.resource === currentProblem.resource &&
        marker.startLineNumber === currentProblem.startLineNumber &&
        marker.startColumn === currentProblem.startColumn
    );

    if (currentIndex >= 0) {
      setSelectedIndex(currentIndex);
    }
  }, [currentProblem, flatMarkers, settings.problems.autoReveal]);

  // Toggle file collapse
  const toggleFileCollapse = (file: string) => {
    setCollapsedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  // Toggle owner filter
  const toggleOwner = (owner: string) => {
    setSelectedOwners(prev => {
      if (prev.includes(owner)) {
        return prev.filter(o => o !== owner);
      } else {
        return [...prev, owner];
      }
    });
  };

  // Monaco shows quick fixes automatically with a lightbulb in the editor
  // We just provide a button to trigger the same UI from the problems panel

  // Handle quick fix button click
  const handleQuickFixClick = async (e: React.MouseEvent, marker: IMarker) => {
    e.stopPropagation(); // Prevent marker click

    // Navigate to the problem location first
    await handleMarkerClick(marker);

    // Then trigger Monaco's built-in quick fix UI
    const codeActionService = getCodeActionService();
    await codeActionService.showQuickFixAtPosition(
      marker.startLineNumber,
      marker.startColumn
    );
  };

  return (
    <div
      className={cn("flex flex-col h-full bg-background border-t border-border", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Problems</h3>
          <span className="text-xs text-muted-foreground">
            {filteredMarkers.length} {filteredMarkers.length === 1 ? 'problem' : 'problems'}
            {filteredMarkers.length !== markers.length && (
              <span className="text-muted-foreground/70"> of {markers.length}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-2 py-1 rounded transition-colors",
                filter === 'all' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              aria-label="Show all problems"
              aria-pressed={filter === 'all'}
            >
              All
            </button>
            <button
              onClick={() => setFilter('errors')}
              className={cn(
                "px-2 py-1 rounded transition-colors flex items-center gap-1",
                filter === 'errors' ? "bg-red-500/20 text-red-500" : "hover:bg-muted"
              )}
              aria-label={`Show errors (${errorCount})`}
              aria-pressed={filter === 'errors'}
            >
              <XCircle size={12} />
              {errorCount}
            </button>
            <button
              onClick={() => setFilter('warnings')}
              className={cn(
                "px-2 py-1 rounded transition-colors flex items-center gap-1",
                filter === 'warnings' ? "bg-yellow-500/20 text-yellow-500" : "hover:bg-muted"
              )}
              aria-label={`Show warnings (${warningCount})`}
              aria-pressed={filter === 'warnings'}
            >
              <AlertCircle size={12} />
              {warningCount}
            </button>
            <button
              onClick={() => setFilter('info')}
              className={cn(
                "px-2 py-1 rounded transition-colors flex items-center gap-1",
                filter === 'info' ? "bg-blue-500/20 text-blue-500" : "hover:bg-muted"
              )}
              aria-label={`Show info (${infoCount})`}
              aria-pressed={filter === 'info'}
            >
              <Info size={12} />
              {infoCount}
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Close problems panel"
              aria-label="Close problems panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="px-3 py-2 border-b border-border space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={cn(
              "w-full pl-8 pr-3 py-1.5 text-sm rounded border",
              "bg-background border-border",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          />
        </div>

        {/* Owner filters */}
        {uniqueOwners.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={12} className="text-muted-foreground mr-1" />
            {uniqueOwners.map((owner) => (
              <button
                key={owner}
                onClick={() => toggleOwner(owner)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                  selectedOwners.includes(owner)
                    ? getSourceColor(owner)
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                aria-label={`Filter by ${owner}`}
                aria-pressed={selectedOwners.includes(owner)}
              >
                {owner}
              </button>
            ))}
            {selectedOwners.length > 0 && (
              <button
                onClick={() => setSelectedOwners([])}
                className="px-2 py-0.5 rounded text-xs text-muted-foreground hover:bg-muted"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Problems list */}
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {filteredMarkers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchText || selectedOwners.length > 0
              ? 'No problems match the current filters'
              : 'No problems to display'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(groupedMarkers).map(([file, fileMarkers]) => {
              const isCollapsed = collapsedFiles.has(file);
              const fileName = file.split('/').pop() || file;

              return (
                <div key={file}>
                  {/* File header */}
                  <div
                    className="px-3 py-1.5 text-xs font-medium bg-muted/30 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleFileCollapse(file)}
                  >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span className="flex-1">
                      {fileName}
                      <span className="ml-2 text-muted-foreground/70">
                        ({fileMarkers.length})
                      </span>
                    </span>
                  </div>

                  {/* Markers for this file */}
                  {!isCollapsed && fileMarkers.map((marker, idx) => {
                    const globalIndex = flatMarkers.findIndex(
                      ({ marker: m }) => m === marker
                    );
                    const isSelected = globalIndex === selectedIndex;
                    const isCurrent = settings.problems.autoReveal &&
                      currentProblem &&
                      marker.resource === currentProblem.resource &&
                      marker.startLineNumber === currentProblem.startLineNumber &&
                      marker.startColumn === currentProblem.startColumn;

                    return (
                      <div
                        key={`${marker.resource}-${marker.startLineNumber}-${marker.startColumn}-${idx}`}
                        data-marker-index={globalIndex}
                        className={cn(
                          "px-3 py-2 cursor-pointer transition-colors group relative",
                          isSelected && "bg-primary/10 border-l-2 border-l-primary",
                          isCurrent && "bg-blue-500/10",
                          !isSelected && !isCurrent && "hover:bg-muted/50"
                        )}
                        onClick={() => handleMarkerClick(marker)}
                      >
                        <div className="flex items-start gap-2">
                          {/* Severity icon */}
                          <div className="mt-0.5">
                            {getSeverityIcon(marker.severity)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{marker.message}</span>
                              {marker.code && (
                                <span className="text-xs text-muted-foreground">
                                  [{typeof marker.code === 'string' ? marker.code : marker.code.value}]
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {/* Owner badge */}
                              <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", getSourceColor(marker.owner))}>
                                {marker.owner}
                              </span>

                              {/* Location */}
                              <span>
                                Ln {marker.startLineNumber}, Col {marker.startColumn}
                              </span>

                              {/* Severity label */}
                              <span className="text-muted-foreground/70">
                                {getSeverityLabel(marker.severity)}
                              </span>
                            </div>
                          </div>

                          {/* Quick fix button - Monaco has built-in quick fixes for errors and warnings */}
                          {(marker.severity === MarkerSeverity.Error || marker.severity === MarkerSeverity.Warning) && (
                            <button
                              onClick={(e) => handleQuickFixClick(e, marker)}
                              className={cn(
                                "flex-shrink-0 p-1.5 rounded transition-all",
                                "opacity-0 group-hover:opacity-100",
                                "hover:bg-yellow-500/20 text-yellow-500"
                              )}
                              title="Show quick fixes (Ctrl+.)"
                              aria-label="Show quick fixes"
                            >
                              <Lightbulb size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with keyboard hints */}
      <div className="px-3 py-1 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
        <span>Sort: {settings.problems.sortOrder}</span>
        <span className="flex items-center gap-3">
          <span>↑↓ Navigate</span>
          <span>Enter Jump</span>
          <span>Esc Close</span>
        </span>
      </div>
    </div>
  );
};

export default ProblemsPanel;
