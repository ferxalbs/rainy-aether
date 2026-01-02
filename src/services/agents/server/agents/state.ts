/**
 * State Manager
 * 
 * Persistent state layer for agent execution:
 * - Conversation history
 * - Task context
 * - Long-term memory
 * - File modification tracking
 */

import type { AgentKitAgentType } from './network';

// ===========================
// Types
// ===========================

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    agentType?: AgentKitAgentType;
    toolCalls?: ToolCallRecord[];
}

export interface ToolCallRecord {
    id: string;
    tool: string;
    args: Record<string, unknown>;
    result?: unknown;
    success: boolean;
    durationMs: number;
}

export interface TaskState {
    taskId: string;
    workspace: string;
    currentFile?: string;
    startedAt: number;
    completedAt?: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    agentsUsed: AgentKitAgentType[];
    toolsUsed: string[];
    filesModified: string[];
    iterations: number;
    error?: string;
}

export interface ConversationState {
    id: string;
    workspace: string;
    messages: Message[];
    tasks: TaskState[];
    context: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
}

export interface MemoryItem {
    id: string;
    type: 'file' | 'decision' | 'preference' | 'fact';
    content: string;
    relevance: number;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
    metadata?: Record<string, unknown>;
}

// ===========================
// In-Memory State Store
// ===========================

class StateStore {
    private conversations: Map<string, ConversationState> = new Map();
    private memory: Map<string, MemoryItem> = new Map();
    private activeTask: TaskState | null = null;

    // ========== Conversation Management ==========

