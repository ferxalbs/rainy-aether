/**
 * CodeBlockActions Component
 *
 * Action buttons for code blocks with advanced features:
 * - Run code in terminal (execute and show output)
 * - Diff preview (show changes before applying)
 * - Save to file (download or save to workspace)
 * - Apply to current file (Monaco editor integration)
 * - Copy to clipboard
 *
 * @example
 * ```tsx
 * <CodeBlockActions
 *   code="console.log('Hello');"
 *   language="typescript"
 *   onRun={(code) => terminal.run(code)}
 *   onApply={(code) => editor.insert(code)}
 *   onSave={(code) => fs.saveFile(code)}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import {
  Play,
  Download,
  FileDown,
  Diff,
  CornerDownRight,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/**
 * Props for CodeBlockActions
 */
export interface CodeBlockActionsProps {
  /** Code content */
  code: string;

  /** Programming language */
  language: string;

  /** Callback when code is run */
  onRun?: (code: string, language: string) => Promise<string>;

  /** Callback when code is applied to editor */
  onApply?: (code: string, language: string) => void;

  /** Callback when code is saved to file */
  onSave?: (code: string, filename: string) => Promise<boolean>;

  /** Current file path (for diff preview) */
  currentFilePath?: string;

  /** Whether running is supported for this language */
  canRun?: boolean;

  /** Whether applying to editor is supported */
  canApply?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Run result interface
 */
interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

/**
 * CodeBlockActions component
 */
export function CodeBlockActions({
  code,
  language,
  onRun,
  onApply,
  onSave,
  currentFilePath,
  canRun = true,
  canApply = true,
  className,
  compact = false,
}: CodeBlockActionsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [filename, setFilename] = useState(getDefaultFilename(language));

  /**
   * Handle run code
   */
  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);

