import React, { useEffect, useState } from 'react';
import { XCircle, AlertCircle, Info, Lightbulb, X } from 'lucide-react';
import { getMarkerService, IMarker, MarkerSeverity } from '../../services/markerService';
import { cn } from '@/lib/cn';

interface ProblemsPanelProps {
  onClose?: () => void;
  className?: string;
}

const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ onClose, className }) => {
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');

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

  // Filter markers
  const filteredMarkers = markers.filter((marker) => {
    if (filter === 'all') return true;
    if (filter === 'errors') return marker.severity === MarkerSeverity.Error;
    if (filter === 'warnings') return marker.severity === MarkerSeverity.Warning;
    if (filter === 'info') return marker.severity === MarkerSeverity.Info;
    return true;
  });

  // Group markers by file
  const groupedMarkers = filteredMarkers.reduce((acc, marker) => {
    const file = marker.resource || 'Unknown';
    if (!acc[file]) {
      acc[file] = [];
    }
    acc[file].push(marker);
    return acc;
  }, {} as Record<string, IMarker[]>);

  // Get counts
  const errorCount = markers.filter((m) => m.severity === MarkerSeverity.Error).length;
  const warningCount = markers.filter((m) => m.severity === MarkerSeverity.Warning).length;
  const infoCount = markers.filter((m) => m.severity === MarkerSeverity.Info).length;

  return (
    <div className={cn("flex flex-col h-full bg-background border-t border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Problems</h3>
          <span className="text-xs text-muted-foreground">
            {markers.length} {markers.length === 1 ? 'problem' : 'problems'}
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
            >
              All
            </button>
            <button
              onClick={() => setFilter('errors')}
              className={cn(
                "px-2 py-1 rounded transition-colors flex items-center gap-1",
                filter === 'errors' ? "bg-red-500/20 text-red-500" : "hover:bg-muted"
              )}
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
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Problems list */}
      <div className="flex-1 overflow-y-auto">
        {filteredMarkers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No problems to display
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(groupedMarkers).map(([file, fileMarkers]) => (
              <div key={file} className="py-2">
                {/* File header */}
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                  {file.split('/').pop() || file}
                  <span className="ml-2 text-muted-foreground/70">
                    ({fileMarkers.length})
                  </span>
                </div>

                {/* Markers for this file */}
                {fileMarkers.map((marker, idx) => (
                  <div
                    key={`${marker.resource}-${marker.startLineNumber}-${marker.startColumn}-${idx}`}
                    className="px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
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
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsPanel;
