import { ChatMessage, ToolCall } from "@/types/chat";
import { toolRegistry } from "./ToolRegistry";

// Mock LLM response for now, since we don't have a real API key connected yet.
// In a real implementation, this would call OpenAI, Anthropic, or Gemini API.
const MOCK_LLM_DELAY = 1500;

interface AgentConfig {
  systemPrompt: string;
  model: string;
}

export class AgentService {
  private history: ChatMessage[] = [];
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    // Initialize history with system prompt
    this.history.push({
      id: "system-init",
      role: "system",
      content: config.systemPrompt,
      timestamp: new Date(),
    });
  }

  async sendMessage(content: string): Promise<ChatMessage> {
    // 1. Add user message to history
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    this.history.push(userMessage);

    // 2. Simulate LLM processing (replace with real API call)
    // This is where we'd send `this.history` and `toolRegistry.getAllTools()` to the LLM
    const response = await this.mockLLMProcess(content);

    // 3. Handle Tool Calls if any
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Execute tools
      for (const call of response.toolCalls) {
        try {
          call.status = "pending";
          const result = await toolRegistry.executeTool(call.name, call.arguments);
          call.result = result;
          call.status = "success";
        } catch (error) {
          call.error = String(error);
          call.status = "error";
        }
      }

      // 4. If tools were called, we'd typically send the results back to the LLM
      // for a final response. For this mock, we'll just return the response with tool results.
      // In a real loop:
      // this.history.push(response);
      // const finalResponse = await this.callLLM(this.history);
      // return finalResponse;
    }

    this.history.push(response);
    return response;
  }

  private async mockLLMProcess(userContent: string): Promise<ChatMessage> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LLM_DELAY));

    const lowerContent = userContent.toLowerCase();
    let toolCalls: ToolCall[] | undefined;
    let content = "I've processed your request.";

    // Simple keyword detection to simulate "intelligence" and tool usage
    if (lowerContent.includes("read") && lowerContent.includes("file")) {
      // Extract filename (very naive extraction for demo)
      const match = userContent.match(/read.*`?([\w./-]+)`?/);
      const path = match ? match[1] : "src/main.tsx"; // Default fallback
      
      toolCalls = [
        {
          id: crypto.randomUUID(),
          name: "read_file",
          arguments: { path },
        },
      ];
      content = `I'll read the file ${path} for you.`;
    } else if (lowerContent.includes("edit") || lowerContent.includes("change")) {
       const match = userContent.match(/edit.*`?([\w./-]+)`?/);
       const path = match ? match[1] : "src/main.tsx";

       toolCalls = [
        {
          id: crypto.randomUUID(),
          name: "apply_edit",
          arguments: {
            path,
            content: "// Edited by Agent\nconsole.log('Hello from Agent');"
          },
        },
      ];
      content = `I'm applying changes to ${path}.`;
    } else if (lowerContent.includes("list")) {
        toolCalls = [
            {
                id: crypto.randomUUID(),
                name: "list_dir",
                arguments: { path: "." }
            }
        ];
        content = "I'll list the files in the current directory.";
    } else if (lowerContent.includes("git") && lowerContent.includes("status")) {
        toolCalls = [
            {
                id: crypto.randomUUID(),
                name: "git_status",
                arguments: {}
            }
        ];
        content = "Checking git status...";
    } else if (lowerContent.includes("run") || lowerContent.includes("command")) {
        const match = userContent.match(/run.*`?([\w\s-]+)`?/);
        const command = match ? match[1] : "ls";
        toolCalls = [
            {
                id: crypto.randomUUID(),
                name: "run_command",
                arguments: { command }
            }
        ];
        content = `Running command: ${command}`;
    } else if (lowerContent.includes("error") || lowerContent.includes("problem")) {
        toolCalls = [
            {
                id: crypto.randomUUID(),
                name: "get_diagnostics",
                arguments: {}
            }
        ];
        content = "Checking for errors and warnings...";
    }
    else {
        content = "I understand. How else can I help you with your code today?";
    }

    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date(),
      toolCalls,
    };
  }

  getHistory(): ChatMessage[] {
    return this.history;
  }

  clearHistory() {
    this.history = [this.history[0]]; // Keep system prompt
  }
}