    /**
     * Create or get a conversation
     */
    getOrCreateConversation(id: string, workspace: string): ConversationState {
        let conv = this.conversations.get(id);
        if (!conv) {
            conv = {
                id,
                workspace,
                messages: [],
                tasks: [],
                context: {},
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            this.conversations.set(id, conv);
        }
        return conv;
    }

    /**
     * Get conversation by ID
     */
    getConversation(id: string): ConversationState | undefined {
        return this.conversations.get(id);
    }

    /**
     * Add message to conversation
     */
    addMessage(conversationId: string, message: Omit<Message, 'timestamp'>): void {
        const conv = this.conversations.get(conversationId);
        if (conv) {
            conv.messages.push({
                ...message,
                timestamp: Date.now(),
            });
            conv.updatedAt = Date.now();
        }
    }

    /**
     * Get recent messages from conversation
     */
    getRecentMessages(conversationId: string, count: number = 10): Message[] {
        const conv = this.conversations.get(conversationId);
        if (!conv) return [];
        return conv.messages.slice(-count);
    }

    /**
     * Get messages as formatted string for context
     */
    getMessagesAsContext(conversationId: string, count: number = 5): string {
        const messages = this.getRecentMessages(conversationId, count);
        return messages
            .map(m => `${m.role}: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
            .join('\n');
    }

    // ========== Task Management ==========

    /**
     * Start a new task
     */
    startTask(taskId: string, workspace: string, currentFile?: string): TaskState {
        const task: TaskState = {
            taskId,
            workspace,
            currentFile,
            startedAt: Date.now(),
            status: 'running',
            agentsUsed: [],
            toolsUsed: [],
            filesModified: [],
            iterations: 0,
        };
        this.activeTask = task;
        return task;
    }

    /**
     * Get active task
     */
    getActiveTask(): TaskState | null {
        return this.activeTask;
    }

    /**
     * Update active task
     */
    updateTask(updates: Partial<TaskState>): void {
        if (this.activeTask) {
            Object.assign(this.activeTask, updates);
        }
    }

    /**
     * Record agent used in task
     */
    recordAgentUsed(agent: AgentKitAgentType): void {
        if (this.activeTask && !this.activeTask.agentsUsed.includes(agent)) {
            this.activeTask.agentsUsed.push(agent);
        }
    }

    /**
     * Record tool used in task
     */
    recordToolUsed(tool: string): void {
        if (this.activeTask && !this.activeTask.toolsUsed.includes(tool)) {
            this.activeTask.toolsUsed.push(tool);
        }
    }

    /**
     * Record file modified
     */
    recordFileModified(file: string): void {
        if (this.activeTask && !this.activeTask.filesModified.includes(file)) {
            this.activeTask.filesModified.push(file);
        }
    }

    /**
     * Complete active task
     */
    completeTask(conversationId: string, success: boolean, error?: string): TaskState | null {
        if (!this.activeTask) return null;

        this.activeTask.completedAt = Date.now();
        this.activeTask.status = success ? 'completed' : 'failed';
        this.activeTask.error = error;

        // Add to conversation
        const conv = this.conversations.get(conversationId);
        if (conv) {
            conv.tasks.push({ ...this.activeTask });
        }

        const completed = { ...this.activeTask };
        this.activeTask = null;
        return completed;
    }

    // ========== Memory Management ==========

    /**
     * Store a memory item
     */
    remember(item: Omit<MemoryItem, 'id' | 'accessedAt' | 'accessCount'>): string {
        const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const memItem: MemoryItem = {
            ...item,
            id,
            accessedAt: Date.now(),
            accessCount: 0,
        };
        this.memory.set(id, memItem);
        return id;
    }

    /**
     * Recall memory items by type
     */
    recall(type?: MemoryItem['type'], limit: number = 10): MemoryItem[] {
        let items = Array.from(this.memory.values());

        if (type) {
            items = items.filter(i => i.type === type);
        }

        // Sort by relevance and recency
        items.sort((a, b) => {
            const scoreA = a.relevance * 0.6 + (a.accessCount / 10) * 0.2 + (a.accessedAt / Date.now()) * 0.2;
            const scoreB = b.relevance * 0.6 + (b.accessCount / 10) * 0.2 + (b.accessedAt / Date.now()) * 0.2;
            return scoreB - scoreA;
        });

        return items.slice(0, limit);
    }

    /**
     * Search memories by content
     */
    searchMemory(query: string, limit: number = 5): MemoryItem[] {
        const lowerQuery = query.toLowerCase();
        const items = Array.from(this.memory.values())
            .filter(i => i.content.toLowerCase().includes(lowerQuery))
            .slice(0, limit);

        // Update access stats
        for (const item of items) {
            item.accessedAt = Date.now();
            item.accessCount++;
        }

        return items;
    }

    /**
     * Store decision for future reference
     */
    rememberDecision(decision: string, context: Record<string, unknown>): string {
        return this.remember({
            type: 'decision',
            content: decision,
            relevance: 0.8,
            createdAt: Date.now(),
            metadata: context,
        });
    }

    /**
     * Store file knowledge
     */
    rememberFile(filePath: string, summary: string): string {
        return this.remember({
            type: 'file',
            content: `${filePath}: ${summary}`,
            relevance: 0.7,
            createdAt: Date.now(),
            metadata: { filePath },
        });
    }

    // ========== Context Management ==========

    /**
     * Set conversation context
     */
    setContext(conversationId: string, key: string, value: unknown): void {
        const conv = this.conversations.get(conversationId);
        if (conv) {
            conv.context[key] = value;
            conv.updatedAt = Date.now();
        }
    }

    /**
     * Get conversation context
     */
    getContext(conversationId: string, key: string): unknown {
        const conv = this.conversations.get(conversationId);
        return conv?.context[key];
    }

    // ========== Cleanup ==========

    /**
     * Clear old conversations
     */
    cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
        const cutoff = Date.now() - maxAgeMs;
        let removed = 0;

        for (const [id, conv] of this.conversations.entries()) {
            if (conv.updatedAt < cutoff) {
                this.conversations.delete(id);
                removed++;
            }
        }

        return removed;
    }

    /**
     * Get stats
     */
    getStats(): {
        conversations: number;
        messages: number;
        memories: number;
        activeTask: boolean;
    } {
        let totalMessages = 0;
        for (const conv of this.conversations.values()) {
            totalMessages += conv.messages.length;
        }

        return {
            conversations: this.conversations.size,
            messages: totalMessages,
            memories: this.memory.size,
            activeTask: this.activeTask !== null,
        };
    }
}

// ===========================
// Singleton Instance
// ===========================

export const stateStore = new StateStore();

// ===========================
// Helper Functions
// ===========================

/**
 * Get or create conversation and return context builder
 */
export function createConversationContext(id: string, workspace: string) {
    const conv = stateStore.getOrCreateConversation(id, workspace);

    return {
        conversation: conv,

        addUserMessage(content: string) {
            stateStore.addMessage(id, { role: 'user', content });
        },

        addAssistantMessage(content: string, agentType?: AgentKitAgentType) {
            stateStore.addMessage(id, { role: 'assistant', content, agentType });
        },

        addToolMessage(content: string, toolCalls?: ToolCallRecord[]) {
            stateStore.addMessage(id, { role: 'tool', content, toolCalls });
        },

        getRecentContext(messageCount: number = 5): string {
            return stateStore.getMessagesAsContext(id, messageCount);
        },

        startTask(taskId: string, currentFile?: string) {
            return stateStore.startTask(taskId, workspace, currentFile);
        },

        completeTask(success: boolean, error?: string) {
            return stateStore.completeTask(id, success, error);
        },
    };
}

// ===========================
// Export Types
// ===========================

export type { StateStore };
