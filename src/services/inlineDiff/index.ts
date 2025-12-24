/**
 * Inline Diff Service
 *
 * Main entry point for inline diff functionality.
 */

export { InlineDiffController, createInlineDiffController } from './InlineDiffController';
export { computeLineDiff, diffToInlineChanges } from './lineDiff';
export type { LineDiff, DiffResult } from './lineDiff';
