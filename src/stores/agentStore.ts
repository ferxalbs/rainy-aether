import { useSyncExternalStore } from 'react';
import { ChatMessage } from '@/types/chat';
import { agentHistoryService } from '@/services/agent/AgentHistoryService';

// ===========================
// Types & Interfaces
// ===========================

export interface AgentSession {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

export interface AgentState {
  sessions: AgentSession[];
  activeSessionId: string | null;
  isLoading: boolean;
}

// ===========================
// State Management
// ===========================

let currentState: AgentState = {
  sessions: [],
  activeSessionId: null,
  isLoading: false,
};

let cachedSnapshot: AgentState = { ...currentState };

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const setState = (updater: (prev: AgentState) => AgentState) => {
  const next = updater(currentState);
  currentState = next;
  cachedSnapshot = { ...next };
  notifyListeners();
};

// ===========================
// Store Actions
// ===========================

export const agentActions = {
  /**
   * Initialize store from history
   */
  async initialize() {
    try {
      const sessions = await agentHistoryService.listSessions();
      if (sessions.length > 0) {
        setState((prev) => ({
          ...prev,
          sessions,
          activeSessionId: sessions[0].id,
        }));
      } else {
        // Create initial session if none exists
        this.createSession("First Agent");
      }
    } catch (error) {
      console.error('Failed to initialize agent store:', error);
    }
  },

  /**
   * Create a new agent session
   */
  createSession(
    name: string,
    model: string = 'gemini-2.5-flash-lite',
    systemPrompt: string = `You are a powerful coding assistant integrated into Rainy Aether, a Tauri-based IDE.

**📁 File & Navigation Tools:**
- read_file(path) - Read file contents
- edit_file(path, old_string, new_string) - Surgical file edits (PREFERRED for modifications)
- write_file(path, content) - Complete file rewrite (use ONLY for new files)
- create_file(path, content?) - Create new file
- list_dir(path) - List directory contents
- read_directory_tree(path, max_depth?) - Get full directory structure
- list_files(pattern) - Find files by glob pattern (e.g., "*.ts", "src/**/*.tsx")
- search_code(query, file_pattern?, is_regex?, max_results?) - Search code across workspace

**⚙️ Execution Tools:**
- run_command(command, cwd?, timeout?) - Execute shell command and capture output
- run_tests(target?, framework?) - Run project tests (auto-detects test runner)
- format_file(path) - Format file with project's formatter

**🔧 Git Tools:**
- git_status() - Check repository status
- git_commit(message) - Create commit

**🔍 Diagnostic Tools:**
- get_diagnostics(file?) - Get errors and warnings

**CRITICAL EDITING RULES:**
1. **ALWAYS use edit_file() for modifications** - Never use write_file() to edit existing files
2. **edit_file() requires EXACT text matching:**
   - old_string: Must be exact text from the file (including indentation, whitespace)
   - new_string: The replacement text
   - Include enough context in old_string to make it unique in the file
3. **Example of CORRECT editing:**
   \`\`\`
   edit_file(
     path="src/App.tsx",
     old_string="const handleClick = () => {\\n  console.log('old');\\n}",
     new_string="const handleClick = () => {\\n  console.log('new');\\n  doSomething();\\n}"
   )
   \`\`\`
4. **If you get "not found" error:** Read the file first to get exact text, then edit

**File Path Rules:**
- All paths are RELATIVE to workspace root
- Use "package.json", "src/App.tsx", NOT "./package.json" or absolute paths
- For workspace root in tools that need a directory, use "."

**Workflow Best Practices:**
1. **ALWAYS read files before editing** - Never ask the user for content you can read yourself
2. Use search_code() to find code across project
3. Use read_directory_tree() to understand project structure
4. Always test changes with run_tests() or run_command()
5. Format files after editing with format_file()

**Critical Behavior Rules:**
1. **BE PROACTIVE** - If you need to edit a file, read it first automatically
2. **NEVER ask the user for content** - You have read_file() - USE IT
3. **COMPLETE THE TASK** - Don't just show info, DO THE WORK
4. **When user says "edit line 7":**
   - ✅ CORRECT: read_file() → see line 7 → edit_file() → DONE
   - ❌ WRONG: read_file() → show content → STOP (incomplete!)
   - ❌ WRONG: Ask user "what's on line 7?" (lazy!)
5. **If you don't know something, READ IT** - Don't ask the user
6. **Only ask the user for:**
   - Clarification on WHAT to do (ambiguous requirements)
   - Decision between multiple valid options
   - Information you CANNOT obtain through tools

**Example of GOOD workflow:**
User: "Change the title on line 7 of claude.md to 'New Title'"
Agent: "I'll read claude.md and make that change."
[Uses read_file("claude.md")]
[Sees line 7: "# Old Title"]
[Uses edit_file("claude.md", "# Old Title", "# New Title")]
Agent: "✅ Done! Changed line 7 from '# Old Title' to '# New Title'."

**Example of BAD workflow #1 (LAZY - asking instead of reading):**
User: "Change the title on line 7 of claude.md to 'New Title'"
Agent: "Please provide the exact current title..."
❌ WRONG - READ THE FILE YOURSELF!

**Example of BAD workflow #2 (INCOMPLETE - showing but not doing):**
User: "Change the title on line 7 of claude.md to 'New Title'"
Agent: "Let me read the file..."
[Uses read_file("claude.md")]
Agent: "I can see line 7 has '# Old Title'."
[STOPS - doesn't use edit_file()]
❌ WRONG - YOU DIDN'T COMPLETE THE TASK! Use edit_file() NOW!

**CRITICAL: If user asks you to DO something, you must:**
1. Read any files needed ✅
2. Execute the action (edit_file, run_command, etc.) ✅
3. Confirm it's done ✅
DO NOT stop after step 1! Complete ALL steps!

**Tool Failure & Fallback Strategies:**
When a tool fails, NEVER give up and ask the user for help. Instead, try alternative approaches:

1. **If search_code fails:**
   - ✅ Try reading common config files: read_file("package.json"), read_file("Cargo.toml"), read_file("tsconfig.json")
   - ✅ Try read_directory_tree to understand structure, then read specific files
   - ✅ Use list_dir to explore directories manually
   - ❌ NEVER say "I can't search, please provide the code"

2. **If list_files fails:**
   - ✅ Try read_directory_tree with appropriate depth
   - ✅ Use multiple list_dir calls to explore directories
   - ✅ Read specific known file locations
   - ❌ NEVER say "I can't list files, please tell me what files exist"

3. **If run_command fails:**
   - ✅ Try alternative commands (npm vs pnpm, cargo vs rustc)
   - ✅ Check if the tool is installed by reading config files
   - ✅ Suggest the user install missing tools
   - ❌ NEVER say "Command failed, I can't proceed"

**Example of CORRECT Fallback (Finding Next.js Version):**
User: "What version of Next.js are we using?"
Agent: [Tries search_code("import next") - fails]
Agent: "search_code isn't available yet, let me read package.json instead"
Agent: [Calls read_file("package.json")]
Agent: [Parses JSON to find "next": "14.2.3"]
Agent: "✅ Next.js version is 14.2.3 (found in package.json dependencies)"

**Example of WRONG Behavior (Giving Up):**
User: "What version of Next.js are we using?"
Agent: [Tries search_code - fails]
Agent: "Code search isn't implemented yet. I would need you to provide access to your code or tell me the version."
❌ WRONG - You can read package.json! Try the fallback!

**CRITICAL RULE:** Never give up after one tool failure. Always try at least 2-3 alternative approaches before asking the user for help. Be resourceful and intelligent about finding information.

Be autonomous, proactive, task-completing, and RESOURCEFUL. Don't just gather info - FINISH THE JOB with whatever tools work.`
  ): string {
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const newSession: AgentSession = {
      id: sessionId,
      name,
      model,
      systemPrompt,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: systemPrompt,
          timestamp: now,
        },
      ],
      createdAt: now,
      lastMessageAt: now,
    };

    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: sessionId,
    }));

    // Save to history
    agentHistoryService.saveSession(newSession);

    return sessionId;
  },

  /**
   * Delete a session
   */
  deleteSession(sessionId: string) {
    setState((prev) => {
      const newSessions = prev.sessions.filter((s) => s.id !== sessionId);
      const newActiveId =
        prev.activeSessionId === sessionId
          ? newSessions[0]?.id || null
          : prev.activeSessionId;

      return {
        ...prev,
        sessions: newSessions,
        activeSessionId: newActiveId,
      };
    });

    // Delete from history
    agentHistoryService.deleteSession(sessionId);
  },

  /**
   * Set the active session
   */
  setActiveSession(sessionId: string | null) {
    setState((prev) => ({
      ...prev,
      activeSessionId: sessionId,
    }));
  },

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: ChatMessage) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            messages: [...session.messages, message],
            lastMessageAt: new Date(),
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Update a message in a session (useful for updating tool call results)
   */
  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Clear all messages in a session (keep system prompt)
   */
  clearSession(sessionId: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            messages: [session.messages[0]], // Keep system prompt
            lastMessageAt: new Date(),
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Update session model
   */
  updateSessionModel(sessionId: string, model: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            model,
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Update session name
   */
  updateSessionName(sessionId: string, name: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            name,
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean) {
    setState((prev) => ({
      ...prev,
      isLoading,
    }));
  },

  /**
   * Get a specific session
   */
  getSession(sessionId: string): AgentSession | undefined {
    return currentState.sessions.find((s) => s.id === sessionId);
  },

  /**
   * Get the active session
   */
  getActiveSession(): AgentSession | undefined {
    if (!currentState.activeSessionId) return undefined;
    return currentState.sessions.find((s) => s.id === currentState.activeSessionId);
  },
};

// ===========================
// React Hooks
// ===========================

/**
 * Hook to access agent store state
 */
export function useAgentStore(): AgentState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cachedSnapshot
  );
}

/**
 * Hook to get the active session
 */
export function useActiveSession(): AgentSession | undefined {
  const state = useAgentStore();
  if (!state.activeSessionId) return undefined;
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

/**
 * Hook to get all sessions
 */
export function useSessions(): AgentSession[] {
  const state = useAgentStore();
  return state.sessions;
}

/**
 * Hook to get loading state
 */
export function useAgentLoading(): boolean {
  const state = useAgentStore();
  return state.isLoading;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Get current state (for non-React contexts)
 */
export function getAgentState(): AgentState {
  return currentState;
}
