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
      name: "apply_edit",
      description: "Overwrites or modifies a file with new content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The relative path of the file to edit." },
          content: { type: "string", description: "The new content for the file." },
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
          return { success: true, message: `File '${path}' updated successfully.` };
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
          const children = await invoke<any[]>("load_directory_children", { path: resolvedPath });
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
      description: "Run a shell command in the terminal.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The command to run" },
        },
        required: ["command"],
      },
      execute: async ({ command }) => {
        try {
          if (!command || typeof command !== 'string') {
            return { success: false, error: 'Command parameter is required' };
          }
          const terminalService = getTerminalService();
          const workspace = getIDEState().workspace;

          // Create a new session for the command
          const sessionId = await terminalService.create({
            cwd: workspace?.path,
          });

          // Send command
          await terminalService.write(sessionId, command + "\r\n");

          return {
            success: true,
            message: `Command '${command}' sent to terminal session ${sessionId}. Check terminal panel for output.`,
            sessionId
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: `Failed to run command: ${errorMsg}` };
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