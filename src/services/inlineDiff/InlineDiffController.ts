/**
 * Inline Diff Controller
 *
 * Manages Monaco editor decorations for inline diff visualization.
 * Shows additions in green and deletions in red with appropriate styling.
 */

import * as monaco from 'monaco-editor';
import { InlineDiffChange, inlineDiffActions } from '@/stores/inlineDiffStore';

// ============================================================================
// InlineDiffController
// ============================================================================

export class InlineDiffController {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private decorations: string[] = [];
    private streamingDecoration: string[] = [];
    private disposed = false;

    constructor(editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor = editor;
    }

    /**
     * Apply diff decorations to show pending changes
     */
    applyDiffDecorations(changes: InlineDiffChange[]): void {
        if (this.disposed) return;

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

        // Apply decorations (don't call setDecorationIds to avoid infinite loop!)
        try {
            this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
        } catch (error) {
            console.error('[InlineDiffController] Error applying decorations:', error);
        }
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
     * Highlight the current streaming position
     */
    highlightStreamingLine(line: number): void {
        if (this.disposed) return;

        const decorations: monaco.editor.IModelDeltaDecoration[] = [
            {
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    className: 'inline-diff-streaming',
                    isWholeLine: true,
                },
            },
        ];

        this.streamingDecoration = this.editor.deltaDecorations(
            this.streamingDecoration,
            decorations
        );
    }

    /**
     * Clear streaming highlight
     */
    clearStreamingHighlight(): void {
        if (this.disposed) return;
        this.streamingDecoration = this.editor.deltaDecorations(
            this.streamingDecoration,
            []
        );
    }

    /**
     * Clear all decorations
     */
    clearDecorations(): void {
        if (this.disposed) return;

        this.decorations = this.editor.deltaDecorations(this.decorations, []);
        this.streamingDecoration = this.editor.deltaDecorations(this.streamingDecoration, []);
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
