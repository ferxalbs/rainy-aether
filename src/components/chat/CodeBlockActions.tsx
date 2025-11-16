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

import { useState } from 'react';
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [filename, setFilename] = useState(getDefaultFilename(language));

  /**
   * Handle run code
   */
  const handleRun = async () => {
    if (!onRun) {
      // Default: Run via Tauri terminal
      await runCodeInTerminal(code, language);
      return;
    }

    setIsRunning(true);
    setRunResult(null);

    try {
      const output = await onRun(code, language);
      setRunResult({
        success: true,
        output,
      });
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
    if (!onSave) {
      // Default: Download as file
      downloadAsFile(code, filename);
      setShowSaveDialog(false);
      return;
    }

    const success = await onSave(code, filename);
    if (success) {
      setShowSaveDialog(false);
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
          <div className="py-4">
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.ts"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!filename.trim()}>
              <Download className="size-4 mr-2" />
              Save
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
  useState(() => {
    loadFileContent(currentFilePath).then((content) => {
      setCurrentContent(content);
      setLoading(false);
    });
  });

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
 */
function isRunnableLanguage(language: string): boolean {
  const runnableLanguages = [
    'typescript',
    'javascript',
    'python',
    'rust',
    'go',
    'sh',
    'bash',
    'ruby',
    'php',
  ];

  return runnableLanguages.includes(language.toLowerCase());
}

/**
 * Utility: Run code in terminal via Tauri
 */
async function runCodeInTerminal(code: string, language: string): Promise<string> {
  try {
    // Determine command based on language
    const commands: Record<string, string> = {
      typescript: `deno run -`,
      javascript: `node -e "${code.replace(/"/g, '\\"')}"`,
      python: `python -c "${code.replace(/"/g, '\\"')}"`,
      sh: code,
      bash: code,
    };

    const command = commands[language.toLowerCase()];
    if (!command) {
      throw new Error(`Language ${language} is not supported for execution`);
    }

    // Execute via Tauri
    const result = await invoke<string>('execute_command', {
      command,
      cwd: '.',
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to execute code: ${error}`);
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
