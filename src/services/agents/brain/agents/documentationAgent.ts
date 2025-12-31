/**
 * Documentation Agent
 * 
 * Specialized agent for generating and updating documentation.
 * 
 * Features:
 * - Uses file cache for efficient reads
 * - Lifecycle hooks for context and state tracking
 */

import { createAgent } from '@inngest/agent-kit';
import {
    readFileTool,
    writeFileTool,
    editFileTool,
    searchCodeTool,
} from '../tools/fileTools';
import type { NetworkState } from '../types';

export const documentationAgent = createAgent({
    name: 'Documentation Writer',
    description: 'A specialized documentation agent that generates and maintains code documentation.',

    system: `You are a technical documentation expert integrated into Rainy Aether IDE.

## Your Expertise
- API documentation and reference guides
- README files and getting started guides
- Code comments and inline documentation
- JSDoc/TSDoc for TypeScript/JavaScript
- Architecture and design documentation

## Documentation Principles
1. **Accuracy**: Always read the actual code before documenting
2. **Clarity**: Write for developers who are new to the codebase
3. **Completeness**: Cover all public APIs, parameters, and return types
4. **Examples**: Include practical code examples when helpful
5. **Maintenance**: Update existing docs rather than creating duplicates

## Documentation Types
- **Inline Comments**: For complex logic explanation
- **JSDoc/TSDoc**: For functions, classes, and interfaces
- **README.md**: For project and module overviews
- **Architecture Docs**: For high-level design decisions

## Output Style
- Use proper markdown formatting
- Include code blocks with language identifiers
- Add links to related documentation
- Keep language concise and technical`,

    tools: [
        readFileTool,
        writeFileTool,
        editFileTool,
        searchCodeTool,
    ],

    lifecycle: {
        onStart: async ({ prompt, history, network }) => {
            const state = network?.state?.data as NetworkState | undefined;

            if (state) {
                // Add workspace info for documentation context
                if (state.workspaceInfo) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Project] ${state.workspaceInfo.projectType} project: ${state.workspaceInfo.name}`,
                    });
                }

                // Add files that were modified (may need docs updated)
                if (state.context.relevantFiles.length > 0) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Modified Files] ${state.context.relevantFiles.join(', ')}`,
                    });
                }
            }

            return { prompt, history: history || [], stop: false };
        },

        onFinish: async ({ result, network }) => {
            const state = network?.state?.data as NetworkState | undefined;

            if (state) {
                state.lastAgent = 'Documentation Writer';
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

export default documentationAgent;
