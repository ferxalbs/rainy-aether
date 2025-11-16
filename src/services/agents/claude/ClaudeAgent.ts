/**
 * Claude Code Agent - Code Analysis and Refactoring Specialist
 *
 * Specialized AI agent focused on deep code analysis, refactoring,
 * debugging, testing, and documentation. Uses more conservative
 * temperature settings for precise, deterministic code suggestions.
 *
 * Capabilities:
 * - Deep code analysis and architecture review
 * - Safe refactoring strategies
 * - Bug detection and debugging assistance
 * - Comprehensive test generation
 * - Documentation generation
 * - Performance optimization suggestions
 *
 * Features:
 * - Uses Google Gemini 2.0 Flash for fast, accurate responses
 * - Lower temperature (0.3) for consistent code suggestions
 * - Higher max tokens (8192) for detailed explanations
 * - More iterations (15) for complex multi-step refactorings
 *
 * @example
 * ```typescript
 * import { ClaudeAgent } from './ClaudeAgent';
 *
 * const claude = new ClaudeAgent();
 * await claude.initialize({ apiKey: 'your-key' });
 *
 * const response = await claude.sendMessage(
 *   'Analyze this code for potential bugs and suggest improvements'
 * );
 * ```
 */

import { AgentCore, type MessageOptions } from '../core/AgentCore';
import type { AgentConfig } from '@/types/rustAgent';
import { createAgentConfig } from '@/types/rustAgent';

/**
 * System prompt for Claude Code agent
 *
 * Defines the agent's expertise, personality, and guidelines for code analysis.
 */
const CLAUDE_CODE_SYSTEM_PROMPT = `You are Claude Code, a specialized AI assistant for code analysis, refactoring, and software engineering best practices.

## Your Expertise

You are a senior software engineer with deep expertise in:
- **Code Analysis**: Identifying code smells, anti-patterns, and potential bugs
- **Refactoring**: Safe, incremental improvements to code structure
- **Architecture**: Design patterns, SOLID principles, and system design
- **Testing**: Unit tests, integration tests, test coverage analysis
- **Documentation**: Clear, comprehensive code documentation
- **Performance**: Identifying bottlenecks and optimization opportunities
- **Security**: Common vulnerabilities and secure coding practices

## Your Capabilities

You have access to the same tools as other agents:

### File System Tools
- **read_file**: Read and analyze code files
- **write_file**: Create or update files with refactored code
- **list_directory**: Understand project structure

### Terminal Tools
- **execute_command**: Run tests, linters, and build commands

### Git Tools
- **git_status**: Check repository state before suggesting changes
- **git_log**: Understand recent changes and patterns

### Workspace Tools
- **workspace_structure**: Analyze project architecture
- **search_files**: Find patterns, duplications, and references

## Your Approach

### When Analyzing Code
1. **Read First**: Always read the relevant files before making suggestions
2. **Understand Context**: Use workspace_structure to understand the bigger picture
3. **Be Thorough**: Look for edge cases, error handling, and potential issues
4. **Provide Evidence**: Point to specific lines and explain why something is problematic
5. **Suggest Alternatives**: Offer multiple approaches when applicable

### When Refactoring
1. **Safety First**: Ensure changes don't break existing functionality
2. **Incremental Steps**: Suggest changes in small, reviewable chunks
3. **Explain Trade-offs**: Discuss benefits and potential drawbacks
4. **Test Coverage**: Recommend tests before refactoring
5. **Document Changes**: Explain what changed and why

### When Generating Tests
1. **Coverage**: Target edge cases, error conditions, and happy paths
2. **Clarity**: Write clear, descriptive test names
3. **Independence**: Ensure tests don't depend on each other
4. **Maintainability**: Keep tests simple and focused
5. **Examples**: Provide complete, runnable test files

### When Debugging
1. **Reproduce**: Understand how to reproduce the issue
2. **Analyze**: Trace execution flow and state changes
3. **Hypothesize**: Form theories about the root cause
4. **Verify**: Suggest ways to confirm the hypothesis
5. **Fix**: Provide targeted fixes with explanations

## Your Personality

- **Precise**: You provide accurate, well-researched suggestions
- **Thoughtful**: You consider long-term maintainability
- **Educational**: You explain the "why" behind your suggestions
- **Pragmatic**: You balance ideal solutions with practical constraints
- **Respectful**: You acknowledge existing code quality and suggest improvements tactfully

## Guidelines

1. **Code Quality**: Always prioritize clean, maintainable, and testable code
2. **Best Practices**: Follow language-specific conventions and community standards
3. **Performance**: Consider performance implications, but prioritize correctness
4. **Security**: Never suggest insecure patterns or expose vulnerabilities
5. **Compatibility**: Consider backward compatibility and breaking changes
6. **Documentation**: Encourage comprehensive documentation for complex logic

## Example Interactions

**User**: "Find potential bugs in this authentication module"
**Claude Code**: "I'll analyze the authentication module for potential issues."
[Uses read_file to examine code]
"I've identified 3 potential issues:
1. Line 45: Missing null check could cause TypeError
2. Line 67: Race condition in async token refresh
3. Line 89: Weak password validation regex
Let me explain each and suggest fixes..."

**User**: "Refactor this class to use dependency injection"
**Claude Code**: "I'll help refactor this class for dependency injection."
[Uses read_file to understand current implementation]
"Here's a safe refactoring approach:
1. First, let's add tests to ensure current behavior
2. Then extract interfaces for dependencies
3. Finally, modify constructor to accept dependencies
This maintains compatibility while improving testability..."

Remember: You're an expert advisor. Your goal is to help developers write better code through education, not just to make changes.`;

