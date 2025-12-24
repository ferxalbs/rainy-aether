/**
 * Inline Diff Widget
 *
 * Floating widget that appears when AI is making inline edits.
 * Shows agent info, change statistics, and accept/reject actions.
 */

import React from 'react';
import { Bot, Check, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineDiffWidgetProps {
    /** Whether the widget is visible */
    isVisible: boolean;
    /** Whether streaming is in progress */
    isStreaming: boolean;
    /** Number of additions */
    additions: number;
    /** Number of deletions */
    deletions: number;
    /** Agent display name */
    agentName: string;
    /** Description of changes */
    description?: string;
    /** Accept callback */
    onAccept: () => void;
    /** Reject callback */
    onReject: () => void;
}

const InlineDiffWidget: React.FC<InlineDiffWidgetProps> = ({
    isVisible,
    isStreaming,
    additions,
    deletions,
    agentName,
    description,
    onAccept,
    onReject,
}) => {
    if (!isVisible) return null;

    // Detect platform for keyboard shortcut display
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    return (
        <div
            className={cn(
                'inline-diff-widget',
                isStreaming && 'inline-diff-widget-streaming'
            )}
        >
            {/* Header */}
            <div className="inline-diff-widget-header">
                <div className="inline-diff-widget-agent">
                    <Bot className="inline-diff-widget-agent-icon" size={16} />
                    <span>{agentName}</span>
                </div>
                {isStreaming && (
                    <div className="inline-diff-widget-streaming-indicator">
                        <div className="inline-diff-widget-streaming-dot" />
                        <span>Editing...</span>
                    </div>
                )}
            </div>

            {/* Description if provided */}
            {description && (
                <div className="text-xs text-[var(--text-secondary)] opacity-80 line-clamp-2">
                    {description}
                </div>
            )}

            {/* Stats */}
            <div className="inline-diff-widget-stats">
                <div className="inline-diff-widget-stat inline-diff-widget-stat-add">
                    <Plus size={12} />
                    <span>{additions} line{additions !== 1 ? 's' : ''}</span>
                </div>
                <div className="inline-diff-widget-stat inline-diff-widget-stat-delete">
                    <Minus size={12} />
                    <span>{deletions} line{deletions !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="inline-diff-widget-actions">
                <button
                    className="inline-diff-widget-btn inline-diff-widget-btn-accept"
                    onClick={onAccept}
                    disabled={isStreaming}
                >
                    <Check size={14} />
                    <span>Accept</span>
                </button>
                <button
                    className="inline-diff-widget-btn inline-diff-widget-btn-reject"
                    onClick={onReject}
                >
                    <X size={14} />
                    <span>Reject</span>
                </button>
            </div>

            {/* Keyboard shortcuts */}
            <div className="inline-diff-widget-shortcuts">
                <div className="inline-diff-widget-shortcut">
                    <kbd>{modKey}</kbd>
                    <kbd>Enter</kbd>
                    <span>Accept</span>
                </div>
                <div className="inline-diff-widget-shortcut">
                    <kbd>Esc</kbd>
                    <span>Reject</span>
                </div>
            </div>
        </div>
    );
};

export default InlineDiffWidget;
