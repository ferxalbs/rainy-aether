/**
 * Apply File Diff Tool
 *
 * AgentKit tool for applying inline diffs with visual preview.
 * Allows AI agents to propose code changes that users can accept or reject.
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';
import { inlineDiffActions } from '@/stores/inlineDiffStore';
import { ideActions } from '@/stores/ideStore';

/**
 * Apply inline diff changes to a file with visual preview
 */
export const applyFileDiffTool = createTool({
    name: 'apply_file_diff',
    description: `Apply inline diff changes to a file in the editor. Shows a visual preview with green highlighting for additions and red highlighting for deletions. The user can accept (Cmd/Ctrl+Enter) or reject (Escape) the changes.

Use this tool when you want to:
- Make code modifications that the user should review before applying
- Suggest refactoring changes
- Fix bugs or issues in the code
- Add new code to an existing file`,

    parameters: z.object({
        path: z.string().describe('Absolute path to the file to edit'),
        changes: z.array(z.object({
            type: z.enum(['insert', 'delete', 'replace']).describe('Type of change'),
            startLine: z.number().describe('1-based line number where the change starts'),
            endLine: z.number().optional().describe('1-based line number where the change ends (for multi-line changes)'),
            startColumn: z.number().optional().describe('1-based column number (default: 1)'),
            endColumn: z.number().optional().describe('1-based end column (default: end of line)'),
            oldText: z.string().optional().describe('The existing text to replace (required for replace type)'),
            newText: z.string().describe('The new text to insert'),
        })).describe('List of changes to apply'),
        description: z.string().optional().describe('Brief description of what the changes accomplish'),
    }),

    handler: async ({ path, changes, description }, { network }) => {
        try {
            // Get the current file content
            const { invoke } = await import('@tauri-apps/api/core');

            let originalContent: string;
            try {
                originalContent = await invoke<string>('get_file_content', { path });
            } catch {
                // File might not exist, try alternate command
                try {
                    originalContent = await invoke<string>('read_text_file', { path });
                } catch (e) {
                    return {
                        success: false,
                        error: `Could not read file: ${path}`,
                        details: String(e),
                    };
                }
            }

            // Check if the file is open in the editor
            const openFiles = ideActions.getState().openFiles;
            const isFileOpen = openFiles.some(f => f.path === path);

            if (!isFileOpen) {
                // Open the file first by creating a FileNode-like object
                try {
                    const fileName = path.split('/').pop() || path;
                    await ideActions.openFile({ path, name: fileName, is_directory: false, children: [] });
                    // Wait a bit for the editor to load
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (e) {
                    return {
                        success: false,
                        error: `Could not open file: ${path}`,
                        details: String(e),
                    };
                }
            }

            // Get agent info from network state
            const agentId = network?.state?.data?.agentId || 'ai-agent';
            const agentName = network?.state?.data?.agentName || 'AI Agent';

            // Start inline diff session
            inlineDiffActions.startInlineDiff({
                fileUri: path,
                agentId,
                agentName,
                originalContent,
                description,
            });

            // Stream changes with visual effect
            for (const change of changes) {
                inlineDiffActions.streamChange({
                    type: change.type,
                    range: {
                        startLine: change.startLine,
                        startColumn: change.startColumn || 1,
                        endLine: change.endLine || change.startLine,
                        endColumn: change.endColumn || Number.MAX_SAFE_INTEGER,
                    },
                    newText: change.newText,
                    oldText: change.oldText || '',
                });

                // Small delay for streaming effect
                await new Promise(resolve => setTimeout(resolve, 30));
            }

            // Finish streaming
            inlineDiffActions.finishStreaming();

            // Track in network state
            if (network?.state?.data) {
                network.state.data.lastDiffFile = path;
                network.state.data.pendingDiffs = (network.state.data.pendingDiffs || 0) + 1;
            }

            return {
                success: true,
                status: 'pending_approval',
                message: `${changes.length} change(s) proposed for ${path}. Waiting for user to accept or reject.`,
                file: path,
                changesCount: changes.length,
                description,
                hint: 'User can press Cmd/Ctrl+Enter to accept or Escape to reject.',
            };
        } catch (error) {
            // Clean up on error
            inlineDiffActions.clearSession();

            return {
                success: false,
                error: `Failed to apply diff: ${error}`,
            };
        }
    },
});

/**
 * Check if there's a pending inline diff
 */
export const checkPendingDiffTool = createTool({
    name: 'check_pending_diff',
    description: 'Check if there is a pending inline diff waiting for user approval.',
    parameters: z.object({}),
    handler: async () => {
        const state = inlineDiffActions.getState();

        if (!state.activeSession) {
            return {
                hasPendingDiff: false,
            };
        }

        return {
            hasPendingDiff: true,
            file: state.activeSession.fileUri,
            agentId: state.activeSession.agentId,
            changesCount: state.pendingChanges.length,
            isStreaming: state.isStreaming,
            stats: state.stats,
        };
    },
});

export default applyFileDiffTool;
