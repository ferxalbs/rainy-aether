/**
 * Code Reviewer Agent
 * 
 * Specialized agent for code review, analysis, and suggestions.
 * Focuses on quality, best practices, and potential issues.
 * 
 * Features:
 * - Uses file cache for efficient reads
 * - Lifecycle hooks for context and state tracking
 */

import { createAgent } from '@inngest/agent-kit';
import { readFileTool, searchCodeTool } from '../tools/fileTools';
import { gitStatusTool } from '../tools/terminalTools';
import { applyFileDiffTool } from '../tools/applyFileDiffTool';
import type { NetworkState } from '../types';

export const codeReviewerAgent = createAgent({
    name: 'Code Reviewer',
    description: 'A specialized code reviewer that analyzes code quality, identifies issues, and suggests improvements.',

    system: `You are an expert code reviewer integrated into Rainy Aether IDE.

## Your Expertise
- Code quality analysis and best practices
- Security vulnerability identification
- Performance optimization suggestions
- Design pattern recommendations
- TypeScript/JavaScript, Rust, and general programming patterns

## Review Process
1. **Understand Context**: Read the relevant files to understand the codebase structure
2. **Check Git Status**: See what files have been modified recently
3. **Analyze Changes**: Look for potential issues, improvements, and inconsistencies
4. **Provide Actionable Feedback**: Give specific, actionable suggestions

## Review Categories
- 🔒 **Security**: Authentication, authorization, data validation, injection risks
- ⚡ **Performance**: Inefficient algorithms, unnecessary re-renders, memory leaks
- 🧹 **Code Quality**: Readability, naming, complexity, duplication
- 🏗️ **Architecture**: Design patterns, separation of concerns, testability
- 🐛 **Bugs**: Logic errors, edge cases, null handling

## Output Format
Provide reviews in this structure:
- **Summary**: One-line overview
- **Issues Found**: Categorized list of issues
- **Suggestions**: Specific improvements with code examples
- **Positive Notes**: What's done well

## Making Changes
When you identify issues that need fixing, use the apply_file_diff tool to propose
changes directly in the editor. The user will see a visual preview with:
- Green highlighting for additions
- Red highlighting for deletions

The user can accept (Cmd/Ctrl+Enter) or reject (Escape) your proposed changes.`,

    tools: [
        readFileTool,
        searchCodeTool,
        gitStatusTool,
        applyFileDiffTool,
    ],

    lifecycle: {
        onStart: async ({ prompt, history, network }) => {
            const state = network?.state?.data as NetworkState | undefined;

            if (state) {
                // Add files modified in this session for review focus
                if (state.context.relevantFiles.length > 0) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Files to Review] ${state.context.relevantFiles.join(', ')}`,
                    });
                }

                // Add previous agent context
                if (state.lastAgent && state.lastAgentOutput) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[From ${state.lastAgent}] ${state.lastAgentOutput.slice(0, 500)}`,
                    });
                }
            }

            return { prompt, history: history || [], stop: false };
        },

        onFinish: async ({ result, network }) => {
            const state = network?.state?.data as NetworkState | undefined;

            if (state) {
                state.lastAgent = 'Code Reviewer';
                const textOutput = result.output?.find(o => o.type === 'text');
                state.lastAgentOutput = textOutput?.content?.toString().slice(0, 1000) || '';

                // Update plan progress
                if (state.plan && state.plan.currentIndex < state.plan.steps.length) {
                    const currentStep = state.plan.steps[state.plan.currentIndex];
                    currentStep.status = 'completed';
                    state.plan.currentIndex++;
                }
            }

            return result;
        },
    },
});

export default codeReviewerAgent;