    try {
      if (!onRun) {
        // Default: Run via Tauri terminal
        const output = await runCodeInTerminal(code, language);
        setRunResult({
          success: true,
          output,
        });
      } else {
        const output = await onRun(code, language);
        setRunResult({
          success: true,
          output,
        });
      }
    } catch (error) {
      setRunResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Handle apply to editor
   */
  const handleApply = () => {
    if (onApply) {
      onApply(code, language);
    }
  };

  /**
   * Handle save to file
   */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      if (!onSave) {
        // Default: Download as file
        downloadAsFile(code, filename);
        setSaveResult({ success: true });
        setShowSaveDialog(false);
      } else {
        const success = await onSave(code, filename);
        setSaveResult({ success });
        if (success) {
          setShowSaveDialog(false);
        }
      }
    } catch (error) {
      setSaveResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle diff preview
   */
  const handleDiff = () => {
    setShowDiffDialog(true);
  };

  return (
    <>
      <div className={cn('flex items-center gap-1', compact && 'gap-0.5', className)}>
        {/* Run button */}
        {canRun && isRunnableLanguage(language) && (
          <Button
            variant="ghost"
            size={compact ? 'icon-sm' : 'sm'}
            onClick={handleRun}
            disabled={isRunning}
            className={cn(
              'gap-1.5',
              compact ? 'h-6 w-6' : 'h-7 px-2',
              'text-xs text-muted-foreground hover:text-foreground'
            )}
            title="Run code"
          >
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            {!compact && <span>Run</span>}
          </Button>
        )}

        {/* Apply to editor button */}
        {canApply && (
          <Button
            variant="ghost"
            size={compact ? 'icon-sm' : 'sm'}
            onClick={handleApply}
            className={cn(
              'gap-1.5',
              compact ? 'h-6 w-6' : 'h-7 px-2',
              'text-xs text-muted-foreground hover:text-foreground'
            )}
            title="Apply to current file"
          >
            <CornerDownRight className="size-3" />
            {!compact && <span>Apply</span>}
          </Button>
        )}

        {/* Diff preview button */}
        {currentFilePath && (
          <Button
            variant="ghost"
            size={compact ? 'icon-sm' : 'sm'}
            onClick={handleDiff}
            className={cn(
              'gap-1.5',
              compact ? 'h-6 w-6' : 'h-7 px-2',
              'text-xs text-muted-foreground hover:text-foreground'
            )}
            title="Preview changes"
          >
            <Diff className="size-3" />
            {!compact && <span>Diff</span>}
          </Button>
        )}

        {/* Save button */}
        <Button
          variant="ghost"
          size={compact ? 'icon-sm' : 'sm'}
          onClick={() => setShowSaveDialog(true)}
          className={cn(
            'gap-1.5',
            compact ? 'h-6 w-6' : 'h-7 px-2',
            'text-xs text-muted-foreground hover:text-foreground'
          )}
          title="Save as file"
        >
          <FileDown className="size-3" />
          {!compact && <span>Save</span>}
        </Button>
      </div>

      {/* Run result display */}
      {runResult && (
        <div className="mt-2 border border-border rounded-md overflow-hidden">
          <div
            className={cn(
              'px-3 py-1.5 text-xs font-medium flex items-center gap-2',
              runResult.success
                ? 'bg-green-500/10 text-green-600'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {runResult.success ? (
              <>
                <Check className="size-3" />
                <span>Execution successful</span>
              </>
            ) : (
              <>
                <X className="size-3" />
                <span>Execution failed</span>
              </>
            )}
          </div>
          <div className="bg-black/90 p-3 font-mono text-xs text-green-400 max-h-48 overflow-auto">
            <pre>{runResult.success ? runResult.output : runResult.error}</pre>
          </div>
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Code to File</DialogTitle>
            <DialogDescription>
              Enter a filename to save this code snippet
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.ts"
              className="w-full"
            />
            {saveResult && !saveResult.success && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <X className="size-4" />
                  <span className="font-medium">Save failed</span>
                </div>
                {saveResult.error && (
                  <p className="text-xs text-destructive/90 mt-1">{saveResult.error}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!filename.trim() || isSaving}>
              <Download className="size-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff dialog */}
      {currentFilePath && (
        <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Preview Changes</DialogTitle>
              <DialogDescription>
                Comparing current file with suggested changes
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <DiffPreview code={code} currentFilePath={currentFilePath} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDiffDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleApply();
                  setShowDiffDialog(false);
                }}
              >
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * DiffPreview - Shows diff between current and new code
 */
function DiffPreview({ code, currentFilePath }: { code: string; currentFilePath: string }) {
  const [currentContent, setCurrentContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load current file content
  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    loadFileContent(currentFilePath)
      .then((content) => {
        if (isMounted) {
          setCurrentContent(content);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('Failed to load file content:', error);
          setCurrentContent('');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentFilePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Generate simple diff
  const diff = generateDiff(currentContent, code);

  return (
    <div className="bg-black/90 rounded-md p-4 font-mono text-xs overflow-auto max-h-96">
      {diff.map((line, index) => (
        <div
          key={index}
          className={cn(
            line.type === 'added' && 'bg-green-900/30 text-green-400',
            line.type === 'removed' && 'bg-red-900/30 text-red-400',
            line.type === 'unchanged' && 'text-gray-400'
          )}
        >
          <span className="inline-block w-6 text-right mr-2 text-gray-600">
            {line.lineNumber}
          </span>
          <span className="inline-block w-6 mr-2">
            {line.type === 'added' && '+'}
            {line.type === 'removed' && '-'}
            {line.type === 'unchanged' && ' '}
          </span>
          {line.content}
        </div>
      ))}
    </div>
  );
}

/**
 * Utility: Get default filename based on language
 */
function getDefaultFilename(language: string): string {
  const extensionMap: Record<string, string> = {
    typescript: '.ts',
    javascript: '.js',
    tsx: '.tsx',
    jsx: '.jsx',
    python: '.py',
    rust: '.rs',
    go: '.go',
    java: '.java',
    cpp: '.cpp',
    c: '.c',
    cs: '.cs',
    ruby: '.rb',
    php: '.php',
    swift: '.swift',
    kotlin: '.kt',
    sql: '.sql',
    sh: '.sh',
    bash: '.sh',
    yaml: '.yaml',
    json: '.json',
    html: '.html',
    css: '.css',
  };

  const extension = extensionMap[language.toLowerCase()] || '.txt';
  return `code${extension}`;
}

/**
 * Utility: Check if language is runnable
 * Only includes languages actually implemented in runCodeInTerminal
 */
function isRunnableLanguage(language: string): boolean {
  const runnableLanguages = [
    'typescript',
    'javascript',
    'python',
    'sh',
    'bash',
  ];

  return runnableLanguages.includes(language.toLowerCase());
}

/**
 * Utility: Run code in terminal via Tauri
 * Uses temp files to avoid shell interpolation vulnerabilities
 */
async function runCodeInTerminal(code: string, language: string): Promise<string> {
  try {
    const lang = language.toLowerCase();

    // For shell scripts, execute directly (already a shell command)
    if (lang === 'sh' || lang === 'bash') {
      const result = await invoke<{
        stdout: string;
        stderr: string;
        exit_code: number;
        success: boolean;
      }>('execute_command', {
        command: code,
        cwd: '.',
      });

      if (!result.success) {
        throw new Error(result.stderr || `Command failed with exit code ${result.exit_code}`);
      }

      return result.stdout;
    }

    // For other languages, write to temp file and execute
    const tempDir = await invoke<string>('get_temp_dir');
    const extensions: Record<string, string> = {
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
    };

    const extension = extensions[lang];
    if (!extension) {
      throw new Error(`Language ${language} is not supported for execution`);
    }

    // Create temp file with timestamp to avoid collisions
    const timestamp = Date.now();
    const tempFile = `${tempDir}/rainy_code_exec_${timestamp}${extension}`;

    // Write code to temp file
    await invoke('save_file_content', {
      path: tempFile,
      content: code,
    });

    try {
      // Build command based on language
      let command: string;

      switch (lang) {
        case 'typescript':
          // Use deno run with the temp file
          command = `deno run "${tempFile}"`;
          break;
        case 'javascript':
          // Use node with the temp file
          command = `node "${tempFile}"`;
          break;
        case 'python':
          // Use python with the temp file
          command = `python "${tempFile}"`;
          break;
        default:
          throw new Error(`Language ${language} is not supported for execution`);
      }

      // Execute the command
      const result = await invoke<{
        stdout: string;
        stderr: string;
        exit_code: number;
        success: boolean;
      }>('execute_command', {
        command,
        cwd: '.',
      });

      // Clean up temp file (best effort, don't fail if cleanup fails)
      try {
        await invoke('delete_path', { path: tempFile });
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }

      if (!result.success) {
        throw new Error(result.stderr || `Command failed with exit code ${result.exit_code}`);
      }

      return result.stdout;
    } catch (execError) {
      // Ensure cleanup even on error
      try {
        await invoke('delete_path', { path: tempFile });
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
      throw execError;
    }
  } catch (error) {
    throw new Error(`Failed to execute code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Utility: Download code as file
 */
function downloadAsFile(code: string, filename: string): void {
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Utility: Load file content via Tauri
 */
async function loadFileContent(filePath: string): Promise<string> {
  try {
    const content = await invoke<string>('get_file_content', {
      path: filePath,
    });
    return content;
  } catch {
    return '';
  }
}

/**
 * Utility: Generate simple diff
 */
function generateDiff(
  oldContent: string,
  newContent: string
): Array<{ type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber: number }> {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const diff: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
  }> = [];

  let oldIndex = 0;
  let newIndex = 0;
  let lineNumber = 1;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Only new lines left
      diff.push({
        type: 'added',
        content: newLines[newIndex],
        lineNumber: lineNumber++,
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Only old lines left
      diff.push({
        type: 'removed',
        content: oldLines[oldIndex],
        lineNumber: lineNumber++,
      });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: oldLines[oldIndex],
        lineNumber: lineNumber++,
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - mark as removed and added
      diff.push({
        type: 'removed',
        content: oldLines[oldIndex],
        lineNumber: lineNumber++,
      });
      oldIndex++;
    }
  }

  return diff;
}