/**
 * Claude Code Agent - Code analysis and refactoring specialist
 *
 * @example
 * ```typescript
 * // Create and initialize Claude Code agent
 * const claude = new ClaudeAgent({
 *   provider: 'google',
 *   model: 'gemini-2.0-flash-exp',
 *   temperature: 0.3,
 * });
 *
 * await claude.initialize({
 *   apiKey: 'your-api-key',
 *   workspaceRoot: '/path/to/workspace',
 * });
 *
 * // Analyze code
 * const analysis = await claude.sendMessage(
 *   'Analyze src/utils/validation.ts for potential bugs'
 * );
 *
 * // Get refactoring suggestions
 * const refactoring = await claude.sendMessage(
 *   'Suggest refactorings for src/components/UserProfile.tsx'
 * );
 * ```
 */
export class ClaudeAgent extends AgentCore {
  readonly id = 'claude-code';
  readonly name = 'Claude Code';
  readonly description = 'Code analysis and refactoring specialist';

  /**
   * Create a new Claude Code agent
   *
   * @param config - Agent configuration (optional)
   */
  constructor(config: Partial<AgentConfig> = {}) {
    // Set Claude Code-specific defaults
    const claudeConfig = createAgentConfig({
      systemPrompt: CLAUDE_CODE_SYSTEM_PROMPT,
      provider: config.provider || 'google', // Gemini for analysis
      model: config.model || 'gemini-2.0-flash-exp', // Fast, accurate
      temperature: config.temperature ?? 0.3, // Lower for consistency
      maxTokens: config.maxTokens || 8192, // Higher for detailed explanations
      maxIterations: config.maxIterations || 15, // More iterations for complex tasks
      ...config,
    });

    super(claudeConfig);
  }

  /**
   * Check if Claude Code supports a specific capability
   *
   * @param capability - Capability to check
   * @returns True if capability is supported
   */
  override hasCapability(capability: string): boolean {
    const capabilities = [
      'code-analysis',
      'code-quality',
      'refactoring',
      'debugging',
      'testing',
      'test-generation',
      'documentation',
      'doc-generation',
      'performance-analysis',
      'security-analysis',
      'architecture-review',
      'code-review',
    ];

    return capabilities.includes(capability);
  }

  /**
   * Send a message with Claude Code-specific optimizations
   *
   * Claude Code prefers smart mode for most tasks since code analysis
   * benefits from advanced reasoning. However, simple queries can use fast mode.
   *
   * @param message - User message
   * @param options - Message options
   * @returns Agent response
   */
  override async sendMessage(
    message: string,
    options?: MessageOptions
  ): Promise<any> {
    // Auto-detect mode if not specified
    if (options?.fastMode === undefined) {
      const autoOptions = {
        ...options,
        fastMode: this.shouldUseFastMode(message),
      };

      if (autoOptions.fastMode) {
        console.log('🚀 Claude Code: Auto-selected Fast Mode');
      } else {
        console.log('🧠 Claude Code: Auto-selected Smart Mode for analysis');
      }

      return super.sendMessage(message, autoOptions);
    }

    return super.sendMessage(message, options);
  }

  /**
   * Determine if fast mode should be used
   *
   * Fast mode is used for:
   * - Simple status checks
   * - File content requests
   * - Quick lookups
   *
   * Smart mode is used for:
   * - Code analysis
   * - Refactoring
   * - Bug detection
   * - Test generation
   * - Architecture review
   *
   * @param message - User message
   * @returns True if fast mode should be used
   */
  private shouldUseFastMode(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Fast mode triggers
    const fastKeywords = ['show', 'list', 'read', 'get', 'what is', 'status'];

    // Smart mode triggers (Claude Code specialties)
    const smartKeywords = [
      'analyze',
      'refactor',
      'improve',
      'optimize',
      'debug',
      'bug',
      'test',
      'review',
      'suggest',
      'find issues',
      'find problems',
      'check',
      'validate',
      'security',
      'performance',
      'architecture',
    ];

    // Check for smart mode keywords first (higher priority for Claude Code)
    if (smartKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return false; // Use smart mode
    }

    // Check for fast mode keywords
    if (fastKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return true; // Use fast mode
    }

    // Default: Claude Code uses smart mode for most queries
    // (opposite of Rainy's default)
    return false;
  }
}

/**
 * Create a Claude Code agent with default configuration
 *
 * @param config - Optional configuration overrides
 * @returns Initialized Claude Code agent
 *
 * @example
 * ```typescript
 * const claude = await createClaudeAgent({
 *   apiKey: 'your-api-key',
 *   workspaceRoot: '/workspace',
 * });
 *
 * const analysis = await claude.sendMessage(
 *   'Find potential bugs in src/services/auth.ts'
 * );
 * ```
 */
export async function createClaudeAgent(config?: {
  apiKey?: string;
  workspaceRoot?: string;
  userId?: string;
  agentConfig?: Partial<AgentConfig>;
}): Promise<ClaudeAgent> {
  const claude = new ClaudeAgent(config?.agentConfig);

  await claude.initialize({
    apiKey: config?.apiKey,
    workspaceRoot: config?.workspaceRoot,
    userId: config?.userId,
  });

  return claude;
}
