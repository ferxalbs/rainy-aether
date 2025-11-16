/**
 * RainyAgent - General-purpose coding assistant
 *
 * The Rainy agent is the primary AI assistant in Rainy Code IDE.
 * It provides comprehensive coding support with full IDE integration.
 *
 * Capabilities:
 * - Code generation and editing
 * - File system operations
 * - Git operations
 * - Terminal command execution
 * - Workspace analysis
 * - Code refactoring
 * - Documentation generation
 *
 * Features:
 * - Dual-mode operation (fast Rust / smart LangGraph)
 * - Full IDE integration via Rust-backed tools
 * - Conversation memory across sessions
 * - Performance metrics and cost tracking
 */

import { AgentCore, type MessageOptions } from '../core/AgentCore';
import type { AgentConfig } from '@/types/rustAgent';
import { createAgentConfig } from '@/types/rustAgent';

/**
 * System prompt for Rainy agent
 *
 * This prompt defines the agent's personality, capabilities, and guidelines.
 */
const RAINY_SYSTEM_PROMPT = `You are Rainy, an AI coding assistant integrated into the Rainy Code IDE.

## Your Role
You are a highly capable AI assistant specialized in software development. You have direct access to the user's workspace and can perform file operations, execute commands, analyze code, and assist with version control.

## Your Capabilities
You have access to the following tools:

### File System Tools
- **read_file**: Read file contents from the workspace
- **write_file**: Create or update files
- **list_directory**: List directory contents and structure

### Terminal Tools
- **execute_command**: Run shell commands in the integrated terminal

### Git Tools
- **git_status**: Check repository status
- **git_log**: View commit history

### Workspace Tools
- **workspace_structure**: Analyze workspace structure and files
- **search_files**: Search for files and content across the workspace

## Guidelines

### When Responding
1. **Be Concise**: Provide clear, focused responses without unnecessary verbosity
2. **Show Your Work**: When using tools, explain what you're doing and why
3. **Code Quality**: Prioritize clean, maintainable code following best practices
4. **Error Handling**: Always consider edge cases and error scenarios
5. **Security**: Never suggest insecure patterns or expose sensitive data

### When Writing Code
1. Use appropriate language features and idioms
2. Follow the project's existing coding style
3. Add comments for complex logic
4. Consider performance and maintainability
5. Use TypeScript when possible for type safety

### When Making Changes
1. **Understand First**: Read relevant files before making changes
2. **Explain Changes**: Clearly describe what you're changing and why
3. **Incremental Steps**: Make changes in logical, reviewable steps
4. **Test Considerations**: Mention testing implications when relevant

### When Uncertain
1. Ask clarifying questions rather than making assumptions
2. Offer multiple approaches when there's no single best solution
3. Acknowledge limitations honestly

## Tool Usage Strategy

1. **Read Before Write**: Always read existing files before modifying them
2. **Verify Context**: Use workspace_structure to understand the project layout
3. **Check Status**: Use git_status before suggesting commits
4. **Execute Safely**: Be cautious with terminal commands, especially destructive ones
5. **Search Wisely**: Use search_files to find references and understand patterns

## Example Interactions

**User**: "Add error handling to the login function"
**Rainy**: "I'll help you add error handling to the login function. Let me first read the current implementation."
[Uses read_file tool]
"I can see the function currently doesn't handle network errors. I'll add try-catch blocks and proper error messages..."
[Makes changes and explains them]

**User**: "What files use the User model?"
**Rainy**: "Let me search for files that import or reference the User model."
[Uses search_files tool]
"I found 5 files using the User model: [lists files with brief description of usage]"

## Personality
- Professional but friendly
- Proactive in identifying potential issues
- Encouraging and supportive of good practices
- Direct and efficient in communication
- Honest about limitations

Remember: You're an assistant, not autonomous. Always explain your actions and give the user opportunity to review before making significant changes.`;

/**
 * Rainy Agent - General-purpose coding assistant
 *
 * @example
 * ```typescript
 * // Create and initialize Rainy agent
 * const rainy = new RainyAgent({
 *   provider: 'groq',
 *   model: 'llama-3.3-70b-versatile',
 *   temperature: 0.7,
 * });
 *
 * await rainy.initialize({
 *   apiKey: 'your-api-key',
 *   workspaceRoot: '/path/to/workspace',
 * });
 *
 * // Fast mode - quick responses
 * const fastResponse = await rainy.sendMessage(
 *   'List all TypeScript files',
 *   { fastMode: true }
 * );
 *
 * // Smart mode - advanced reasoning
 * const smartResponse = await rainy.sendMessage(
 *   'Refactor the authentication module for better security',
 *   { fastMode: false }
 * );
 *
 * // Get metrics
 * const metrics = await rainy.getMetrics();
 * console.log(`Tokens used: ${metrics?.totalTokens}`);
 *
 * // Cleanup
 * await rainy.dispose();
 * ```
 */
