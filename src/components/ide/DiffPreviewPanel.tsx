/**
 * DiffPreviewPanel Component
 *
 * Displays code diffs from chatbot extensions using Monaco's diff editor.
 * Supports side-by-side and inline views with accept/reject functionality.
 * This is the killer feature that shows AI code changes in real-time!
 */

import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import {
  useDiffState,
  useActiveDiffSet,
  diffActions,
  type FileDiff,
} from '@/stores/diffStore';
import { useThemeState } from '@/stores/themeStore';
import { cn } from '@/lib/cn';
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  AlignLeft,
  CheckCheck,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DiffPreviewPanel - Main component
 */
export function DiffPreviewPanel() {
  const diffState = useDiffState();
  const activeDiffSet = useActiveDiffSet();
  const themeState = useThemeState();

  if (!diffState.isDiffPanelOpen || !activeDiffSet) {
    return null;
  }

  const fileDiffs = Array.from(activeDiffSet.diffs.values());
  const activeFileDiff = activeDiffSet.activeUri
    ? activeDiffSet.diffs.get(activeDiffSet.activeUri)
    : fileDiffs[0];

  if (fileDiffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background border-t border-border">
        <p className="text-muted-foreground">No diffs to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-t border-border">
      {/* Header */}
      <DiffPanelHeader
        diffSet={activeDiffSet}
        activeDiff={activeFileDiff}
        allDiffs={fileDiffs}
      />

      {/* Diff Editor */}
      <div className="flex-1 overflow-hidden">
        {activeFileDiff && (
          <DiffEditor
            key={activeFileDiff.uri} // Force re-render on file change
            fileDiff={activeFileDiff}
            viewMode={activeDiffSet.viewMode}
            theme={themeState.currentTheme}
          />
        )}
      </div>

      {/* Footer */}
      <DiffPanelFooter
        diffSetId={activeDiffSet.id}
        activeFileDiff={activeFileDiff}
        allAccepted={activeDiffSet.allAccepted}
        allRejected={activeDiffSet.allRejected}
      />
    </div>
  );
}

/**
 * DiffPanelHeader - Top bar with file navigation and controls
 */
interface DiffPanelHeaderProps {
  diffSet: NonNullable<ReturnType<typeof useActiveDiffSet>>;
  activeDiff: FileDiff | undefined;
  allDiffs: FileDiff[];
}

function DiffPanelHeader({ diffSet, activeDiff, allDiffs }: DiffPanelHeaderProps) {
  const currentIndex = activeDiff
    ? allDiffs.findIndex(d => d.uri === activeDiff.uri)
    : -1;

  const handlePrevFile = () => {
    if (currentIndex > 0) {
      diffActions.setActiveDiffFile(diffSet.id, allDiffs[currentIndex - 1].uri);
    }
  };

  const handleNextFile = () => {
    if (currentIndex < allDiffs.length - 1) {
      diffActions.setActiveDiffFile(diffSet.id, allDiffs[currentIndex + 1].uri);
    }
  };

  const toggleViewMode = () => {
    // This would update the diff set view mode
    // For now, we'll just log it
    console.log('Toggle view mode');
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/50 border-b border-border">
      {/* Title and file info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{diffSet.title}</h3>
        <span className="text-xs text-muted-foreground">•</span>
        {activeDiff && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate">
              {getFileName(activeDiff.uri)}
            </span>
            {activeDiff.isStreaming && (
              <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
            )}
          </div>
        )}
      </div>

      {/* File navigation */}
      {allDiffs.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {allDiffs.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevFile}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextFile}
            disabled={currentIndex >= allDiffs.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleViewMode}
          title={diffSet.viewMode === 'split' ? 'Switch to inline' : 'Switch to side-by-side'}
        >
          {diffSet.viewMode === 'split' ? (
            <LayoutGrid className="w-4 h-4" />
          ) : (
            <AlignLeft className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => diffActions.toggleDiffPanel()}
          title="Close diff panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * DiffEditor - Monaco diff editor component
 */
interface DiffEditorProps {
  fileDiff: FileDiff;
  viewMode: 'split' | 'inline';
  theme: string;
}

function DiffEditor({ fileDiff, viewMode, theme }: DiffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const originalModelRef = useRef<monaco.editor.ITextModel | null>(null);
  const modifiedModelRef = useRef<monaco.editor.ITextModel | null>(null);

  // Get language from file extension
  const getLanguage = (uri: string): string => {
    const ext = uri.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const language = getLanguage(fileDiff.uri);

  // Create diff editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Map theme name to Monaco theme
    const monacoTheme = theme.toLowerCase().includes('night') ? 'vs-dark' : 'vs';

    // Create models
    originalModelRef.current = monaco.editor.createModel(
      fileDiff.originalContent,
      language
    );

    modifiedModelRef.current = monaco.editor.createModel(
      fileDiff.modifiedContent,
      language
    );

    // Create diff editor
    editorRef.current = monaco.editor.createDiffEditor(containerRef.current, {
      renderSideBySide: viewMode === 'split',
      renderIndicators: true,
      enableSplitViewResizing: true,
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineHeight: 20,
      theme: monacoTheme,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      diffWordWrap: 'on',
      renderOverviewRuler: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      // Diff-specific options
      ignoreTrimWhitespace: false,
      renderWhitespace: 'selection',
      diffAlgorithm: 'advanced',
    });

    // Set models
    editorRef.current.setModel({
      original: originalModelRef.current,
      modified: modifiedModelRef.current,
    });

    // Cleanup
    return () => {
      editorRef.current?.dispose();
      originalModelRef.current?.dispose();
      modifiedModelRef.current?.dispose();
    };
  }, [fileDiff.uri, language, theme, viewMode]);

  // Update modified content when it changes (for streaming)
  useEffect(() => {
    if (modifiedModelRef.current && fileDiff.isStreaming) {
      modifiedModelRef.current.setValue(fileDiff.modifiedContent);
    }
  }, [fileDiff.modifiedContent, fileDiff.isStreaming]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 0 }} // Important for flex layout
    />
  );
}

