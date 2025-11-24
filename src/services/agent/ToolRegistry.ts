import { invoke } from "@tauri-apps/api/core";
import { getGitService } from "@/services/gitService";
import { getTerminalService } from "@/services/terminalService";
import { getMarkerService } from "@/services/markerService";
import { getIDEState } from "@/stores/ideStore";

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
          const content = await invoke<string>("get_file_content", { path });
          return { content };
        } catch (error) {
          return { error: `Failed to read file: ${error}` };
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
          await invoke("save_file_content", { path, content });
          return { success: true, message: `File ${path} updated successfully.` };
        } catch (error) {
          return { error: `Failed to write file: ${error}` };
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
          const children = await invoke<any[]>("load_directory_children", { path });
          return {
            files: children.map((child) => ({
              name: child.name,
              path: child.path,
              isDirectory: child.is_directory,
            })),
          };
        } catch (error) {
          return { error: `Failed to list directory: ${error}` };
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
          await invoke("create_file", { path });
          if (content) {
            await invoke("save_file_content", { path, content });
          }
          return { success: true, message: `File ${path} created successfully.` };
        } catch (error) {
          return { error: `Failed to create file: ${error}` };
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
        const workspace = getIDEState().workspace;
        if (!workspace) return { error: "No workspace open" };
        const gitService = getGitService(workspace.path);
        return await gitService.getGitStatus();
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
        const workspace = getIDEState().workspace;
        if (!workspace) return { error: "No workspace open" };
        const gitService = getGitService(workspace.path);
        const success = await gitService.commit(message);
        return { success };
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
        const terminalService = getTerminalService();
        const workspace = getIDEState().workspace;
        try {
          // Create a new session for the command
          const sessionId = await terminalService.create({
            cwd: workspace?.path,
          });
          
          // Send command
          await terminalService.write(sessionId, command + "\r\n");
          
          return { 
            success: true, 
            message: `Command '${command}' sent to terminal session ${sessionId}. Check terminal panel for output.` 
          };
        } catch (error) {
          return { error: `Failed to run command: ${error}` };
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
        const markerService = getMarkerService();
        const markers = markerService.read(file ? { resource: file } : undefined);
        return {
          diagnostics: markers.map(m => ({
            message: m.message,
            file: m.resource,
            line: m.startLineNumber,
            severity: m.severity
          }))
        };
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