export class RainyAgent extends AgentCore {
  readonly id = 'rainy';
  readonly name = 'Rainy';
  readonly description =
    'General-purpose coding assistant with full IDE integration';

  /**
   * Create a new Rainy agent
   *
   * @param config - Agent configuration (optional)
   */
  constructor(config: Partial<AgentConfig> = {}) {
    // Set Rainy-specific defaults
    const rainyConfig = createAgentConfig({
      systemPrompt: RAINY_SYSTEM_PROMPT,
      provider: config.provider || 'groq',
      model: config.model || 'llama-3.3-70b-versatile',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 4096,
      maxIterations: config.maxIterations || 10,
      ...config,
    });

    super(rainyConfig);
  }

  /**
   * Check if Rainy supports a specific capability
   *
   * @param capability - Capability to check
   * @returns True if capability is supported
   */
  override hasCapability(capability: string): boolean {
    const capabilities = [
      'code-generation',
      'code-editing',
      'file-operations',
      'git-operations',
      'terminal-execution',
      'workspace-analysis',
      'code-analysis',
      'refactoring',
      'documentation',
    ];

    return capabilities.includes(capability);
  }

  /**
   * Send a message with Rainy-specific optimizations
   *
   * Rainy automatically chooses the best mode based on message complexity:
   * - Simple queries: Fast mode (Rust-only)
   * - Complex tasks: Smart mode (LangGraph + Rust)
   *
   * @param message - User message
   * @param options - Message options
   * @returns Agent response
   */
  override async sendMessage(
    message: string,
    options?: MessageOptions
  ): Promise<any> {
    // Auto-detect complexity if mode not specified
    if (options?.fastMode === undefined) {
      const autoOptions = {
        ...options,
        fastMode: this.shouldUseFastMode(message),
      };

      if (autoOptions.fastMode) {
        console.log('🚀 Auto-selected Fast Mode for simple query');
      } else {
        console.log('🧠 Auto-selected Smart Mode for complex task');
      }

      return super.sendMessage(message, autoOptions);
    }

    return super.sendMessage(message, options);
  }

  /**
   * Determine if fast mode should be used based on message complexity
   *
   * Fast mode is preferred for:
   * - Simple queries (< 50 words)
   * - Single file operations
   * - Status checks
   * - Quick lookups
   *
   * Smart mode is preferred for:
   * - Multi-step tasks
   * - Refactoring requests
   * - Complex analysis
   * - Code generation with context
   *
   * @param message - User message
   * @returns True if fast mode should be used
   */
  private shouldUseFastMode(message: string): boolean {
    const wordCount = message.split(/\s+/).length;

    // Fast mode triggers
    const fastKeywords = [
      'list',
      'show',
      'what',
      'status',
      'read',
      'get',
      'find',
      'search',
    ];

    // Smart mode triggers
    const smartKeywords = [
      'refactor',
      'improve',
      'optimize',
      'generate',
      'create',
      'implement',
      'add error handling',
      'add tests',
      'explain',
      'analyze',
    ];

    const lowerMessage = message.toLowerCase();

    // Check for smart mode keywords first (higher priority)
    if (smartKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return false; // Use smart mode
    }

    // Check for fast mode keywords
    if (fastKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return true; // Use fast mode
    }

    // Default: use fast mode for short messages, smart mode for long ones
    return wordCount < 50;
  }
}

/**
 * Create a Rainy agent with default configuration
 *
 * @param config - Optional configuration overrides
 * @returns Initialized Rainy agent
 *
 * @example
 * ```typescript
 * const rainy = await createRainyAgent({
 *   apiKey: 'your-api-key',
 *   workspaceRoot: '/workspace',
 * });
 *
 * const response = await rainy.sendMessage('List all TypeScript files');
 * ```
 */
export async function createRainyAgent(config?: {
  apiKey?: string;
  workspaceRoot?: string;
  userId?: string;
  agentConfig?: Partial<AgentConfig>;
}): Promise<RainyAgent> {
  const rainy = new RainyAgent(config?.agentConfig);

  await rainy.initialize({
    apiKey: config?.apiKey,
    workspaceRoot: config?.workspaceRoot,
    userId: config?.userId,
  });

  return rainy;
}
