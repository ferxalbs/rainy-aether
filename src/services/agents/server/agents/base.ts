/**
 * Base Agent Class
 * 
 * Foundation for specialized agents in the Rainy Brain network.
 * Each agent has specific tools, system prompt, and behavior.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { createConfiguredExecutor, createToolCall, toAgentKitTools } from '../tools';

// ===========================
// Types
// ===========================

export interface AgentConfig {
    name: string;
    description: string;
    systemPrompt: string;
    tools: string[];           // Tool names this agent can use
    model: 'fast' | 'smart';   // Model type to use
    maxIterations: number;     // Max tool call iterations
    temperature?: number;
}

export interface AgentContext {
    workspace: string;
    task: string;
    history?: Message[];
    files?: string[];          // Files mentioned/relevant
    previousAgent?: string;    // Agent that handed off
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AgentResult {
    success: boolean;
    output: string;
    toolsUsed: string[];
    filesModified: string[];
    handoffTo?: string;        // Next agent to handle
    handoffContext?: string;   // Context for next agent
    error?: string;
}

export interface ToolExecution {
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
    success: boolean;
}

// ===========================
// Base Agent
// ===========================

export abstract class BaseAgent {
    protected config: AgentConfig;
    protected executor = createConfiguredExecutor();
    protected genai: GoogleGenAI | null = null;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    /**
     * Initialize the AI client
     */
    async initialize(apiKey: string): Promise<void> {
        this.genai = new GoogleGenAI({ apiKey });
    }

    /**
     * Execute the agent's task
     */
    async execute(context: AgentContext): Promise<AgentResult> {
        if (!this.genai) {
            return {
                success: false,
                output: 'Agent not initialized',
                toolsUsed: [],
                filesModified: [],
                error: 'Call initialize() first'
            };
        }

        const toolsUsed: string[] = [];
        const filesModified: string[] = [];
        let output = '';

        try {
            // Build messages
            const messages: Message[] = [
                { role: 'system', content: this.buildSystemPrompt(context) },
                ...(context.history || []),
                { role: 'user', content: context.task },
            ];

            // Get model
            const modelName = this.config.model === 'fast'
                ? 'gemini-2.0-flash'
                : 'gemini-2.0-pro';

            // Create chat with tools
            const tools = this.getToolDefinitions();

            let iterations = 0;
            let done = false;

            while (!done && iterations < this.config.maxIterations) {
                iterations++;

                // Call model
                const response = await this.genai.models.generateContent({
                    model: modelName,
                    contents: messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : m.role,
                        parts: [{ text: m.content }],
                    })),
                    config: {
                        temperature: this.config.temperature || 0.7,
                        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
                    },
                });

                const candidate = response.candidates?.[0];
                if (!candidate) {
                    output = 'No response from model';
                    done = true;
                    break;
                }

                // Process response parts
                let hasToolCalls = false;
                const toolResults: string[] = [];

                for (const part of candidate.content?.parts || []) {
                    if (part.text) {
                        output += part.text;
                    }

                    if (part.functionCall) {
                        hasToolCalls = true;
                        const { name, args } = part.functionCall;

                        toolsUsed.push(name);

                        // Execute tool
                        const call = createToolCall(name, args as Record<string, unknown>);
                        const execution = await this.executor.execute(call);

                        if (execution.result?.success && name.includes('file') && name !== 'read_file') {
                            const path = (args as any)?.path;
                            if (path) filesModified.push(path);
                        }

                        toolResults.push(`Tool ${name}: ${JSON.stringify(execution.result)}`);
                    }
                }

                if (hasToolCalls) {
                    // Add assistant message and tool results
                    messages.push({ role: 'assistant', content: output || 'Executing tools...' });
                    messages.push({ role: 'user', content: `Tool results:\n${toolResults.join('\n')}\n\nContinue with the task.` });
                    output = ''; // Reset for next iteration
                } else {
                    done = true;
                }
            }

            // Check for handoff
            const handoff = this.checkForHandoff(output);

            return {
                success: true,
                output,
                toolsUsed: [...new Set(toolsUsed)],
                filesModified: [...new Set(filesModified)],
                ...handoff,
            };

        } catch (error) {
            return {
                success: false,
                output: '',
                toolsUsed,
                filesModified,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Build the system prompt with context
     */
    protected buildSystemPrompt(context: AgentContext): string {
        return `${this.config.systemPrompt}

WORKSPACE: ${context.workspace}
${context.previousAgent ? `PREVIOUS AGENT: ${context.previousAgent}` : ''}
${context.files?.length ? `RELEVANT FILES:\n${context.files.join('\n')}` : ''}

You have access to these tools: ${this.config.tools.join(', ')}

IMPORTANT:
- Execute tools when needed to complete the task
- Be concise and efficient
- If the task requires capabilities you don't have, respond with HANDOFF:agent_name:reason`;
    }

    /**
     * Get tool definitions for this agent
     */
    protected getToolDefinitions(): any[] {
        const allTools = toAgentKitTools();
        return allTools
            .filter(t => this.config.tools.includes(t.name))
            .map(t => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            }));
    }

    /**
     * Check if agent wants to hand off to another
     */
    protected checkForHandoff(output: string): { handoffTo?: string; handoffContext?: string } {
        const match = output.match(/HANDOFF:(\w+):(.+)/);
        if (match) {
            return {
                handoffTo: match[1],
                handoffContext: match[2],
            };
        }
        return {};
    }

    /**
     * Get agent info
     */
    get info(): { name: string; description: string; tools: string[] } {
        return {
            name: this.config.name,
            description: this.config.description,
            tools: this.config.tools,
        };
    }
}
