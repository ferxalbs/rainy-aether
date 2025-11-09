import React, { useEffect, useState, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { editorState } from '../../stores/editorStore';
import { useIDEStore } from '../../stores/ideStore';
import { getCurrentTheme } from '../../stores/themeStore';
import { getGitService, GitStatus } from '../../services/gitService';
import { getMarkerService, MarkerStatistics } from '../../services/markerService';
import { IStatusBarEntry } from '@/types/statusbar';
import { StatusBarItem } from './StatusBarItem';
import { useCurrentProblemStatusBarEntry } from './CurrentProblemIndicator';
import { ProblemsPopover } from './ProblemsPopover';
import { cn } from '@/lib/cn';
import '../../styles/statusbar.css';

// Problems interface (now using MarkerStatistics)
type Problems = MarkerStatistics;

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

interface StatusBarProps {
  onToggleProblemsPanel?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ onToggleProblemsPanel }) => {
  const { state } = useIDEStore();
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicts: 0,
    clean: true
  });
  const [problems, setProblems] = useState<Problems>({ errors: 0, warnings: 0, infos: 0, hints: 0, total: 0, unknowns: 0 });
  const [isProblemsPopoverOpen, setIsProblemsPopoverOpen] = useState(false);
  const problemsButtonRef = useRef<HTMLDivElement>(null);
  const [editorInfo, setEditorInfo] = useState<EditorInfo>({
    language: 'Plain Text',
    encoding: 'UTF-8',
    line: 1,
    column: 1,
    selection: '',
    spaces: 2,
    tabSize: 2
  });

  // Get current problem at cursor (if enabled in settings)
  const currentProblemEntry = useCurrentProblemStatusBarEntry();

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

  // Subscribe to marker service for real-time problem updates
  useEffect(() => {
    const markerService = getMarkerService();

    const unsubscribe = markerService.onMarkerChanged(() => {
      const stats = markerService.getStatistics();
      setProblems(stats);
    });

    // Initial load
    setProblems(markerService.getStatistics());

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

  /**
   * Create problems status bar entry (VS Code style)
   */
  const getProblemsEntry = (): IStatusBarEntry => {
    const hasErrors = problems.errors > 0;
    const hasWarnings = problems.warnings > 0;

    // VS Code style format with icons
    const errorIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    const warningIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

    // Format: "$(error) 5 $(warning) 3"
    const text = `${errorIcon} ${problems.errors} ${warningIcon} ${problems.warnings}`;
    const tooltip = `${problems.errors} error${problems.errors !== 1 ? 's' : ''}, ${problems.warnings} warning${problems.warnings !== 1 ? 's' : ''}`;

    return {
      id: 'status.problems',
      name: 'Problems',
      text,
      tooltip,
      ariaLabel: tooltip,
      command: 'workbench.actions.view.toggleProblems',
      kind: hasErrors ? 'error' : hasWarnings ? 'warning' : 'standard',
      order: 1,
      position: 'left',
      onClick: () => {
        setIsProblemsPopoverOpen(prev => !prev);
        // Also call the original handler if provided
        onToggleProblemsPanel?.();
      },
    };
  };

  // Define status bar items
  const statusItems: Array<IStatusBarEntry | null> = [
    // Left side items
    getProblemsEntry(),
    currentProblemEntry, // Will be null if disabled or no problem at cursor
    {
      id: 'git',
      name: 'Git Branch',
      text: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg> ${gitStatus.branch || 'No Git'}${!gitStatus.clean ? ` <span class="text-yellow-500">${gitStatus.staged > 0 ? `●${gitStatus.staged}` : ''}${gitStatus.modified > 0 ? ` +${gitStatus.modified}` : ''}${gitStatus.untracked > 0 ? ` ?${gitStatus.untracked}` : ''}</span>` : ''}`,
      tooltip: gitStatus.branch ? `Branch: ${gitStatus.branch}` : 'Not a git repository',
      order: 2,
      position: 'left'
    },
    {
      id: 'sync',
      name: 'Sync',
      text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Sync',
      tooltip: 'Sync changes',
      onClick: () => console.log('Sync clicked'),
      order: 3,
      position: 'left'
    },

    // Right side items
    {
      id: 'encoding',
      name: 'File Encoding',
      text: editorInfo.encoding,
      tooltip: 'File encoding',
      order: 1,
      position: 'right'
    },
    {
      id: 'language',
      name: 'Language Mode',
      text: editorInfo.language,
      tooltip: `Language: ${editorInfo.language}`,
      order: 2,
      position: 'right'
    },
    {
      id: 'position',
      name: 'Cursor Position',
      text: `Ln ${editorInfo.line}, Col ${editorInfo.column}${editorInfo.selection ? ` • ${editorInfo.selection}` : ''}`,
      tooltip: 'Cursor position',
      order: 3,
      position: 'right'
    },
    {
      id: 'indentation',
      name: 'Indentation',
      text: editorInfo.spaces > 0 ? `Spaces: ${editorInfo.spaces}` : `Tab Size: ${editorInfo.tabSize}`,
      tooltip: 'Indentation settings',
      order: 4,
      position: 'right'
    },
    {
      id: 'theme',
      name: 'Theme',
      text: getCurrentTheme().displayName,
      tooltip: 'Current theme',
      onClick: () => console.log('Theme clicked'),
      order: 6,
      position: 'right'
    },
    {
      id: 'brand',
      name: 'Rainy Aether',
      text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Rainy Aether',
      tooltip: 'Rainy Aether IDE',
      order: 7,
      position: 'right'
    }
  ];

  // Filter out null entries, then sort by order and position
  const validItems = statusItems.filter((item): item is IStatusBarEntry => item !== null);

  const leftItems = validItems
    .filter(item => item.position === 'left')
    .sort((a, b) => a.order - b.order);

  const rightItems = validItems
    .filter(item => item.position === 'right')
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <div className={cn(
        "flex items-stretch justify-between text-xs border-t",
        "bg-background text-foreground border-border",
        "h-6 select-none overflow-hidden"
      )}>
        {/* Left side items */}
        <div className="flex items-stretch flex-shrink-0">
          {leftItems.map(item => (
            <div
              key={item.id}
              ref={item.id === 'status.problems' ? problemsButtonRef : undefined}
            >
              <StatusBarItem entry={item} />
            </div>
          ))}
        </div>

        {/* Right side items */}
        <div className="flex items-stretch flex-shrink-0 ml-auto">
          {rightItems.map(item => (
            <StatusBarItem key={item.id} entry={item} />
          ))}
        </div>
      </div>

      {/* Problems Popover */}
      <ProblemsPopover
        isOpen={isProblemsPopoverOpen}
        onClose={() => setIsProblemsPopoverOpen(false)}
        triggerRef={problemsButtonRef}
      />
    </>
  );
};

export default StatusBar;
