/**
 * Inline Diff Controller
 *
 * Manages Monaco editor decorations for inline diff visualization.
 * Uses createDecorationsCollection for efficient decoration management.
 * Shows additions in green and deletions in red with appropriate styling.
 */

import * as monaco from 'monaco-editor';
import { InlineDiffChange, inlineDiffActions } from '@/stores/inlineDiffStore';

// ============================================================================
// InlineDiffController
// ============================================================================

export class InlineDiffController {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;
    private streamingDecorations: monaco.editor.IEditorDecorationsCollection | null = null;
    private disposed = false;

    // Debounce state for decoration updates
    private pendingDecorations: monaco.editor.IModelDeltaDecoration[] | null = null;
    private decorationUpdateTimer: ReturnType<typeof setTimeout> | null = null;
    private lastAppliedChangesHash = '';

    constructor(editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor = editor;
        // Create decoration collections once - VS Code pattern
        this.decorationsCollection = this.editor.createDecorationsCollection([]);
        this.streamingDecorations = this.editor.createDecorationsCollection([]);
    }

    /**
     * Compute a simple hash of changes to detect if we need to update
     */
    private computeChangesHash(changes: InlineDiffChange[]): string {
        return `${changes.length}:${changes.map(c => `${c.range.startLine}-${c.range.endLine}-${c.type}`).join(',')}`;
    }

    /**
     * Apply diff decorations to show pending changes
     * Uses debouncing to prevent excessive decoration updates
     */
    applyDiffDecorations(changes: InlineDiffChange[]): void {
        if (this.disposed || !this.decorationsCollection) return;

        // Fast hash check - skip if changes haven't changed
        const changesHash = this.computeChangesHash(changes);
        if (changesHash === this.lastAppliedChangesHash) {
            return;
        }
        this.lastAppliedChangesHash = changesHash;

        const model = this.editor.getModel();
        if (!model) return;

        const lineCount = model.getLineCount();
        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        for (const change of changes) {
            const options = this.getDecorationOptions(change);

            // Validate and clamp line numbers to model bounds
            const startLine = Math.max(1, Math.min(change.range.startLine, lineCount));
            const endLine = Math.max(startLine, Math.min(change.range.endLine, lineCount));

            // Get safe column values
            const endColumn = model.getLineMaxColumn(endLine);

            decorations.push({
                range: new monaco.Range(
                    startLine,
                    1,
                    endLine,
                    endColumn
                ),
                options,
            });
        }

        // Debounce decoration updates - batch rapid changes
        this.pendingDecorations = decorations;

        if (this.decorationUpdateTimer) {
            clearTimeout(this.decorationUpdateTimer);
        }

        // Apply after a short debounce (16ms = 1 frame at 60fps)
        this.decorationUpdateTimer = setTimeout(() => {
            if (this.disposed || !this.decorationsCollection || !this.pendingDecorations) return;

            try {
                // Use set() method of IEditorDecorationsCollection - much more efficient
                this.decorationsCollection.set(this.pendingDecorations);
            } catch (error) {
                console.error('[InlineDiffController] Error applying decorations:', error);
            }
            this.pendingDecorations = null;
            this.decorationUpdateTimer = null;
        }, 16);
    }

