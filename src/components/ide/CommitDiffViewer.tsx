import React, { useMemo, useState, useCallback } from "react";
import { X, GitCommit, FileText, Plus, Minus, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCommitDiff, getCommitFileDiff, FileDiff, Commit } from "@/stores/gitStore";

interface CommitDiffViewerProps {
  commit: Commit;
  onClose?: () => void;
  isModal?: boolean;
}

interface ParsedLine {
  text: string;
  type: 'addition' | 'deletion' | 'context' | 'hunk' | 'info';
  lineNumber?: number;
  originalLineNumber?: number;
}

const CommitDiffViewer: React.FC<CommitDiffViewerProps> = ({
  commit,
  onClose,
  isModal = false
}) => {
  const [showWhitespace, setShowWhitespace] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);
  const [commitDiff, setCommitDiff] = useState<FileDiff[] | null>(null);
  const [loadedDiffs, setLoadedDiffs] = useState<Map<string, string>>(new Map());
  const [loadingDiffs, setLoadingDiffs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load commit diff metadata on mount (file paths and stats only, no diff content)
  React.useEffect(() => {
    const loadCommitMetadata = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load metadata only - 10-20x faster for large commits
        // This loads file paths, status, and addition/deletion counts
        // but NOT the actual diff content (that's loaded on-demand)
        const diff = await getCommitDiff(commit.hash, true); // metadataOnly=true
        setCommitDiff(diff);
      } catch (err) {
        console.error('Failed to load commit metadata:', err);
        setError('Failed to load commit changes');
      } finally {
        setLoading(false);
      }
    };

    loadCommitMetadata();
  }, [commit.hash]);

  // Load individual file diff when accordion expands
  const loadFileDiff = useCallback(async (filePath: string) => {
    // Skip if already loaded or currently loading
    if (loadedDiffs.has(filePath) || loadingDiffs.has(filePath)) {
      return;
    }

    try {
      setLoadingDiffs(prev => new Set(prev).add(filePath));

      // Load diff for this specific file with 500 line limit (prevents massive DOM updates)
      const diffContent = await getCommitFileDiff(commit.hash, filePath, 500);

      setLoadedDiffs(prev => new Map(prev).set(filePath, diffContent));
    } catch (err) {
      console.error(`Failed to load diff for ${filePath}:`, err);
      setLoadedDiffs(prev => new Map(prev).set(filePath, 'Error loading diff'));
    } finally {
      setLoadingDiffs(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    }
  }, [commit.hash, loadedDiffs, loadingDiffs]);

  // Handle accordion value change
  const handleAccordionChange = useCallback((value: string[]) => {
    setExpandedFiles(value);

    // Load diffs for newly expanded files
    value.forEach(filePath => {
      if (!loadedDiffs.has(filePath) && !loadingDiffs.has(filePath)) {
        loadFileDiff(filePath);
      }
    });
  }, [loadedDiffs, loadingDiffs, loadFileDiff]);

  const parseDiff = useMemo(() => (diffText: string): ParsedLine[] => {
    if (!diffText) return [];

    const lines = diffText.split("\n");
    let lineNumber = 0;
    let originalLineNumber = 0;

    return lines.map((line) => {
      let type: ParsedLine['type'] = 'context';

      if (line.startsWith("+++")) type = 'info';
      else if (line.startsWith("---")) type = 'info';
      else if (line.startsWith("diff --git")) type = 'info';
      else if (line.startsWith("index")) type = 'info';
      else if (line.startsWith("new file")) type = 'info';
      else if (line.startsWith("deleted file")) type = 'info';
      else if (line.startsWith("@@")) {
        type = 'hunk';
        const match = line.match(/@@\s*-?\d+(?:,\d+)?\s*\+(\d+)(?:,\d+)?\s*@@/);
        if (match) {
          lineNumber = parseInt(match[1]) - 1;
        }
      }
      else if (line.startsWith("+")) {
        type = 'addition';
        lineNumber++;
      }
      else if (line.startsWith("-")) {
        type = 'deletion';
        originalLineNumber++;
      }
      else if (line.startsWith(" ")) {
        type = 'context';
        lineNumber++;
        originalLineNumber++;
      }

      return {
        text: line,
        type,
        lineNumber: type === 'addition' || type === 'context' ? lineNumber : undefined,
        originalLineNumber: type === 'deletion' || type === 'context' ? originalLineNumber : undefined
      };
    });
  }, []);

  const getLineClassName = (type: ParsedLine['type']) => {
    switch (type) {
      case 'addition':
        return 'bg-[var(--diff-added)]/10 text-[var(--diff-added)] border-l-2 border-[var(--diff-added)]';
      case 'deletion':
        return 'bg-[var(--diff-removed)]/10 text-[var(--diff-removed)] border-l-2 border-[var(--diff-removed)]';
      case 'hunk':
        return 'bg-[var(--diff-hunk)]/10 text-[var(--diff-hunk)] font-mono text-xs font-medium';
      case 'info':
        return 'text-muted-foreground text-xs bg-muted/30';
      default:
        return 'text-foreground hover:bg-muted/20';
    }
  };

  const getLinePrefix = (type: ParsedLine['type']) => {
    if (type === 'addition') return '+';
    if (type === 'deletion') return '-';
    if (type === 'context') return ' ';
    return '';
  };

  const formatLineText = (text: string, type: ParsedLine['type']) => {
    if (!showWhitespace && (type === 'context' || type === 'hunk')) {
      return text.replace(/^\s+/, '');
    }
    return text;
  };

  const renderFileDiff = (file: FileDiff) => {
    const diffContent = loadedDiffs.get(file.path) || '';
    const isLoadingDiff = loadingDiffs.has(file.path);
    const parsedLines = parseDiff(diffContent);

    return (
      <div className="space-y-0">
        {/* Diff Content */}
        <div className="relative">
          {isLoadingDiff ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="size-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading diff...</p>
              </div>
            </div>
          ) : diffContent.startsWith('Error') ? (
            <div className="text-center text-destructive py-12">
              <p className="text-sm">{diffContent}</p>
            </div>
          ) : parsedLines.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-sm">No changes to display</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full font-mono text-sm">
                <div className="divide-y divide-border/20">
                  {parsedLines.map((line, index) => (
                    <div
                      key={`${file.path}-${index}-${line.text.slice(0, 20)}`}
                      className={cn(
                        "flex items-start gap-0 transition-colors hover:bg-muted/10",
                        getLineClassName(line.type)
                      )}
                    >
                      {/* Line Numbers Column */}
                      <div className="flex-shrink-0 w-20 border-r border-border/30 bg-muted/10 px-2 py-2 text-right text-xs text-muted-foreground select-none">
                        <div className="flex justify-between">
                          <span className={cn(
                            "w-8",
                            line.originalLineNumber !== undefined ? "text-[var(--diff-removed)]" : ""
                          )}>
                            {line.originalLineNumber !== undefined ? line.originalLineNumber : ''}
                          </span>
                          <span className={cn(
                            "w-8",
                            line.lineNumber !== undefined ? "text-[var(--diff-added)]" : ""
                          )}>
                            {line.lineNumber !== undefined ? line.lineNumber : ''}
                          </span>
                        </div>
                      </div>

                      {/* Diff Indicator */}
                      <div className="flex-shrink-0 w-8 border-r border-border/30 bg-muted/5 px-2 py-2 text-center">
                        <span className={cn(
                          "text-xs font-mono select-none",
                          line.type === 'addition' && "text-[var(--diff-added)]",
                          line.type === 'deletion' && "text-[var(--diff-removed)]",
                          line.type === 'hunk' && "text-[var(--diff-hunk)]"
                        )}>
                          {getLinePrefix(line.type)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 px-3 py-2 min-w-0">
                        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                          {formatLineText(line.text, line.type)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full bg-background border border-border/50 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <GitCommit className="size-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              Commit Changes
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {commit.hash.slice(0, 8)} • {commit.message}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>{commit.author}</span>
              <span>{commit.date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWhitespace(!showWhitespace)}
            className="text-xs hover:bg-muted"
          >
            <Settings className="size-4 mr-2" />
            {showWhitespace ? 'Hide' : 'Show'} Whitespace
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-muted">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading commit changes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-destructive">
              <GitCommit className="size-12 mx-auto mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          </div>
        ) : commitDiff && commitDiff.length > 0 ? (
          <Accordion type="multiple" value={expandedFiles} onValueChange={handleAccordionChange} className="w-full">
            {commitDiff.map((file) => (
              <AccordionItem key={file.path} value={file.path} className="border-b border-border/30">
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    <FileText className="size-4 text-muted-foreground" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground truncate max-w-md">
                        {file.path}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {file.status}
                        </Badge>
                        <div className="flex items-center gap-2">
                          {file.additions > 0 && (
                            <span className="flex items-center gap-1 text-[var(--diff-added)]">
                              <Plus className="size-3" />
                              {file.additions}
                            </span>
                          )}
                          {file.deletions > 0 && (
                            <span className="flex items-center gap-1 text-[var(--diff-removed)]">
                              <Minus className="size-3" />
                              {file.deletions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="border-t border-border/30">
                    {renderFileDiff(file)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <GitCommit className="size-12 mx-auto mb-4 opacity-50" />
              <p>No changes in this commit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl border-border/50">
          {content}
        </Card>
      </div>
    );
  }

  return content;
};

export default CommitDiffViewer;
