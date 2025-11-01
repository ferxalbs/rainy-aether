import React, { useMemo, useState } from "react";
import { X, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  filePath?: string;
  diff: string;
  staged?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ 
  filePath, 
  diff, 
  staged = false, 
  onClose, 
  isModal = false 
}) => {
  const [showWhitespace, setShowWhitespace] = useState(true);

  const parsedLines = useMemo(() => {
    if (!diff) {
      return [] as { 
        text: string; 
        type: 'addition' | 'deletion' | 'context' | 'hunk' | 'info';
        lineNumber?: number;
        originalLineNumber?: number;
      }[];
    }

    const lines = diff.split("\n");
    let lineNumber = 0;
    let originalLineNumber = 0;

    return lines.map((line) => {
      let type: 'addition' | 'deletion' | 'context' | 'hunk' | 'info' = 'context';
      
      if (line.startsWith("+++")) type = 'info';
      else if (line.startsWith("---")) type = 'info';
      else if (line.startsWith("diff --git")) type = 'info';
      else if (line.startsWith("index")) type = 'info';
      else if (line.startsWith("new file")) type = 'info';
      else if (line.startsWith("deleted file")) type = 'info';
      else if (line.startsWith("@@")) {
        type = 'hunk';
        // Extract line numbers from hunk header
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
  }, [diff]);

  const getLineClassName = (type: string) => {
    switch (type) {
      case 'addition':
        return 'bg-green-500/10 text-green-700 dark:text-green-300 border-l-2 border-green-500';
      case 'deletion':
        return 'bg-red-500/10 text-red-700 dark:text-red-300 border-l-2 border-red-500';
      case 'hunk':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono text-xs';
      case 'info':
        return 'text-muted-foreground text-xs';
      default:
        return 'text-foreground';
    }
  };

  const getLinePrefix = (type: string) => {
    if (type === 'addition') return '+';
    if (type === 'deletion') return '-';
    if (type === 'context') return ' ';
    return '';
  };

  const formatLineText = (text: string, type: string) => {
    if (!showWhitespace && (type === 'context' || type === 'hunk')) {
      return text.replace(/^\s+/, '');
    }
    return text;
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <GitCompare className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {filePath ? `${staged ? 'Staged' : 'Unstaged'} Changes: ${filePath}` : 'Git Diff'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWhitespace(!showWhitespace)}
            className="text-xs"
          >
            {showWhitespace ? 'Hide' : 'Show'} Whitespace
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 font-mono text-sm">
          {parsedLines.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No changes to display
            </div>
          ) : (
            parsedLines.map((line, index) => (
              <div
                key={`${index}-${line.text}`}
                className={cn(
                  "px-3 py-1 border-b border-border/30 leading-relaxed flex items-start gap-3",
                  getLineClassName(line.type)
                )}
              >
                {/* Line numbers */}
                <div className="flex gap-4 text-xs text-muted-foreground select-none min-w-[80px] text-right">
                  <span>
                    {line.originalLineNumber !== undefined ? line.originalLineNumber : ''}
                  </span>
                  <span>
                    {line.lineNumber !== undefined ? line.lineNumber : ''}
                  </span>
                </div>
                
                {/* Diff indicator and content */}
                <div className="flex items-start gap-2 flex-1">
                  <span className="select-none text-muted-foreground min-w-[1ch]">
                    {getLinePrefix(line.type)}
                  </span>
                  <span className="whitespace-pre-wrap break-all">
                    {formatLineText(line.text, line.type)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-5xl max-h-[85vh] flex flex-col">
          {content}
        </Card>
      </div>
    );
  }

  return content;
};

export default DiffViewer;
