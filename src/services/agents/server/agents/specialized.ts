/**
 * Specialized Agents
 * 
 * Each agent has a specific role in the Rainy Brain network:
 * - Planner: Analyzes tasks and creates implementation plans
 * - Coder: Writes and edits code
 * - Reviewer: Reviews code for issues and improvements
 * - Terminal: Executes commands and manages processes
 * - Docs: Reads documentation and provides context
 */

import { BaseAgent, AgentConfig } from './base';

// ===========================
// Planner Agent
// ===========================

const PLANNER_CONFIG: AgentConfig = {
    name: 'planner',
    description: 'Analyzes tasks and creates step-by-step implementation plans',
    systemPrompt: `You are a senior software architect and planner.
Your role is to:
1. Analyze the user's request thoroughly
2. Understand the current codebase structure
3. Create a clear, step-by-step plan
4. Identify which files need to be created/modified
5. Estimate complexity and potential issues

OUTPUT FORMAT:
- Start with a brief analysis of the request
- List the steps needed (numbered)
- For each step, specify: file path, action (create/modify/delete), description
- End with any warnings or considerations

You should READ files to understand the codebase before planning.
If the task requires actual coding, handoff to the coder agent.`,
    tools: [
        'get_workspace_info',
        'read_file',
        'list_dir',
        'read_directory_tree',
        'search_code',
    ],
    model: 'smart',
    maxIterations: 5,
    temperature: 0.3,
};

export class PlannerAgent extends BaseAgent {
    constructor() {
        super(PLANNER_CONFIG);
    }
}

// ===========================
// Coder Agent
// ===========================

const CODER_CONFIG: AgentConfig = {
    name: 'coder',
    description: 'Writes, edits, and refactors code',
    systemPrompt: `You are an expert software developer.
Your role is to:
1. Write clean, efficient code
2. Edit existing files following best practices
3. Create new files when needed
4. Follow the project's coding conventions

IMPORTANT RULES:
- Always read a file before editing it
- Use edit_file for targeted changes (preferred)
- Use write_file only for complete rewrites or new files
- Write tests alongside code when appropriate
- Add comments for complex logic

CODING STANDARDS:
- TypeScript: Use strict types, avoid 'any'
- React: Functional components with hooks
- Rust: Follow Tauri patterns
- Always handle errors appropriately`,
    tools: [
        'get_workspace_info',
        'read_file',
        'list_dir',
        'create_file',
        'write_file',
        'edit_file',
        'delete_file',
        'format_file',
        'search_code',
    ],
    model: 'smart',
    maxIterations: 10,
    temperature: 0.5,
};

export class CoderAgent extends BaseAgent {
    constructor() {
        super(CODER_CONFIG);
    }
}

// ===========================
// Reviewer Agent
// ===========================

const REVIEWER_CONFIG: AgentConfig = {
    name: 'reviewer',
    description: 'Reviews code for bugs, improvements, and best practices',
    systemPrompt: `You are a senior code reviewer with expertise in:
- Security vulnerabilities
- Performance optimizations
- Code quality and maintainability
- Best practices and patterns

Your role is to:
1. Review code changes carefully
2. Identify bugs and potential issues
3. Suggest improvements
4. Check for security concerns
5. Verify error handling

OUTPUT FORMAT:
- List issues found (critical, warning, info)
- For each issue: file, line range, description, suggestion
- Summarize overall code quality
- Recommend whether to approve or request changes

If fixes are needed, you can handoff to the coder agent.`,
    tools: [
        'get_workspace_info',
        'read_file',
        'list_dir',
        'search_code',
        'git_diff',
        'git_status',
        'get_diagnostics',
        'analyze_imports',
    ],
    model: 'smart',
    maxIterations: 5,
    temperature: 0.2,
};

export class ReviewerAgent extends BaseAgent {
    constructor() {
        super(REVIEWER_CONFIG);
    }
}

// ===========================
// Terminal Agent
// ===========================

const TERMINAL_CONFIG: AgentConfig = {
    name: 'terminal',
    description: 'Executes commands, runs tests, and manages processes',
    systemPrompt: `You are a DevOps and terminal expert.
Your role is to:
1. Execute shell commands safely
2. Run tests and report results
3. Build and bundle projects
4. Manage git operations
5. Debug build/runtime issues

SAFETY RULES:
- Never run destructive commands without confirmation context
- Prefer non-destructive commands (ls over rm)
- Always specify working directory when needed
- Set reasonable timeouts

COMMON TASKS:
- Run tests: pnpm test, cargo test
- Build: pnpm build, cargo build
- Install deps: pnpm install
- Git operations: git status, git diff, git add, git commit`,
    tools: [
        'get_workspace_info',
        'run_command',
        'run_tests',
        'git_status',
        'git_diff',
        'git_add',
        'git_commit',
    ],
    model: 'fast',
    maxIterations: 8,
    temperature: 0.3,
};

export class TerminalAgent extends BaseAgent {
    constructor() {
        super(TERMINAL_CONFIG);
    }
}

// ===========================
// Docs Agent
// ===========================

const DOCS_CONFIG: AgentConfig = {
    name: 'docs',
    description: 'Reads documentation and provides context about libraries/frameworks',
    systemPrompt: `You are a documentation expert.
Your role is to:
1. Find relevant documentation in the codebase
2. Explain APIs and patterns
3. Provide usage examples
4. Help understand library conventions

Focus on:
- README files
- Type definitions
- Code comments
- Configuration files

Provide clear, concise explanations with code examples when helpful.`,
    tools: [
        'get_workspace_info',
        'read_file',
        'list_dir',
        'read_directory_tree',
        'search_code',
        'analyze_imports',
    ],
    model: 'fast',
    maxIterations: 5,
    temperature: 0.4,
};

export class DocsAgent extends BaseAgent {
    constructor() {
        super(DOCS_CONFIG);
    }
}

// ===========================
// Agent Registry
// ===========================

export const AGENTS = {
    planner: PlannerAgent,
    coder: CoderAgent,
    reviewer: ReviewerAgent,
    terminal: TerminalAgent,
    docs: DocsAgent,
} as const;

export type AgentType = keyof typeof AGENTS;

export function createAgent(type: AgentType): BaseAgent {
    const AgentClass = AGENTS[type];
    return new AgentClass();
}

export function getAgentTypes(): AgentType[] {
    return Object.keys(AGENTS) as AgentType[];
}
