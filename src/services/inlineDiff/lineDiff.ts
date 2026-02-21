/**
 * Line-by-Line Diff Utility
 * 
 * Computes line-by-line differences between two strings
 * using a simple but effective diff algorithm.
 */

export interface LineDiff {
    type: 'unchanged' | 'added' | 'removed' | 'modified';
    lineNumber: number;
    oldLine?: string;
    newLine?: string;
}

export interface DiffResult {
    changes: LineDiff[];
    additions: number;
    deletions: number;
    modifications: number;
}

/**
 * Compute line-by-line diff using a linear strategy:
 * - Detect common prefix/suffix quickly
 * - Diff only the middle section
 * - Avoid expensive LCS/matrix-style behavior that can spike CPU/RAM
 */
export function computeLineDiff(oldContent: string, newContent: string): DiffResult {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    if (oldContent === newContent) {
        return {
            changes: [],
            additions: 0,
            deletions: 0,
            modifications: 0,
        };
    }

    const changes: LineDiff[] = [];
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    let prefix = 0;
    while (
        prefix < oldLines.length &&
        prefix < newLines.length &&
        oldLines[prefix] === newLines[prefix]
    ) {
        prefix++;
    }

    let oldEnd = oldLines.length - 1;
    let newEnd = newLines.length - 1;
    while (
        oldEnd >= prefix &&
        newEnd >= prefix &&
        oldLines[oldEnd] === newLines[newEnd]
    ) {
        oldEnd--;
        newEnd--;
    }

    const oldMiddle = oldLines.slice(prefix, oldEnd + 1);
    const newMiddle = newLines.slice(prefix, newEnd + 1);

    // Cap the number of preview change entries to keep Monaco decoration cost bounded.
    const MAX_CHANGE_ENTRIES = 5000;
    const estimatedEntries = Math.max(oldMiddle.length, newMiddle.length);
    if (estimatedEntries > MAX_CHANGE_ENTRIES) {
        additions = Math.max(0, newMiddle.length - oldMiddle.length);
        deletions = Math.max(0, oldMiddle.length - newMiddle.length);
        modifications = Math.min(oldMiddle.length, newMiddle.length);
        return {
            changes: [{
                type: 'modified',
                lineNumber: Math.max(1, prefix + 1),
                oldLine: '[Large diff preview condensed]',
                newLine: '[Large diff preview condensed]',
            }],
            additions,
            deletions,
            modifications,
        };
    }

    const overlap = Math.min(oldMiddle.length, newMiddle.length);
    for (let i = 0; i < overlap; i++) {
        const oldLine = oldMiddle[i];
        const newLine = newMiddle[i];
        if (oldLine !== newLine) {
            changes.push({
                type: 'modified',
                lineNumber: prefix + i + 1,
                oldLine,
                newLine,
            });
            modifications++;
        }
    }

    if (oldMiddle.length > overlap) {
        for (let i = overlap; i < oldMiddle.length; i++) {
            changes.push({
                type: 'removed',
                lineNumber: prefix + overlap + 1,
                oldLine: oldMiddle[i],
            });
            deletions++;
        }
    }

    if (newMiddle.length > overlap) {
        for (let i = overlap; i < newMiddle.length; i++) {
            changes.push({
                type: 'added',
                lineNumber: prefix + i + 1,
                newLine: newMiddle[i],
            });
            additions++;
        }
    }

    return { changes, additions, deletions, modifications };
}

/**
 * Convert diff result to inline diff changes for the store
 */
export function diffToInlineChanges(diffResult: DiffResult): Array<{
    type: 'insert' | 'delete' | 'replace';
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    newText: string;
    oldText: string;
}> {
    const inlineChanges: Array<{
        type: 'insert' | 'delete' | 'replace';
        range: {
            startLine: number;
            startColumn: number;
            endLine: number;
            endColumn: number;
        };
        newText: string;
        oldText: string;
    }> = [];

    for (const change of diffResult.changes) {
        if (change.type === 'unchanged') continue;

        let type: 'insert' | 'delete' | 'replace';
        if (change.type === 'added') {
            type = 'insert';
        } else if (change.type === 'removed') {
            type = 'delete';
        } else {
            type = 'replace';
        }

        inlineChanges.push({
            type,
            range: {
                startLine: change.lineNumber,
                startColumn: 1,
                endLine: change.lineNumber,
                endColumn: Number.MAX_SAFE_INTEGER,
            },
            newText: change.newLine || '',
            oldText: change.oldLine || '',
        });
    }

    return inlineChanges;
}