/**
 * DiffPanelFooter - Action buttons
 */
interface DiffPanelFooterProps {
  diffSetId: string;
  activeFileDiff: FileDiff | undefined;
  allAccepted: boolean;
  allRejected: boolean;
}

function DiffPanelFooter({
  diffSetId,
  activeFileDiff,
  allAccepted,
  allRejected,
}: DiffPanelFooterProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);

  const handleAccept = async () => {
    if (!activeFileDiff) return;

    setIsAccepting(true);
    try {
      await diffActions.acceptFileDiff(diffSetId, activeFileDiff.uri);
    } catch (error) {
      console.error('Failed to accept diff:', error);
      // TODO: Show error message to user
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    if (!activeFileDiff) return;

    diffActions.rejectFileDiff(diffSetId, activeFileDiff.uri);
  };

  const handleAcceptAll = async () => {
    setIsAcceptingAll(true);
    try {
      await diffActions.acceptAllDiffs(diffSetId);
    } catch (error) {
      console.error('Failed to accept all diffs:', error);
      // TODO: Show error message to user
    } finally {
      setIsAcceptingAll(false);
    }
  };

  const handleRejectAll = () => {
    diffActions.rejectAllDiffs(diffSetId);
  };

  const isFileAccepted = activeFileDiff?.isAccepted || false;
  const isFileRejected = activeFileDiff?.isRejected || false;
  const isFileStreaming = activeFileDiff?.isStreaming || false;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/50 border-t border-border">
      {/* Single file actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={isFileAccepted ? 'default' : 'outline'}
          size="sm"
          onClick={handleAccept}
          disabled={isAccepting || isFileAccepted || isFileRejected || isFileStreaming}
          className={cn(
            'gap-2',
            isFileAccepted && 'bg-green-600 hover:bg-green-700'
          )}
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isFileAccepted ? 'Accepted' : 'Accept'}
        </Button>

        <Button
          variant={isFileRejected ? 'default' : 'outline'}
          size="sm"
          onClick={handleReject}
          disabled={isFileAccepted || isFileRejected || isFileStreaming}
          className={cn(
            'gap-2',
            isFileRejected && 'bg-red-600 hover:bg-red-700'
          )}
        >
          <X className="w-4 h-4" />
          {isFileRejected ? 'Rejected' : 'Reject'}
        </Button>
      </div>

      {/* Batch actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={allAccepted ? 'default' : 'outline'}
          size="sm"
          onClick={handleAcceptAll}
          disabled={isAcceptingAll || allAccepted || allRejected || isFileStreaming}
          className={cn(
            'gap-2',
            allAccepted && 'bg-green-600 hover:bg-green-700'
          )}
        >
          {isAcceptingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck className="w-4 h-4" />
          )}
          {allAccepted ? 'All Accepted' : 'Accept All'}
        </Button>

        <Button
          variant={allRejected ? 'default' : 'outline'}
          size="sm"
          onClick={handleRejectAll}
          disabled={allAccepted || allRejected || isFileStreaming}
          className={cn(
            'gap-2',
            allRejected && 'bg-red-600 hover:bg-red-700'
          )}
        >
          <XCircle className="w-4 h-4" />
          {allRejected ? 'All Rejected' : 'Reject All'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper: Get filename from URI
 */
function getFileName(uri: string): string {
  return uri.split('/').pop() || uri;
}