    /**
     * Get decoration options based on change type
     */
    private getDecorationOptions(change: InlineDiffChange): monaco.editor.IModelDecorationOptions {
        const baseMessage = this.getHoverMessage(change);

        switch (change.type) {
            case 'insert':
                return {
                    className: 'inline-diff-insert',
                    glyphMarginClassName: 'inline-diff-glyph-insert',
                    isWholeLine: true,
                    overviewRuler: {
                        color: '#28a745',
                        position: monaco.editor.OverviewRulerLane.Left,
                    },
                    hoverMessage: baseMessage,
                    minimap: {
                        color: '#28a74580',
                        position: monaco.editor.MinimapPosition.Inline,
                    },
                };

            case 'delete':
                return {
                    className: 'inline-diff-delete',
                    glyphMarginClassName: 'inline-diff-glyph-delete',
                    isWholeLine: true,
                    overviewRuler: {
                        color: '#dc3545',
                        position: monaco.editor.OverviewRulerLane.Left,
                    },
                    hoverMessage: baseMessage,
                    minimap: {
                        color: '#dc354580',
                        position: monaco.editor.MinimapPosition.Inline,
                    },
                };

            case 'replace':
                return {
                    className: 'inline-diff-replace',
                    glyphMarginClassName: 'inline-diff-glyph-replace',
                    isWholeLine: true,
                    overviewRuler: {
                        color: '#ffc107',
                        position: monaco.editor.OverviewRulerLane.Left,
                    },
                    hoverMessage: baseMessage,
                    minimap: {
                        color: '#ffc10780',
                        position: monaco.editor.MinimapPosition.Inline,
                    },
                };

            default:
                return {
                    className: 'inline-diff-default',
                };
        }
    }

    /**
     * Get hover message for a change
     */
    private getHoverMessage(change: InlineDiffChange): monaco.IMarkdownString {
        const lines: string[] = [];

        switch (change.type) {
            case 'insert':
                lines.push('**➕ Addition**');
                lines.push('');
                lines.push('```');
                lines.push(change.newText.substring(0, 200));
                if (change.newText.length > 200) lines.push('...');
                lines.push('```');
                break;

            case 'delete':
                lines.push('**➖ Deletion**');
                lines.push('');
                lines.push('```');
                lines.push(change.oldText.substring(0, 200));
                if (change.oldText.length > 200) lines.push('...');
                lines.push('```');
                break;

            case 'replace':
                lines.push('**🔄 Replacement**');
                lines.push('');
                lines.push('**Before:**');
                lines.push('```');
                lines.push(change.oldText.substring(0, 100));
                if (change.oldText.length > 100) lines.push('...');
                lines.push('```');
                lines.push('');
                lines.push('**After:**');
                lines.push('```');
                lines.push(change.newText.substring(0, 100));
                if (change.newText.length > 100) lines.push('...');
                lines.push('```');
                break;
        }

        lines.push('');
        lines.push('---');
        lines.push('Press `Cmd/Ctrl+Enter` to accept, `Escape` to reject');

        return { value: lines.join('\n'), isTrusted: true };
    }

    /**
     * Highlight the current streaming position (debounced)
     */
    private lastStreamingLine = -1;

    highlightStreamingLine(line: number): void {
        if (this.disposed || !this.streamingDecorations) return;

        // Skip if same line
        if (line === this.lastStreamingLine) return;
        this.lastStreamingLine = line;

        this.streamingDecorations.set([
            {
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    className: 'inline-diff-streaming',
                    isWholeLine: true,
                },
            },
        ]);
    }

    /**
     * Clear streaming highlight
     */
    clearStreamingHighlight(): void {
        if (this.disposed || !this.streamingDecorations) return;
        this.lastStreamingLine = -1;
        this.streamingDecorations.clear();
    }

    /**
     * Clear all decorations
     */
    clearDecorations(): void {
        if (this.disposed) return;

        if (this.decorationUpdateTimer) {
            clearTimeout(this.decorationUpdateTimer);
            this.decorationUpdateTimer = null;
        }

        this.decorationsCollection?.clear();
        this.streamingDecorations?.clear();
        this.lastAppliedChangesHash = '';
        this.lastStreamingLine = -1;
        inlineDiffActions.setDecorationIds([]);
    }

    /**
     * Reveal a specific change in the editor
     */
    revealChange(change: InlineDiffChange): void {
        if (this.disposed) return;

        this.editor.revealLineInCenter(change.range.startLine);
    }

    /**
     * Dispose the controller
     */
    dispose(): void {
        this.clearDecorations();
        this.decorationsCollection = null;
        this.streamingDecorations = null;
        this.disposed = true;
    }
}

// ============================================================================
// Factory function
// ============================================================================

export function createInlineDiffController(
    editor: monaco.editor.IStandaloneCodeEditor
): InlineDiffController {
    return new InlineDiffController(editor);
}

