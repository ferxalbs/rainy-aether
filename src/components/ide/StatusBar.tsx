import React, { useEffect, useState, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { editorState } from '../../stores/editorStore';
import { useIDEStore } from '../../stores/ideStore';
import { getCurrentTheme } from '../../stores/themeStore';
import { getGitService, GitStatus } from '../../services/gitService';
import { getMarkerService, MarkerStatistics } from '../../services/markerService';
import { useNotificationStats } from '../../stores/notificationStore';
import { IStatusBarEntry } from '@/types/statusbar';
import { StatusBarItem } from './StatusBarItem';
import { useCurrentProblemStatusBarEntry } from './CurrentProblemIndicator';
import { ProblemsPopover } from './ProblemsPopover';
import { HelpMenu } from './HelpMenu';
import { NotificationCenter } from './NotificationCenter';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { ThemeSelector } from './ThemeSelector';
import { EncodingSelector } from './EncodingSelector';
import { LanguageModeSelector } from './LanguageModeSelector';
import { EOLSelector } from './EOLSelector';
import { cn } from '@/lib/cn';
import { invoke } from '@tauri-apps/api/core';
import { getLanguageDisplayName } from '@/utils/languageMap';
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
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [isEncodingSelectorOpen, setIsEncodingSelectorOpen] = useState(false);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [isEOLSelectorOpen, setIsEOLSelectorOpen] = useState(false);
  const problemsButtonRef = useRef<HTMLElement>(null);
  const helpButtonRef = useRef<HTMLElement>(null);
  const notificationButtonRef = useRef<HTMLElement>(null);
  const themeButtonRef = useRef<HTMLElement>(null);
  const encodingButtonRef = useRef<HTMLElement>(null);
  const languageButtonRef = useRef<HTMLElement>(null);
  const eolButtonRef = useRef<HTMLElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [editorInfo, setEditorInfo] = useState<EditorInfo>({
    language: 'Plain Text',
    encoding: 'UTF-8',
    line: 1,
    column: 1,
    selection: '',
    spaces: 2,
    tabSize: 2
  });
  const [eol, setEOL] = useState<string>('LF');
  const [platformName, setPlatformName] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const notificationStats = useNotificationStats();

  // Get current problem at cursor (if enabled in settings)
  const currentProblemEntry = useCurrentProblemStatusBarEntry();

  // Load platform name on mount
  useEffect(() => {
    const loadPlatformInfo = async () => {
      try {
        const platform = await invoke<string>('get_platform_name');
        setPlatformName(platform);
      } catch (error) {
        console.debug('[StatusBar] Failed to get platform name:', error);
        setPlatformName('Unknown');
      }
    };

    loadPlatformInfo();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle hover on problems button
  const handleProblemsMouseEnter = () => {
    // Show popover after 300ms delay
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsProblemsPopoverOpen(true);
    }, 300);
  };

  const handleProblemsMouseLeave = () => {
    // Cancel pending hover
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Delay close to allow mouse to move to popover
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsProblemsPopoverOpen(false);
    }, 200);
  };

  const handlePopoverMouseEnter = () => {
    // Cancel close timeout when mouse enters popover
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    // Close popover when mouse leaves
    setIsProblemsPopoverOpen(false);
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
    let cancelled = false; // Cancellation flag to prevent updates after unmount

    const debouncedUpdate = () => {
      if (cancelled) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!cancelled) { // Check again before updating
          updateEditorInfo();
        }
      }, 50);
    };

    const cursorDisposable = editor.onDidChangeCursorPosition(debouncedUpdate);
    const selectionDisposable = editor.onDidChangeCursorSelection(debouncedUpdate);
    const contentDisposable = editor.onDidChangeModelContent(debouncedUpdate);

    updateEditorInfo();

    return () => {
      cancelled = true; // Set cancellation flag first
      if (timeoutId) clearTimeout(timeoutId);
      cursorDisposable.dispose();
      selectionDisposable.dispose();
      contentDisposable.dispose();
    };
  }, []);

  // Update git status periodically
  useEffect(() => {
    let cancelled = false;

    const updateStatus = async () => {
      if (cancelled) return;
      await updateGitStatus();
    };

    updateStatus();
    const timer = setInterval(updateStatus, 30000); // Update every 30 seconds (reduced from 10s to improve performance)

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []); // Remove workspace dependency - updateGitStatus() reads current workspace

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
        // Click opens the full panel (Ctrl+Shift+M)
        onToggleProblemsPanel?.();
      },
    };
  };

  // Handle opening notification center
  const handleNotificationClick = () => {
    setIsNotificationCenterOpen(!isNotificationCenterOpen);
  };

  // Handle encoding change
  const handleEncodingChange = (encoding: string) => {
    setEditorInfo((prev) => ({ ...prev, encoding }));
    // TODO: Actually change the file encoding in Monaco
    console.log('Encoding changed to:', encoding);
  };

  // Handle language mode change
  const handleLanguageChange = (languageId: string) => {
    const editor = editorState.view;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Set language mode in Monaco
    monaco.editor.setModelLanguage(model, languageId);

    // Update state using imported function
    setEditorInfo((prev) => ({
      ...prev,
      language: getLanguageDisplayName(languageId),
    }));
  };

  // Handle EOL change
  const handleEOLChange = (newEOL: string) => {
    const editor = editorState.view;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Set EOL in Monaco
    const eolMap: Record<string, monaco.editor.EndOfLineSequence> = {
      LF: monaco.editor.EndOfLineSequence.LF,
      CRLF: monaco.editor.EndOfLineSequence.CRLF,
      CR: monaco.editor.EndOfLineSequence.LF, // Monaco doesn't support CR, use LF
    };

    model.setEOL(eolMap[newEOL] || monaco.editor.EndOfLineSequence.LF);
    setEOL(newEOL);
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
      ariaLabel: gitStatus.branch ? `Git Branch: ${gitStatus.branch}` : 'Git: Not a repository',
      order: 2,
      position: 'left'
    },
    {
      id: 'sync',
      name: 'Sync',
      text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Sync',
      tooltip: 'Sync changes',
      ariaLabel: 'Sync changes',
      onClick: () => console.log('Sync clicked'),
      order: 3,
      position: 'left'
    },

    // Right side items
    // Network status
    !isOnline ? {
      id: 'network',
      name: 'Network Status',
      text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg> Offline',
      tooltip: 'No internet connection',
      ariaLabel: 'Network Status: Offline',
      kind: 'warning',
      order: 0,
      position: 'right'
    } : null,
    // Notifications
    notificationStats.unread > 0 ? {
      id: 'notifications',
      name: 'Notifications',
      text: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> ${notificationStats.unread}`,
      tooltip: `${notificationStats.unread} unread notification${notificationStats.unread !== 1 ? 's' : ''}`,
      ariaLabel: `Notifications: ${notificationStats.unread} unread`,
      onClick: handleNotificationClick,
      kind: notificationStats.errors > 0 ? 'error' : notificationStats.warnings > 0 ? 'warning' : 'prominent',
      order: 0,
      position: 'right'
    } : null,
    // Encoding
    {
      id: 'encoding',
      name: 'File Encoding',
      text: editorInfo.encoding,
      tooltip: 'Select Encoding',
      ariaLabel: `File Encoding: ${editorInfo.encoding}`,
      onClick: () => setIsEncodingSelectorOpen(!isEncodingSelectorOpen),
      order: 1,
      position: 'right'
    },
    // EOL
    {
      id: 'eol',
      name: 'End of Line Sequence',
      text: eol,
      tooltip: 'Select End of Line Sequence',
      ariaLabel: `End of Line Sequence: ${eol}`,
      onClick: () => setIsEOLSelectorOpen(!isEOLSelectorOpen),
      order: 1.5,
      position: 'right'
    },
    // Language mode
    {
      id: 'language',
      name: 'Language Mode',
      text: editorInfo.language,
      tooltip: `Select Language Mode`,
      ariaLabel: `Language Mode: ${editorInfo.language}`,
      onClick: () => setIsLanguageSelectorOpen(!isLanguageSelectorOpen),
      order: 2,
      position: 'right'
    },
    // Cursor position
    {
      id: 'position',
      name: 'Cursor Position',
      text: `Ln ${editorInfo.line}, Col ${editorInfo.column}${editorInfo.selection ? ` • ${editorInfo.selection}` : ''}`,
      tooltip: 'Cursor position',
      ariaLabel: `Cursor Position: Line ${editorInfo.line}, Column ${editorInfo.column}`,
      order: 3,
      position: 'right'
    },
    // Indentation
    {
      id: 'indentation',
      name: 'Indentation',
      text: editorInfo.spaces > 0 ? `Spaces: ${editorInfo.spaces}` : `Tab Size: ${editorInfo.tabSize}`,
      tooltip: 'Indentation settings',
      ariaLabel: `Indentation: ${editorInfo.spaces > 0 ? `Spaces: ${editorInfo.spaces}` : `Tab Size: ${editorInfo.tabSize}`}`,
      order: 4,
      position: 'right'
    },
    // Platform/OS
    platformName ? {
      id: 'platform',
      name: 'Platform',
      text: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> ${platformName}`,
      tooltip: `Running on ${platformName}`,
      ariaLabel: `Platform: ${platformName}`,
      order: 5,
      position: 'right'
    } : null,
    // Theme
    {
      id: 'theme',
      name: 'Theme',
      text: getCurrentTheme().displayName,
      tooltip: 'Select Color Theme',
      ariaLabel: `Current Theme: ${getCurrentTheme().displayName}`,
      onClick: () => setIsThemeSelectorOpen(!isThemeSelectorOpen),
      order: 6,
      position: 'right'
    },
    // Help menu
    {
      id: 'help',
      name: 'Help',
      text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      tooltip: 'Help and Documentation (Click for menu, Ctrl+K Ctrl+S for shortcuts)',
      ariaLabel: 'Help and Documentation',
      onClick: (e?: React.MouseEvent) => {
        // Check if Ctrl/Cmd key is pressed
        if (e && (e.ctrlKey || e.metaKey)) {
          setIsKeyboardShortcutsOpen(true);
        } else {
          setIsHelpMenuOpen(!isHelpMenuOpen);
        }
      },
      order: 7,
      position: 'right'
    },
    // Brand
    {
      id: 'brand',
      name: 'Rainy Aether',
      text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      tooltip: 'Rainy Aether IDE',
      ariaLabel: 'Rainy Aether IDE',
      order: 8,
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
        <div className="flex items-stretch shrink-0">
          {leftItems.map(item => (
            <div
              key={item.id}
              ref={item.id === 'status.problems' ? (problemsButtonRef as React.RefObject<HTMLDivElement>) : undefined}
              onMouseEnter={item.id === 'status.problems' ? handleProblemsMouseEnter : undefined}
              onMouseLeave={item.id === 'status.problems' ? handleProblemsMouseLeave : undefined}
            >
              <StatusBarItem entry={item} />
            </div>
          ))}
        </div>

        {/* Right side items */}
        <div className="flex items-stretch shrink-0 ml-auto">
          {rightItems.map(item => (
            <div
              key={item.id}
              ref={
                item.id === 'help'
                  ? (helpButtonRef as React.RefObject<HTMLDivElement>)
                  : item.id === 'notifications'
                  ? (notificationButtonRef as React.RefObject<HTMLDivElement>)
                  : item.id === 'theme'
                  ? (themeButtonRef as React.RefObject<HTMLDivElement>)
                  : item.id === 'encoding'
                  ? (encodingButtonRef as React.RefObject<HTMLDivElement>)
                  : item.id === 'language'
                  ? (languageButtonRef as React.RefObject<HTMLDivElement>)
                  : item.id === 'eol'
                  ? (eolButtonRef as React.RefObject<HTMLDivElement>)
                  : undefined
              }
            >
              <StatusBarItem entry={item} />
            </div>
          ))}
        </div>
      </div>

      {/* Problems Popover */}
      <ProblemsPopover
        isOpen={isProblemsPopoverOpen}
        onClose={() => setIsProblemsPopoverOpen(false)}
        triggerRef={problemsButtonRef}
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
      />

      {/* Help Menu */}
      <HelpMenu
        isOpen={isHelpMenuOpen}
        onClose={() => setIsHelpMenuOpen(false)}
        triggerRef={helpButtonRef as React.RefObject<HTMLElement>}
        onOpenKeyboardShortcuts={() => {
          setIsHelpMenuOpen(false);
          setIsKeyboardShortcutsOpen(true);
        }}
      />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        triggerRef={notificationButtonRef as React.RefObject<HTMLElement>}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />

      {/* Theme Selector */}
      <ThemeSelector
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
        triggerRef={themeButtonRef as React.RefObject<HTMLElement>}
      />

      {/* Encoding Selector */}
      <EncodingSelector
        isOpen={isEncodingSelectorOpen}
        onClose={() => setIsEncodingSelectorOpen(false)}
        triggerRef={encodingButtonRef as React.RefObject<HTMLElement>}
        currentEncoding={editorInfo.encoding}
        onEncodingChange={handleEncodingChange}
      />

      {/* Language Mode Selector */}
      <LanguageModeSelector
        isOpen={isLanguageSelectorOpen}
        onClose={() => setIsLanguageSelectorOpen(false)}
        triggerRef={languageButtonRef as React.RefObject<HTMLElement>}
        currentLanguage={editorInfo.language}
        onLanguageChange={handleLanguageChange}
      />

      {/* EOL Selector */}
      <EOLSelector
        isOpen={isEOLSelectorOpen}
        onClose={() => setIsEOLSelectorOpen(false)}
        triggerRef={eolButtonRef as React.RefObject<HTMLElement>}
        currentEOL={eol}
        onEOLChange={handleEOLChange}
      />
    </>
  );
};

export default StatusBar;
