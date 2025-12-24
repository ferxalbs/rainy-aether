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
 * Simple Longest Common Subsequence (LCS) based diff
 */
export function computeLineDiff(oldContent: string, newContent: string): DiffResult {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const changes: LineDiff[] = [];
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    // Use a simple line-by-line comparison with context matching
    const lcs = computeLCS(oldLines, newLines);

    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
        const currentLCS = lcsIdx < lcs.length ? lcs[lcsIdx] : null;

        // Check if current old line is in LCS
        if (currentLCS && oldIdx === currentLCS.oldIndex && newIdx === currentLCS.newIndex) {
            // Unchanged line
            changes.push({
                type: 'unchanged',
                lineNumber: newIdx + 1,
                oldLine: oldLines[oldIdx],
                newLine: newLines[newIdx],
            });
            oldIdx++;
            newIdx++;
            lcsIdx++;
        } else if (currentLCS && oldIdx < currentLCS.oldIndex && newIdx < currentLCS.newIndex) {
            // Both have differences before the next LCS match - check if modification
            if (newLines[newIdx] !== undefined && oldLines[oldIdx] !== undefined) {
                changes.push({
                    type: 'modified',
                    lineNumber: newIdx + 1,
                    oldLine: oldLines[oldIdx],
                    newLine: newLines[newIdx],
                });
                modifications++;
                oldIdx++;
                newIdx++;
            }
        } else if (!currentLCS || (currentLCS && oldIdx < currentLCS.oldIndex)) {
            // Line was deleted from old
            changes.push({
                type: 'removed',
                lineNumber: newIdx + 1,
                oldLine: oldLines[oldIdx],
            });
            deletions++;
            oldIdx++;
        } else if (!currentLCS || (currentLCS && newIdx < currentLCS.newIndex)) {
            // Line was added in new
            changes.push({
                type: 'added',
                lineNumber: newIdx + 1,
                newLine: newLines[newIdx],
            });
            additions++;
            newIdx++;
        } else {
            // Fallback - shouldn't happen but handle gracefully
            if (newIdx < newLines.length) {
                changes.push({
                    type: 'added',
                    lineNumber: newIdx + 1,
                    newLine: newLines[newIdx],
                });
                additions++;
                newIdx++;
            } else if (oldIdx < oldLines.length) {
                changes.push({
                    type: 'removed',
                    lineNumber: newIdx + 1,
                    oldLine: oldLines[oldIdx],
                });
                deletions++;
                oldIdx++;
            }
        }
    }

    return { changes, additions, deletions, modifications };
}

interface LCSMatch {
    oldIndex: number;
    newIndex: number;
    line: string;
}

/**
 * Compute Longest Common Subsequence of lines
 */
function computeLCS(oldLines: string[], newLines: string[]): LCSMatch[] {
    const m = oldLines.length;

    // Create a map for quick lookup
    const newLineMap = new Map<string, number[]>();
    newLines.forEach((line, idx) => {
        if (!newLineMap.has(line)) {
            newLineMap.set(line, []);
        }
        newLineMap.get(line)!.push(idx);
    });

    // Find matches
    const matches: LCSMatch[] = [];
    let lastNewIdx = -1;

    for (let i = 0; i < m; i++) {
        const line = oldLines[i];
        const candidates = newLineMap.get(line);

        if (candidates) {
            // Find the first candidate that's after our last match
            for (const candidate of candidates) {
                if (candidate > lastNewIdx) {
                    matches.push({
                        oldIndex: i,
                        newIndex: candidate,
                        line,
                    });
                    lastNewIdx = candidate;
                    break;
                }
            }
        }
    }

    return matches;
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
