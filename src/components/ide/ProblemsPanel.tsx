import React, { useEffect, useState } from 'react';
import { XCircle, AlertCircle, Info, Lightbulb, X } from 'lucide-react';
import { getDiagnosticService, Diagnostic, DiagnosticSeverity, DiagnosticSource } from '../../services/diagnosticService';
import { cn } from '@/lib/cn';

interface ProblemsPanelProps {
  onClose?: () => void;
  className?: string;
}

const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ onClose, className }) => {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');

  useEffect(() => {
    const diagnosticService = getDiagnosticService();
    
    const unsubscribe = diagnosticService.subscribe((diags) => {
      setDiagnostics(diags);
    });

    return unsubscribe;
  }, []);

  // Get icon for severity
  const getSeverityIcon = (severity: DiagnosticSeverity) => {
    const iconProps = { size: 16 };
    
    switch (severity) {
      case DiagnosticSeverity.Error:
        return <XCircle {...iconProps} className="text-red-500" />;
      case DiagnosticSeverity.Warning:
        return <AlertCircle {...iconProps} className="text-yellow-500" />;
      case DiagnosticSeverity.Info:
        return <Info {...iconProps} className="text-blue-500" />;
      case DiagnosticSeverity.Hint:
        return <Lightbulb {...iconProps} className="text-green-500" />;
      default:
        return <Info {...iconProps} className="text-muted-foreground" />;
    }
  };

  // Get severity label
  const getSeverityLabel = (severity: DiagnosticSeverity): string => {
    switch (severity) {
      case DiagnosticSeverity.Error:
        return 'Error';
      case DiagnosticSeverity.Warning:
        return 'Warning';
      case DiagnosticSeverity.Info:
        return 'Info';
      case DiagnosticSeverity.Hint:
        return 'Hint';
      default:
        return 'Unknown';
    }
  };

  // Get source badge color
  const getSourceColor = (source: DiagnosticSource): string => {
    switch (source) {
      case DiagnosticSource.Monaco:
        return 'bg-blue-500/20 text-blue-500';
      case DiagnosticSource.TypeScript:
        return 'bg-blue-600/20 text-blue-600';
      case DiagnosticSource.Git:
        return 'bg-orange-500/20 text-orange-500';
      case DiagnosticSource.Linter:
        return 'bg-purple-500/20 text-purple-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Filter diagnostics
  const filteredDiagnostics = diagnostics.filter((diagnostic) => {
    if (filter === 'all') return true;
    if (filter === 'errors') return diagnostic.severity === DiagnosticSeverity.Error;
    if (filter === 'warnings') return diagnostic.severity === DiagnosticSeverity.Warning;
    if (filter === 'info') return diagnostic.severity === DiagnosticSeverity.Info;
    return true;
  });

  // Group diagnostics by file
  const groupedDiagnostics = filteredDiagnostics.reduce((acc, diagnostic) => {
    const file = diagnostic.file || 'Unknown';
    if (!acc[file]) {
      acc[file] = [];
    }
    acc[file].push(diagnostic);
    return acc;
  }, {} as Record<string, Diagnostic[]>);

  // Get counts
  const errorCount = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error).length;
  const warningCount = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning).length;
  const infoCount = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Info).length;

  return (
    <div className={cn("flex flex-col h-full bg-background border-t border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Problems</h3>
          <span className="text-xs text-muted-foreground">
            {diagnostics.length} {diagnostics.length === 1 ? 'problem' : 'problems'}
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
        {filteredDiagnostics.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No problems to display
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(groupedDiagnostics).map(([file, fileDiagnostics]) => (
              <div key={file} className="py-2">
                {/* File header */}
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                  {file.split('/').pop() || file}
                  <span className="ml-2 text-muted-foreground/70">
                    ({fileDiagnostics.length})
                  </span>
                </div>

                {/* Diagnostics for this file */}
                {fileDiagnostics.map((diagnostic) => (
                  <div
                    key={diagnostic.id}
                    className="px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {/* Severity icon */}
                      <div className="mt-0.5">
                        {getSeverityIcon(diagnostic.severity)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{diagnostic.message}</span>
                          {diagnostic.code && (
                            <span className="text-xs text-muted-foreground">
                              [{diagnostic.code}]
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {/* Source badge */}
                          <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", getSourceColor(diagnostic.source))}>
                            {diagnostic.source}
                          </span>

                          {/* Location */}
                          {diagnostic.line && (
                            <span>
                              Ln {diagnostic.line}
                              {diagnostic.column && `, Col ${diagnostic.column}`}
                            </span>
                          )}

                          {/* Severity label */}
                          <span className="text-muted-foreground/70">
                            {getSeverityLabel(diagnostic.severity)}
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
