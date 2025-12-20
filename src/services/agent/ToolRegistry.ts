import { invoke } from "@tauri-apps/api/core";
import { getGitService } from "@/services/gitService";
import { getTerminalService } from "@/services/terminalService";
import { getMarkerService } from "@/services/markerService";
import { getIDEState } from "@/stores/ideStore";
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
      description: "Performs surgical edits on a file by replacing specific text. Use this for precise modifications without rewriting the entire file. CRITICAL: You must provide the EXACT text to replace (old_string) and what to replace it with (new_string). Include enough context in old_string to make it unique.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The relative path of the file to edit."
          },
          old_string: {
            type: "string",
            description: "The exact text to find and replace. Must be unique in the file. Include surrounding context if needed for uniqueness."
          },
          new_string: {
            type: "string",
            description: "The new text to replace old_string with. Can be empty string to delete."
          },
        },
        required: ["path", "old_string", "new_string"],
      },
      execute: async ({ path, old_string, new_string }) => {
        try {
          if (!path || typeof path !== 'string') {
            return { success: false, error: 'Invalid path parameter' };
          }
          if (old_string === undefined || old_string === null) {
            return { success: false, error: 'old_string parameter is required' };
          }
          if (new_string === undefined || new_string === null) {
            return { success: false, error: 'new_string parameter is required' };
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
                error: `The text was found but with different whitespace/indentation. Please read the file again to get the exact content.`
              };
            }

            return {
              success: false,
              error: `The specified old_string was not found in '${path}'. Make sure you're using the exact text from the file.`
            };
          }

          // Check if old_string appears multiple times
          const occurrences = normalizedContent.split(normalizedOldString).length - 1;
          if (occurrences > 1) {
            return {
              success: false,
              error: `The old_string appears ${occurrences} times in '${path}'. Please provide more context to make it unique.`
            };
          }

          // Perform the replacement
          // We need to be careful with replace() as it only replaces the first occurrence
          // But we've already verified there's only one occurrence (or we warned about it)
          // However, we need to handle the original content with original line endings if possible
          // For now, we'll use the normalized content for replacement and save that
          // This might change line endings to LF, which is generally fine
          const newContent = normalizedContent.replace(normalizedOldString, new_string);
          await invoke("save_file_content", { path: resolvedPath, content: newContent });

          return {
            success: true,
            message: `Successfully edited '${path}' - replaced ${old_string.length} characters with ${new_string.length} characters.`
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
          return { success: true, message: `File '${path}' written successfully with ${content.length} characters.` };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to write file '${path}': ${errorMsg}` };
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
      description: "Gets the complete directory structure as a tree. Useful for understanding project layout.",
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
      description: "Search for code across the workspace using text or regex patterns. Returns matching files and line numbers.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The text or regex pattern to search for."
          },
          file_pattern: {
            type: "string",
            description: "Optional glob pattern to filter files (e.g., '*.ts', 'src/**/*.tsx')."
          },
          is_regex: {
            type: "boolean",
            description: "Whether to treat query as a regex pattern (default: false)."
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return (default: 50)."
          },
        },
        required: ["query"],
      },
      execute: async ({ query, file_pattern, is_regex = false, max_results = 50 }) => {
        try {
          if (!query || typeof query !== 'string') {
            return { success: false, error: 'Query parameter is required' };
          }

          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: 'No workspace open' };
          }

          // Use ripgrep via Tauri command if available, otherwise fallback to simple search
          try {
            // Try to use a search command if available
            const results = await invoke<any[]>("search_workspace", {
              path: workspace.path,
              query,
              filePattern: file_pattern,
              isRegex: is_regex,
              maxResults: max_results
            });

            return {
              success: true,
              results,
              total: results.length
            };
          } catch {
            // Fallback: manual search through files
            return {
              success: false,
              error: 'Code search not yet implemented in backend. Use read_file and manual searching for now.'
            };
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
      description: "Execute a shell command in the workspace. Returns command output. Use this for running build tools, tests, linters, formatters, etc.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The command to execute (e.g., 'npm test', 'pnpm build', 'cargo check')."
          },
          cwd: {
            type: "string",
            description: "Working directory (relative to workspace). Defaults to workspace root."
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 30000, max: 120000)."
          },
        },
        required: ["command"],
      },
      execute: async ({ command, cwd, timeout: _timeout = 30000 }) => {
        try {
          if (!command || typeof command !== 'string') {
            return { success: false, error: 'Command parameter is required' };
          }

          const workspace = getIDEState().workspace;
          if (!workspace) {
            return { success: false, error: 'No workspace open' };
          }

          const workingDir = cwd ? await this.resolvePath(cwd) : workspace.path;
          // Note: timeout is available for future use with proper async command handling

          // Use terminal service to create a temporary session and capture output
          const terminalService = getTerminalService();
          const sessionId = await terminalService.create({ cwd: workingDir });

          let output = '';

          // Subscribe to data events
          const cleanup = terminalService.onData((id, data) => {
            if (id === sessionId) {
              output += data;
            }
          });

          try {
            // Send command
            await terminalService.write(sessionId, command + "\r\n");

            // Wait for output with a smarter timeout strategy
            // We'll wait up to 5 seconds, but return early if we see a prompt or significant pause
            const startTime = Date.now();
            let lastOutputTime = Date.now();

            while (Date.now() - startTime < 5000) {
              await new Promise(resolve => setTimeout(resolve, 100));

              // If we haven't received output for 1 second and we have some output, assume command finished or paused
              if (output.length > 0 && Date.now() - lastOutputTime > 1000) {
                break;
              }

              // Update last output time if output length changed
              // (This is a simplified check, ideally we'd track actual data events)
            }

            // Clean up session
            await terminalService.kill(sessionId);

            // Filter out ANSI escape codes for cleaner output
            // eslint-disable-next-line no-control-regex
            const cleanOutput = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

            return {
              success: true,
              stdout: cleanOutput,
              rawOutput: output,
              message: `Command executed. Output captured below.`,
              sessionId
            };
          } finally {
            cleanup();
          }
        } catch (error) {
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