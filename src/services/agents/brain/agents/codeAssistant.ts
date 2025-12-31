/**
 * Code Assistant Agent
 * 
 * General-purpose coding assistant for file operations,
 * code generation, and modifications.
 * 
 * Features:
 * - File caching via network state
 * - Lifecycle hooks for context preparation
 * - Automatic progress tracking
 */

import { createAgent } from '@inngest/agent-kit';
import {
    readFileTool,
    writeFileTool,
    editFileTool,
    listDirectoryTool,
    searchCodeTool,
} from '../tools/fileTools';
import { runCommandTool, gitStatusTool } from '../tools/terminalTools';
import { applyFileDiffTool } from '../tools/applyFileDiffTool';
import {
    batchReadFilesTool,
    verifyChangesTool,
    getProjectContextTool,
} from '../tools/batchTools';
import type { NetworkState } from '../types';

export const codeAssistantAgent = createAgent({
    name: 'Code Assistant',
    description: 'A general-purpose coding assistant that can read, write, and edit files, search code, and run commands.',

    system: `You are an expert coding assistant integrated into Rainy Aether IDE.

## Your Capabilities
- Read and analyze source code files
- Write new files or edit existing ones with precision
- Search across the codebase for patterns and references
- Run terminal commands for builds, tests, and other operations

## Tool Selection Guidelines (Prefer Efficient Tools)

### Starting a Task
1. **FIRST**: Call \`get_project_context\` to understand project structure, dependencies, and entry points
2. Use \`analyze_file\` before editing to understand imports, exports, and symbols

### Reading Files
- **Single file**: Use \`read_file\` (automatically cached for 30s)
- **Multiple files**: Use \`fs_batch_read\` (more token-efficient than multiple read_file calls)
- **Large files**: Use \`response_format: 'concise'\` to get preview + line count

### Editing Files
- **Line-based edits**: Prefer \`edit_file_lines\` when you know exact line numbers
- **Multiple edits**: Use \`multi_edit\` for atomic batch operations (all-or-nothing)
- **Text find/replace**: Use \`edit_file\` or \`smart_edit\` for text-based replacements
- **New files**: Use \`write_file\` only for creating new files
- **User review needed**: Use \`apply_file_diff\` for visual preview

### Searching
- **Text patterns**: Use \`search_code\` with \`file_pattern\` to narrow scope
- **Symbol definitions**: Use \`find_symbols\` for functions, classes, types

### Verification
- **Always verify**: Call \`verify_changes\` after edits to catch type errors early
- **Or use**: \`smart_edit\` or \`multi_edit\` with \`verify: true\` for built-in verification

## Caching Behavior
- **File reads are cached**: Repeated reads of the same file return cached content
- **Writes invalidate cache**: After editing a file, the cache is cleared for that path
- **30 second TTL**: Cache entries expire after 30 seconds

## Guidelines

1. **Be Proactive**: When asked to implement something, do it completely. Don't just describe what to do.
2. **Read Before Editing**: Always read a file before modifying it to understand context.
3. **Use Precise Edits**: Prefer edit_file over write_file when making small changes to preserve file content.
4. **Verify Changes**: After making changes, consider running relevant tests or builds.
5. **Explain Concisely**: Provide brief explanations of what you did, not lengthy descriptions.

## Tool Usage
- Use search_code to find relevant code before making changes
- Use list_directory to explore project structure
- Use edit_file for targeted modifications
- Use write_file only for new files or complete rewrites
- Use apply_file_diff to propose changes with visual preview that user can accept/reject

## General Guidelines
1. **Read before edit**: Always understand file structure before modifying
2. **Be precise**: Prefer targeted edits over full file rewrites
3. **Verify changes**: Run type-check after modifications
4. **Explain concisely**: Brief explanations, not lengthy descriptions`,

    tools: [
        // Core file operations
        readFileTool,
        writeFileTool,
        editFileTool,
        listDirectoryTool,
        searchCodeTool,
        // Batch operations (more efficient)
        batchReadFilesTool,
        verifyChangesTool,
        getProjectContextTool,
        // Terminal and git
        runCommandTool,
        gitStatusTool,
        // Visual diff preview
        applyFileDiffTool,
    ],

    // Lifecycle hooks for state management
    lifecycle: {
        /**
         * Called before the agent runs inference.
         * Use to prepare context and enhance the prompt.
         */
        onStart: async ({ prompt, history, network }) => {
            const state = network?.state?.data as NetworkState | undefined;

            if (state) {
                // Add cached file context to prompt if available
                const cachedFiles = Object.keys(state.fileCache);
                if (cachedFiles.length > 0) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Context] ${cachedFiles.length} file(s) are cached and will be fast to access: ${cachedFiles.slice(0, 5).join(', ')}${cachedFiles.length > 5 ? '...' : ''}`,
                    });
                }

                // Add workspace info if available
                if (state.workspaceInfo) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Workspace] ${state.workspaceInfo.projectType} project at ${state.workspaceInfo.path}. Entry points: ${state.workspaceInfo.entryPoints.join(', ') || 'not detected'}`,
                    });
                }

                // Add current file context
                if (state.context.currentFile) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Active File] ${state.context.currentFile}`,
                    });
                }

                // Add previous agent output for continuity
                if (state.lastAgent && state.lastAgentOutput) {
                    prompt.push({
                        type: 'text' as const,
                        role: 'system' as const,
                        content: `[Handoff from ${state.lastAgent}] ${state.lastAgentOutput.slice(0, 500)}`,
                    });
                }
            }

            return { prompt, history: history || [], stop: false };
        },

        /**
         * Called after the agent completes.
         * Use to update state and prepare for next agent.
         */
        onFinish: async ({ result, network }) => {
            const state = network?.state?.data as NetworkState | undefined;

            if (state) {
                // Track this agent's work
                state.lastAgent = 'Code Assistant';

                // Extract text output for handoff context
                const textOutput = result.output?.find(o => o.type === 'text');
                state.lastAgentOutput = textOutput?.content?.toString().slice(0, 1000) || '';

                // Update plan progress if executing a plan
                if (state.plan && state.plan.currentIndex < state.plan.steps.length) {
                    const currentStep = state.plan.steps[state.plan.currentIndex];
                    currentStep.status = 'completed';
                    currentStep.result = state.lastAgentOutput;
                    state.plan.currentIndex++;

                    // Check if plan is complete
                    if (state.plan.currentIndex >= state.plan.totalSteps) {
                        state.plan.completedAt = Date.now();
                        state.flags.taskCompleted = true;
                        console.log('[Code Assistant] Plan execution completed');
                    }
                }

                // Log cache stats
                console.log(`[Code Assistant] Finished. Cache: ${state.fileCacheStats.hits} hits, ${state.fileCacheStats.misses} misses`);
            }

            return result;
        },
    },
});

export default codeAssistantAgent;
