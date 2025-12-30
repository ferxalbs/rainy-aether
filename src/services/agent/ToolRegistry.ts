import { invoke } from "@tauri-apps/api/core";
import { getGitService } from "@/services/gitService";
import { getTerminalService } from "@/services/terminalService";
import { getMarkerService } from "@/services/markerService";
import { getIDEState, ideActions } from "@/stores/ideStore";
import { editorActions } from "@/stores/editorStore";
import { inlineDiffActions } from "@/stores/inlineDiffStore";
import { computeLineDiff, diffToInlineChanges } from "@/services/inlineDiff/lineDiff";
import { join } from "@tauri-apps/api/path";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
  /** If true, tool execution is hidden from UI (no status shown) */
  internal?: boolean;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Resolve a path relative to the workspace
   */
  private async resolvePath(path: string): Promise<string> {
    const workspace = getIDEState().workspace;

    // If path is already absolute (starts with / or C:\ etc), return as-is
    if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) {
      return path;
    }

    // If no workspace, return the path as-is (will likely fail, but let backend handle it)
    if (!workspace) {
      return path;
    }

    // Resolve relative to workspace
    return await join(workspace.path, path);
  }

  private registerDefaultTools() {
    // --- Workspace Info Tool ---
    this.registerTool({
      name: "get_workspace_info",
      description: "Get information about the current workspace. Returns the workspace path, name, and basic info. Use this first to understand where you are working.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        try {
          const workspace = getIDEState().workspace;
          if (!workspace) {
            return {
              success: false,
              error: 'No workspace is currently open. Please open a folder first.'
            };
          }
          return {
            success: true,
            workspace: {
              name: workspace.name,
              path: workspace.path,
            },
            message: `Current workspace: ${workspace.name} at ${workspace.path}`
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to get workspace info: ${errorMsg}` };
        }
      },
    });

    // --- File System Tools ---
    this.registerTool({
      name: "read_file",
      description: "Reads the content of a file from the project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The relative path of the file to read." },
        },
        required: ["path"],
      },
      execute: async ({ path }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          const resolvedPath = await this.resolvePath(path);
          const content = await invoke<string>("get_file_content", { path: resolvedPath });
          return { success: true, content };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to read file '${path}': ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "edit_file",
      description: "Performs surgical edits on a file by replacing specific text. CRITICAL RULES: 1) old_string MUST match EXACTLY (including whitespace/indentation). 2) Include 3+ surrounding lines for uniqueness. 3) NEVER use to delete large blocks - use apply_file_diff instead. 4) If edit fails, READ THE FILE AGAIN.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The relative path of the file to edit."
          },
          old_string: {
            type: "string",
            description: "The exact text to find and replace. Must be unique in the file. Include 3+ surrounding lines for uniqueness."
          },
          new_string: {
            type: "string",
            description: "The new text to replace old_string with. Can be empty string to delete small sections only."
          },
        },
        required: ["path", "old_string", "new_string"],
      },
      execute: async ({ path, old_string, new_string }) => {
        try {
          // Enhanced validation for stable editing
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          if (old_string === undefined || old_string === null || old_string === '') {
            return {
              success: false,
              error: 'old_string parameter is required and cannot be empty. Use create_file for new files or write_file for complete rewrites.'
            };
          }
          if (new_string === undefined || new_string === null) {
            return { success: false, error: 'new_string parameter is required (can be empty string for deletions)' };
          }

          // Safety check: Warn about large deletions
          if (new_string === '' && old_string.length > 200) {
            console.warn(`[edit_file] Large deletion detected: ${old_string.length} characters. Consider using apply_file_diff instead.`);
          }

          const resolvedPath = await this.resolvePath(path);

          // Read current content
          const currentContent = await invoke<string>("get_file_content", { path: resolvedPath });

          // Normalize line endings for comparison
          const normalizedContent = currentContent.replace(/\r\n/g, '\n');
          const normalizedOldString = old_string.replace(/\r\n/g, '\n');

          // Check if old_string exists
          if (!normalizedContent.includes(normalizedOldString)) {
            // Try fuzzy matching or whitespace normalization if exact match fails
            const looseContent = normalizedContent.replace(/\s+/g, ' ');
            const looseOldString = normalizedOldString.replace(/\s+/g, ' ');

            if (looseContent.includes(looseOldString)) {
              return {
                success: false,
                error: `The text was found but with different whitespace/indentation. Please READ THE FILE AGAIN to get the exact content.`,
                hint: 'Use read_file to get current exact content before editing.'
              };
            }

            return {
              success: false,
              error: `The specified old_string was not found in '${path}'. The file may have changed.`,
              hint: 'Use read_file to get current content before editing.'
            };
          }

          // Check if old_string appears multiple times
          const occurrences = normalizedContent.split(normalizedOldString).length - 1;
          if (occurrences > 1) {
            return {
              success: false,
              error: `The old_string appears ${occurrences} times in '${path}'. Include more surrounding lines to make it unique.`,
              hint: 'Add 3+ lines of context before and after to make old_string unique.'
            };
          }

          // Perform the replacement
          const newContent = normalizedContent.replace(normalizedOldString, new_string);
          await invoke("save_file_content", { path: resolvedPath, content: newContent });

          // IMPORTANT: Update Monaco editor if this file is open
          const editor = editorActions.getCurrentEditor();
          if (editor) {
            const model = editor.getModel();
            const openFiles = getIDEState().openFiles;
            const isFileOpen = openFiles.some(f => f.path === resolvedPath);
            if (model && isFileOpen) {
              const currentValue = model.getValue();
              if (currentValue !== newContent) {
                model.setValue(newContent);
              }
            }
          }

          // Post-edit verification
          const verifyContent = await invoke<string>("get_file_content", { path: resolvedPath });
          const normalizedVerify = verifyContent.replace(/\r\n/g, '\n');

          // Check that old_string is gone (unless it equals new_string)
          if (normalizedOldString !== new_string && normalizedVerify.includes(normalizedOldString)) {
            return {
              success: false,
              error: 'Edit verification failed: old_string still present after edit.',
              hint: 'The file may have been modified by another process. Read the file again.'
            };
          }

          const changeType = new_string === '' ? 'deleted' :
            old_string.length < new_string.length ? 'added' : 'replaced';

          return {
            success: true,
            message: `Successfully ${changeType} content in '${path}' (${old_string.length} → ${new_string.length} characters).`,
            verified: true
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to edit file '${path}': ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "write_file",
      description: "Writes complete new content to a file, replacing all existing content. Use this ONLY for creating new files or complete rewrites. For modifications, use edit_file instead.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The relative path of the file to write." },
          content: { type: "string", description: "The complete new content for the file." },
        },
        required: ["path", "content"],
      },
      execute: async ({ path, content }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          if (content === undefined || content === null) {
            return { success: false, error: 'Content parameter is required' };
          }
          const resolvedPath = await this.resolvePath(path);
          await invoke("save_file_content", { path: resolvedPath, content });

          // IMPORTANT: Update Monaco editor if this file is open
          const editor = editorActions.getCurrentEditor();
          if (editor) {
            const model = editor.getModel();
            const openFiles = getIDEState().openFiles;
            const isFileOpen = openFiles.some(f => f.path === resolvedPath);
            if (model && isFileOpen) {
              const currentValue = model.getValue();
              if (currentValue !== content) {
                model.setValue(content);
              }
            }
          }

          return { success: true, message: `File '${path}' written successfully with ${content.length} characters.` };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to write file '${path}': ${errorMsg}` };
        }
      },
    });

    // --- Apply File Diff Tool ---
    // This tool shows a visual preview in the editor before applying changes
    this.registerTool({
      name: "apply_file_diff",
      description: `Apply changes to a file with VISUAL PREVIEW in the editor. Shows green highlighting for additions, red for deletions. User can accept (Cmd/Ctrl+Enter) or reject (Escape) changes.

USE THIS TOOL when making code modifications that the user should review before applying.
This provides a better user experience than edit_file or write_file as changes are previewed first.

After calling this tool, the user will see the changes highlighted in the editor and must accept or reject them.`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The relative path of the file to edit."
          },
          new_content: {
            type: "string",
            description: "The complete new content for the file."
          },
          description: {
            type: "string",
            description: "Brief description of what the changes accomplish."
          },
        },
        required: ["path", "new_content"],
      },
      execute: async ({ path, new_content, description }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          if (new_content === undefined || new_content === null) {
            return { success: false, error: 'new_content parameter is required' };
          }

          const resolvedPath = await this.resolvePath(path);

          // Read original content
          let originalContent = '';
          try {
            originalContent = await invoke<string>("get_file_content", { path: resolvedPath });
          } catch {
            // File might not exist, that's okay for new files
            originalContent = '';
          }

          // Check if file is open, if not open it
          const openFiles = getIDEState().openFiles;
          const isFileOpen = openFiles.some(f => f.path === resolvedPath);

          if (!isFileOpen) {
            // Open the file first
            const fileName = path.split('/').pop() || path;
            await ideActions.openFile({ path: resolvedPath, name: fileName, is_directory: false, children: [] });
            // Wait for editor to load
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Start inline diff session FIRST (stores original content for rejection)
          inlineDiffActions.startInlineDiff({
            fileUri: resolvedPath,
            agentId: 'rainy-agent',
            agentName: 'Rainy Agent',
            originalContent,
            description,
          });

          // Set the new content in the editor BEFORE computing/applying decorations
          // This way decorations will match the content the user sees
          const editor = editorActions.getCurrentEditor();
          if (editor) {
            const model = editor.getModel();
            if (model) {
              model.setValue(new_content);
            }
          }

          // NOW compute line-by-line differences (for decoration purposes only)
          const diffResult = computeLineDiff(originalContent, new_content);
          const inlineChanges = diffToInlineChanges(diffResult);

          // Stream changes to apply decorations (now they match the new content)
          inlineDiffActions.streamChangesBatch(inlineChanges);

          // Finish streaming
          inlineDiffActions.finishStreaming();

          return {
            success: true,
            status: 'pending_approval',
            message: `Changes proposed for '${path}'. +${diffResult.additions} lines, -${diffResult.deletions} lines, ~${diffResult.modifications} modified. User must accept (Cmd/Ctrl+Enter) or reject (Escape).`,
            path: resolvedPath,
            additions: diffResult.additions,
            deletions: diffResult.deletions,
            modifications: diffResult.modifications,
            description,
            hint: 'Changes are highlighted in the editor. Press Cmd/Ctrl+Enter to accept or Escape to reject.',
          };
        } catch (error) {
          // Clean up on error
          inlineDiffActions.clearSession();
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to apply diff to '${path}': ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "list_dir",
      description: "Lists files and directories in a given path.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The relative path of the directory to list." },
        },
        required: ["path"],
      },
      execute: async ({ path }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          const resolvedPath = await this.resolvePath(path);

          // Add timeout to prevent hanging
          const timeoutMs = 10000; // 10 seconds
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`list_dir timed out after ${timeoutMs}ms`)), timeoutMs)
          );

          const children = await Promise.race([
            invoke<any[]>("load_directory_children", { path: resolvedPath }),
            timeoutPromise
          ]);

          return {
            success: true,
            files: children.map((child) => ({
              name: child.name,
              path: child.path,
              isDirectory: child.is_directory,
            })),
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to list directory '${path}': ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "read_directory_tree",
      description: "Gets the complete directory structure as a tree. Automatically skips .gitignore patterns (node_modules, .git, dist, build, etc.).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The relative path of the directory (use '.' for workspace root)."
          },
          max_depth: {
            type: "number",
            description: "Maximum depth to traverse (default: 3, max: 5)."
          },
        },
        required: ["path"],
      },
      execute: async ({ path, max_depth = 3 }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }

          const depth = Math.min(max_depth || 3, 5);
          const resolvedPath = await this.resolvePath(path);
          const startTime = Date.now();
          const maxDuration = 30000; // 30 seconds total

          // Directories to always skip (common .gitignore patterns)
          const IGNORED_DIRS = new Set([
            'node_modules', '.git', 'dist', 'build', '.next', 'out',
            'target', '.cache', '.turbo', 'coverage', '.nyc_output',
            'vendor', 'bower_components', '.pnpm', '__pycache__',
            '.venv', 'venv', '.tox', '.pytest_cache', 'eggs', '*.egg-info'
          ]);

          const invokeWithTimeout = async <T>(cmd: string, args: any): Promise<T> => {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('invoke timeout')), 5000)
            );
            return Promise.race([invoke<T>(cmd, args), timeoutPromise]);
          };

          const buildTree = async (dirPath: string, currentDepth: number): Promise<any> => {
            // Check overall timeout
            if (Date.now() - startTime > maxDuration) {
              throw new Error('read_directory_tree timed out');
            }

            if (currentDepth > depth) return null;

            try {
              const children = await invokeWithTimeout<any[]>("load_directory_children", { path: dirPath });
              const tree: any = { directories: [], files: [] };

              for (const child of children) {
                if (Date.now() - startTime > maxDuration) break;

                // Skip ignored directories
                if (child.is_directory && IGNORED_DIRS.has(child.name)) {
                  continue; // Skip node_modules, .git, etc.
                }

                if (child.is_directory) {
                  const subtree = await buildTree(child.path, currentDepth + 1);
                  tree.directories.push({
                    name: child.name,
                    path: child.path,
                    children: subtree
                  });
                } else {
                  tree.files.push({
                    name: child.name,
                    path: child.path
                  });
                }
              }

              return tree;
            } catch {
              return null;
            }
          };

          const tree = await buildTree(resolvedPath, 0);
          return {
            success: true,
            tree,
            message: `Directory tree for '${path}' (depth: ${depth})`
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to read directory tree: ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "search_code",
      description: `Search for code using ripgrep (rg). Fast regex-powered search.

⚠️ IMPORTANT USAGE RULES:
- Call this tool ONCE per search query
- After getting results, PRESENT THEM TO THE USER
- Do NOT call again with the same or similar query
- If search fails, try a different approach (read_file, list_dir)

Examples:
- search_code({ query: "TODO:" }) - Find all TODOs
- search_code({ query: "function.*auth", is_regex: true }) - Regex search
- search_code({ query: "useState", file_pattern: "*.tsx" }) - Filter by file type`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The text or regex pattern to search for."
          },
          file_pattern: {
            type: "string",
            description: "Glob pattern to filter files (e.g., '*.ts', '*.{ts,tsx}')."
          },
          path: {
            type: "string",
            description: "Directory to search in (relative to workspace). Default: entire workspace."
          },
          is_regex: {
            type: "boolean",
            description: "Treat query as regex (default: false, literal search)."
          },
          case_sensitive: {
            type: "boolean",
            description: "Case sensitive search (default: true)."
          },
          context_lines: {
            type: "number",
            description: "Number of context lines before/after match (default: 0)."
          },
          max_results: {
            type: "number",
            description: "Maximum results to return (default: 50)."
          },
        },
        required: ["query"],
      },
      execute: async ({
        query,
        file_pattern,
        path = ".",
        is_regex = false,
        case_sensitive = true,
        context_lines = 0,
        max_results = 50
      }) => {
        try {
          if (!query || typeof query !== 'string') {
            return { success: false, error: 'Query parameter is required' };
          }

          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: 'No workspace open' };
          }

          // Build ripgrep command
          const args: string[] = ['rg'];

          // Output format: file:line:content
          args.push('--line-number');
          args.push('--no-heading');
          args.push('--color=never');

          // Max count
          args.push(`--max-count=${Math.ceil(max_results / 5)}`); // Per file limit

          // Case sensitivity
          if (!case_sensitive) {
            args.push('--ignore-case');
          }

          // Fixed string vs regex
          if (!is_regex) {
            args.push('--fixed-strings');
          }

          // Context lines
          if (context_lines > 0) {
            args.push(`--context=${Math.min(context_lines, 5)}`);
          }

          // File pattern filter
          if (file_pattern) {
            args.push(`--glob=${file_pattern}`);
          }

          // Exclude common .gitignore patterns
          args.push('--glob=!node_modules');
          args.push('--glob=!.git');
          args.push('--glob=!dist');
          args.push('--glob=!build');
          args.push('--glob=!.next');
          args.push('--glob=!out');
          args.push('--glob=!target');
          args.push('--glob=!.cache');
          args.push('--glob=!.turbo');
          args.push('--glob=!coverage');
          args.push('--glob=!.nyc_output');
          args.push('--glob=!vendor');
          args.push('--glob=!bower_components');
          args.push('--glob=!.pnpm');
          args.push('--glob=!__pycache__');
          args.push('--glob=!.venv');
          args.push('--glob=!venv');
          args.push('--glob=!*.lock');
          args.push('--glob=!*.log');

          // The search pattern (escaped for shell)
          const escapedQuery = query.replace(/"/g, '\\"');
          args.push(`"${escapedQuery}"`);

          // Search path
          const searchPath = await this.resolvePath(path);
          args.push(`"${searchPath}"`);

          const command = args.join(' ');

          // Execute via run_command
          const terminalService = getTerminalService();
          const sessionId = await terminalService.create({ cwd: workspace.path });

          let output = '';
          const cleanup = terminalService.onData((id, data) => {
            if (id === sessionId) {
              output += data;
            }
          });

          try {
            await terminalService.write(sessionId, command + "\r\n");

            // Wait for output
            const startTime = Date.now();
            while (Date.now() - startTime < 5000) {
              await new Promise(resolve => setTimeout(resolve, 100));
              if (output.length > 100 && Date.now() - startTime > 500) break;
            }

            await terminalService.kill(sessionId);

            // Parse ripgrep output
            // eslint-disable-next-line no-control-regex
            const cleanOutput = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
            const lines = cleanOutput.split('\n').filter(l => l.includes(':'));

            const results: Array<{ file: string; line: number; content: string }> = [];

            for (const line of lines.slice(0, max_results)) {
              // Format: file:line:content
              const match = line.match(/^([^:]+):(\d+):(.*)$/);
              if (match) {
                results.push({
                  file: match[1].replace(workspace.path, '.'),
                  line: parseInt(match[2], 10),
                  content: match[3].trim()
                });
              }
            }

            if (results.length === 0) {
              return {
                success: true,
                message: `No matches found for "${query}"`,
                results: [],
                total: 0
              };
            }

            return {
              success: true,
              results,
              total: results.length,
              message: `Found ${results.length} matches for "${query}"`
            };
          } finally {
            cleanup();
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Search failed: ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "list_files",
      description: "List all files in the workspace matching a pattern. Faster than read_directory_tree for finding specific files.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Glob pattern to match files (e.g., '*.ts', 'src/**/*.tsx', '*.{js,ts}')."
          },
        },
        required: ["pattern"],
      },
      execute: async ({ pattern }) => {
        try {
          if (!pattern || typeof pattern !== 'string') {
            return { success: false, error: 'Pattern parameter is required' };
          }

          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: 'No workspace open' };
          }

          // Try to use glob command if available
          try {
            const files = await invoke<string[]>("glob_files", {
              path: workspace.path,
              pattern
            });

            return {
              success: true,
              files,
              total: files.length
            };
          } catch {
            return {
              success: false,
              error: 'File globbing not yet implemented in backend. Use list_dir for now.'
            };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to list files: ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "create_file",
      description: "Creates a new file with optional initial content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path where the file should be created." },
          content: { type: "string", description: "Initial content of the file (optional)." },
        },
        required: ["path"],
      },
      execute: async ({ path, content }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          const resolvedPath = await this.resolvePath(path);
          await invoke("create_file", { path: resolvedPath });
          if (content) {
            await invoke("save_file_content", { path: resolvedPath, content });
          }
          return { success: true, message: `File '${path}' created successfully.` };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to create file '${path}': ${errorMsg}` };
        }
      },
    });

    // --- Git Tools ---
    this.registerTool({
      name: "git_status",
      description: "Get the current git status of the workspace.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        try {
          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: "No workspace open" };
          }
          const gitService = getGitService(workspace.path);
          const status = await gitService.getGitStatus();
          return { success: true, ...status };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to get git status: ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "git_commit",
      description: "Commit changes to the repository.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Commit message" },
        },
        required: ["message"],
      },
      execute: async ({ message }) => {
        try {
          if (!message || typeof message !== 'string') {
            return { success: false, error: 'Commit message is required' };
          }
          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: "No workspace open" };
          }
          const gitService = getGitService(workspace.path);
          const success = await gitService.commit(message);
          return {
            success,
            message: success ? `Committed with message: "${message}"` : 'Commit failed'
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to commit: ${errorMsg}` };
        }
      },
    });

    // --- Terminal Tools ---
    this.registerTool({
      name: "run_command",
      description: "Execute a shell command in the workspace. Returns command output. Use for builds, tests, linters, formatters. Commands have 30s default timeout; use 60000ms for linters/type-checks, 120000ms for builds/tests.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The command to execute (e.g., 'npm test', 'pnpm build', 'cargo check', 'npx tsc --noEmit')."
          },
          cwd: {
            type: "string",
            description: "Working directory (relative to workspace). Defaults to workspace root."
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds. Default: 30000. Use 60000 for linters/type-checks, 120000 for builds/tests."
          },
        },
        required: ["command"],
      },
      execute: async ({ command, cwd, timeout = 30000 }) => {
        try {
          if (!command || typeof command !== 'string') {
            return { success: false, error: 'Command parameter is required' };
          }

          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: 'No workspace open' };
          }

          const workingDir = cwd ? await this.resolvePath(cwd) : workspace.path;

          // Production timeout: min 30s, max 120s
          const effectiveTimeout = Math.min(Math.max(timeout, 30000), 120000);
          console.log(`[run_command] Executing: "${command}" in ${workingDir} (timeout: ${effectiveTimeout}ms)`);

          // Use terminal service to create a temporary session and capture output
          const terminalService = getTerminalService();

          let sessionId: string;
          try {
            sessionId = await terminalService.create({ cwd: workingDir });
            console.log(`[run_command] Created session: ${sessionId}`);
          } catch (createError) {
            console.error('[run_command] Failed to create terminal session:', createError);
            return {
              success: false,
              error: `Failed to create terminal: ${createError instanceof Error ? createError.message : String(createError)}`
            };
          }

          let output = '';
          let outputSettledCount = 0;
          let lastOutputLength = 0;

          // Subscribe to data events BEFORE sending command
          const cleanup = terminalService.onData((id, data) => {
            if (id === sessionId) {
              output += data;
            }
          });

          const startTime = Date.now();

          try {
            // Small delay to ensure event subscription is set up
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send command
            await terminalService.write(sessionId, command + "\r\n");
            console.log(`[run_command] Command sent to terminal`);

            // Wait for output using a simpler strategy:
            // Check every 500ms, exit when output has been stable for 3 checks (1.5s)
            // This handles both fast commands and slow commands like tsc
            const pollInterval = 500;
            const settlementThreshold = 3; // 1.5 seconds of no change

            while (Date.now() - startTime < effectiveTimeout) {
              await new Promise(resolve => setTimeout(resolve, pollInterval));

              const currentLength = output.length;
              const totalElapsed = Date.now() - startTime;

              if (currentLength === lastOutputLength) {
                outputSettledCount++;

                // Command is done if output hasn't changed for 1.5 seconds
                // and we have at least SOME output (command echoed back)
                if (outputSettledCount >= settlementThreshold && currentLength > 0) {
                  console.log(`[run_command] Output settled after ${totalElapsed}ms (${currentLength} bytes)`);
                  break;
                }

                // For commands with no output, wait at least 10 seconds
                if (totalElapsed > 10000 && currentLength === 0 && outputSettledCount >= 6) {
                  console.log(`[run_command] No output after ${totalElapsed}ms, assuming silent success`);
                  break;
                }
              } else {
                // Output changed, reset counter
                outputSettledCount = 0;
                lastOutputLength = currentLength;
              }

              // Progress log for long commands
              if (totalElapsed > 5000 && totalElapsed % 5000 < pollInterval) {
                console.log(`[run_command] Still waiting... ${(totalElapsed / 1000).toFixed(1)}s elapsed, ${currentLength} bytes output`);
              }
            }

            const totalTime = Date.now() - startTime;

            // Clean up session
            try {
              await terminalService.kill(sessionId);
            } catch (killError) {
              console.warn('[run_command] Failed to kill session:', killError);
            }

            // Filter out ANSI escape codes for cleaner output
            // eslint-disable-next-line no-control-regex
            const cleanOutput = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

            // Check if command output indicates an error (for informational purposes)
            const hasErrors = /error|Error|ERROR|failed|Failed|FAILED/.test(cleanOutput);

            console.log(`[run_command] Completed in ${totalTime}ms with ${cleanOutput.length} bytes${hasErrors ? ' (contains errors)' : ''}`);

            // Debug: log first 500 chars of output to verify capture
            if (cleanOutput.length > 0) {
              console.log(`[run_command] Output preview (first 500 chars):\n${cleanOutput.slice(0, 500)}`);
            } else {
              console.warn(`[run_command] WARNING: No output captured!`);
            }

            // Prepare result
            const result = {
              success: true,
              stdout: cleanOutput,
              exitedWithErrors: hasErrors,
              message: `Command "${command}" executed in ${totalTime}ms.`,
              duration: totalTime
            };

            console.log(`[run_command] Returning result with ${cleanOutput.length} bytes of stdout`);
            return result;
          } finally {
            cleanup();
          }
        } catch (error) {
          console.error('[run_command] Critical error:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to execute command: ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "run_tests",
      description: "Run tests in the project. Automatically detects the test runner (npm, pnpm, cargo, etc.).",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "Specific test file or suite to run (optional)."
          },
          framework: {
            type: "string",
            description: "Test framework override: 'npm', 'pnpm', 'cargo', 'pytest', etc."
          },
        },
        required: [],
      },
      execute: async ({ target, framework }) => {
        try {
          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: 'No workspace open' };
          }

          // Detect test command
          let testCommand = '';
          if (framework) {
            testCommand = `${framework} test ${target || ''}`;
          } else {
            // Auto-detect from workspace
            try {
              const packageJson = await invoke<string>("get_file_content", {
                path: await join(workspace.path, "package.json")
              });
              if (packageJson) {
                const pkg = JSON.parse(packageJson);
                if (pkg.scripts?.test) {
                  testCommand = `pnpm test ${target || ''}`;
                }
              }
            } catch {
              // Try Cargo
              try {
                await invoke<string>("get_file_content", {
                  path: await join(workspace.path, "Cargo.toml")
                });
                testCommand = `cargo test ${target || ''}`;
              } catch {
                return {
                  success: false,
                  error: 'Could not detect test framework. Please specify framework parameter.'
                };
              }
            }
          }

          // Execute the test command
          const tool = this.getTool('run_command');
          if (!tool) {
            return { success: false, error: 'run_command tool not available' };
          }

          return await tool.execute({ command: testCommand.trim(), timeout: 120000 });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to run tests: ${errorMsg}` };
        }
      },
    });

    this.registerTool({
      name: "format_file",
      description: "Format a file using the project's formatter (Prettier, rustfmt, etc.).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The relative path of the file to format."
          },
        },
        required: ["path"],
      },
      execute: async ({ path }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Path parameter is required' };
          }

          const resolvedPath = await this.resolvePath(path);
          const ext = path.split('.').pop()?.toLowerCase();

          let formatCommand = '';
          if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html'].includes(ext || '')) {
            formatCommand = `pnpm prettier --write "${resolvedPath}"`;
          } else if (['rs'].includes(ext || '')) {
            formatCommand = `rustfmt "${resolvedPath}"`;
          } else {
            return {
              success: false,
              error: `No formatter configured for .${ext} files`
            };
          }

          const tool = this.getTool('run_command');
          if (!tool) {
            return { success: false, error: 'run_command tool not available' };
          }

          return await tool.execute({ command: formatCommand });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to format file: ${errorMsg}` };
        }
      },
    });

    // --- Diagnostic Tools ---
    this.registerTool({
      name: "get_diagnostics",
      description: "Get current errors and warnings in the project.",
      parameters: {
        type: "object",
        properties: {
          file: { type: "string", description: "Optional file path to filter diagnostics" },
        },
        required: [],
      },
      execute: async ({ file }) => {
        try {
          const markerService = getMarkerService();
          const markers = markerService.read(file ? { resource: file } : undefined);
          return {
            success: true,
            diagnostics: markers.map(m => ({
              message: m.message,
              file: m.resource,
              line: m.startLineNumber,
              severity: m.severity
            }))
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to get diagnostics: ${errorMsg}` };
        }
      },
    });
  }

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return await tool.execute(args);
  }
}

export const toolRegistry = new ToolRegistry();