import React, { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  GitBranch, 
  GitCommit,
  Zap
} from 'lucide-react';
import { editorState } from '../../stores/editorStore';
import { useIDEStore } from '../../stores/ideStore';
import { getCurrentTheme } from '../../stores/themeStore';
import { getGitService, GitStatus } from '../../services/gitService';
import { getDiagnosticService, DiagnosticStats } from '../../services/diagnosticService';
import { cn } from '@/lib/cn';

// Status bar item interface
interface StatusBarItem {
  id: string;
  content: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  order: number;
  position: 'left' | 'right';
}

// Problems interface (now using DiagnosticStats)
type Problems = DiagnosticStats;

// Editor info interface
interface EditorInfo {
  language: string;
  encoding: string;
  line: number;
  column: number;
  selection: string;
  spaces: number;
  tabSize: number;
}

const StatusBar: React.FC = () => {
  const { state } = useIDEStore();
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicts: 0,
    clean: true
  });
  const [problems, setProblems] = useState<Problems>({ errors: 0, warnings: 0, info: 0, hints: 0, total: 0 });
  const [editorInfo, setEditorInfo] = useState<EditorInfo>({
    language: 'Plain Text',
    encoding: 'UTF-8',
    line: 1,
    column: 1,
    selection: '',
    spaces: 2,
    tabSize: 2
  });

  // Get language display name
  const getLanguageDisplayName = (languageId: string): string => {
    const languageMap: Record<string, string> = {
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'html': 'HTML',
      'css': 'CSS',
      'markdown': 'Markdown',
      'rust': 'Rust',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'sql': 'SQL',
      'python': 'Python',
      'java': 'Java',
      'csharp': 'C#',
      'cpp': 'C++',
      'php': 'PHP',
      'go': 'Go'
    };
    return languageMap[languageId] || languageId.charAt(0).toUpperCase() + languageId.slice(1);
  };

  // Get selection info
  const getSelectionInfo = (editor: monaco.editor.IStandaloneCodeEditor): string => {
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      return '';
    }
    
    const lineCount = selection.endLineNumber - selection.startLineNumber + 1;
    const charCount = Math.abs(selection.startColumn - selection.endColumn) + 
                     (lineCount - 1) * 100; // Approximate
    
    if (lineCount === 1) {
      return `${charCount} selected`;
    } else {
      return `${lineCount} lines, ${charCount} selected`;
    }
  };

  // Update editor info with error handling
  const updateEditorInfo = () => {
    try {
      const editor = editorState.view;
      if (!editor) return;

      const model = editor.getModel();
      if (!model) return;

      const position = editor.getPosition();
      if (!position) return;

      const options = model.getOptions();
      setEditorInfo({
        language: getLanguageDisplayName(model.getLanguageId()),
        encoding: 'UTF-8', // Could be enhanced to detect actual encoding
        line: position.lineNumber,
        column: position.column,
        selection: getSelectionInfo(editor),
        spaces: options.insertSpaces ? (options.tabSize as number) : 0,
        tabSize: options.tabSize as number
      });
    } catch (error) {
      console.debug('[StatusBar] Failed to update editor info:', error);
    }
  };

  // Get git status using real service with better error handling
  const updateGitStatus = async () => {
    try {
      const snapshot = state();
      if (!snapshot.workspace || !snapshot.workspace.path) {
        setGitStatus({
          staged: 0,
          modified: 0,
          untracked: 0,
          conflicts: 0,
          clean: true
        });
        return;
      }

      const gitService = getGitService(snapshot.workspace.path);
      const status = await gitService.getGitStatus();
      setGitStatus(status);
    } catch (error) {
      console.debug('[StatusBar] Git status unavailable:', error);
      setGitStatus({
        staged: 0,
        modified: 0,
        untracked: 0,
        conflicts: 0,
        clean: true
      });
    }
  };

  // Subscribe to diagnostic service for real-time problem updates
  useEffect(() => {
    const diagnosticService = getDiagnosticService();
    
    const unsubscribe = diagnosticService.subscribe((_diagnostics, stats) => {
      setProblems(stats);
    });

    return unsubscribe;
  }, []);

  // Update editor info when editor changes with debouncing
  useEffect(() => {
    const editor = editorState.view;
    if (!editor) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateEditorInfo, 50);
    };

    const cursorDisposable = editor.onDidChangeCursorPosition(debouncedUpdate);
    const selectionDisposable = editor.onDidChangeCursorSelection(debouncedUpdate);
    const contentDisposable = editor.onDidChangeModelContent(debouncedUpdate);

    updateEditorInfo();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cursorDisposable.dispose();
      selectionDisposable.dispose();
      contentDisposable.dispose();
    };
  }, []);

  // Update git status periodically
  useEffect(() => {
    const updateStatus = async () => {
      await updateGitStatus();
    };
    
    updateStatus();
    const timer = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(timer);
  }, [state().workspace]);

  // Define status bar items
  const statusItems: StatusBarItem[] = [
    // Left side items
    {
      id: 'problems',
      content: (
        <div className={cn(
          "flex items-center gap-1",
          problems.errors > 0 ? "text-red-500" : 
          problems.warnings > 0 ? "text-yellow-500" : 
          "text-green-500"
        )}>
          {problems.errors > 0 ? (
            <XCircle size={12} />
          ) : problems.warnings > 0 ? (
            <AlertCircle size={12} />
          ) : (
            <CheckCircle size={12} />
          )}
          <span>
            {problems.errors > 0 ? `${problems.errors} error${problems.errors > 1 ? 's' : ''}` : 
             problems.warnings > 0 ? `${problems.warnings} warning${problems.warnings > 1 ? 's' : ''}` : 
             'No problems'}
          </span>
        </div>
      ),
      tooltip: problems.errors > 0 ? `${problems.errors} error${problems.errors > 1 ? 's' : ''}` :
               problems.warnings > 0 ? `${problems.warnings} warning${problems.warnings > 1 ? 's' : ''}` :
               'No problems detected',
      order: 1,
      position: 'left'
    },
    {
      id: 'git',
      content: (
        <div className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>{gitStatus.branch || 'No Git'}</span>
          {!gitStatus.clean && (
            <span className="text-yellow-500">
              {gitStatus.staged > 0 && `●${gitStatus.staged}`}
              {gitStatus.modified > 0 && ` +${gitStatus.modified}`}
              {gitStatus.untracked > 0 && ` ?${gitStatus.untracked}`}
            </span>
          )}
        </div>
      ),
      tooltip: gitStatus.branch ? `Branch: ${gitStatus.branch}` : 'Not a git repository',
      order: 2,
      position: 'left'
    },
    {
      id: 'sync',
      content: (
        <div className="flex items-center gap-1">
          <GitCommit size={12} />
          <span>Sync</span>
        </div>
      ),
      tooltip: 'Sync changes',
      onClick: () => console.log('Sync clicked'),
      order: 3,
      position: 'left'
    },

    // Right side items
    {
      id: 'encoding',
      content: <span>{editorInfo.encoding}</span>,
      tooltip: 'File encoding',
      order: 1,
      position: 'right'
    },
    {
      id: 'language',
      content: <span>{editorInfo.language}</span>,
      tooltip: `Language: ${editorInfo.language}`,
      order: 2,
      position: 'right'
    },
    {
      id: 'position',
      content: (
        <span>
          Ln {editorInfo.line}, Col {editorInfo.column}
          {editorInfo.selection && ` • ${editorInfo.selection}`}
        </span>
      ),
      tooltip: 'Cursor position',
      order: 3,
      position: 'right'
    },
    {
      id: 'indentation',
      content: (
        <span>
          {editorInfo.spaces > 0 ? `Spaces: ${editorInfo.spaces}` : `Tab Size: ${editorInfo.tabSize}`}
        </span>
      ),
      tooltip: 'Indentation settings',
      order: 4,
      position: 'right'
    },
    {
      id: 'theme',
      content: <span>{getCurrentTheme().displayName}</span>,
      tooltip: 'Current theme',
      onClick: () => console.log('Theme clicked'),
      order: 6,
      position: 'right'
    },
    {
      id: 'brand',
      content: (
        <div className="flex items-center gap-1">
          <Zap size={12} />
          <span>Rainy Aether</span>
        </div>
      ),
      tooltip: 'Rainy Aether IDE',
      order: 7,
      position: 'right'
    }
  ];

  // Sort items by order and position
  const leftItems = statusItems
    .filter(item => item.position === 'left')
    .sort((a, b) => a.order - b.order);

  const rightItems = statusItems
    .filter(item => item.position === 'right')
    .sort((a, b) => a.order - b.order);

  return (
    <div className={cn(
      "flex items-center justify-between px-2 py-1 text-xs border-t",
      "bg-background text-foreground border-border",
      "h-6 select-none"
    )}>
      {/* Left side items */}
      <div className="flex items-center gap-4">
        {leftItems.map(item => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-1",
              item.onClick && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
            )}
            onClick={item.onClick}
            title={item.tooltip}
          >
            {item.content}
          </div>
        ))}
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-4">
        {rightItems.map(item => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-1",
              item.onClick && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
            )}
            onClick={item.onClick}
            title={item.tooltip}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusBar;
