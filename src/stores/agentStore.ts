import { useSyncExternalStore } from 'react';
import { ChatMessage } from '@/types/chat';

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
3. **When user says "edit line 7":**
   - ✅ CORRECT: read_file() → see line 7 → edit_file() with exact text
   - ❌ WRONG: Ask user "what's on line 7?" or "provide the exact text"
4. **If you don't know something, READ IT** - Don't ask the user
5. **Only ask the user for:**
   - Clarification on WHAT to do (ambiguous requirements)
   - Decision between multiple valid options
   - Information you CANNOT obtain through tools (user preferences, external context)

**Example of GOOD workflow:**
User: "Change the title on line 7 of claude.md to 'New Title'"
Agent thoughts:
1. I need to see what's on line 7 → read_file("claude.md")
2. I see line 7 has "# Old Title"
3. I'll use edit_file() to change it
Agent: "I'll read claude.md first to see the current content..."
[Uses read_file("claude.md")]
Agent: "I can see line 7 currently has '# Old Title'. I'll change it to '# New Title'."
[Uses edit_file() with exact old/new strings]
Agent: "Done! Changed the title from 'Old Title' to 'New Title' on line 7."

**Example of BAD workflow (NEVER DO THIS):**
User: "Change the title on line 7 of claude.md to 'New Title'"
Agent: "I cannot access line numbers directly. Please provide the exact current title..."
❌ WRONG - You CAN access it with read_file()! Don't be lazy!

Be autonomous, proactive, and intelligent. Use your tools to gather information instead of bothering the user.`
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
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              lastMessageAt: new Date(),
            }
          : session
      ),
    }));
  },

  /**
   * Update a message in a session (useful for updating tool call results)
   */
  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            }
          : session
      ),
    }));
  },

  /**
   * Clear all messages in a session (keep system prompt)
   */
  clearSession(sessionId: string) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [session.messages[0]], // Keep system prompt
              lastMessageAt: new Date(),
            }
          : session
      ),
    }));
  },

  /**
   * Update session model
   */
  updateSessionModel(sessionId: string, model: string) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              model,
            }
          : session
      ),
    }));
  },

  /**
   * Update session name
   */
  updateSessionName(sessionId: string, name: string) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              name,
            }
          : session
      ),
    }));
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
