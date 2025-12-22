/**
 * Editor Error Boundary
 * Catches errors in editor-related components (like Breadcrumbs)
 * Prevents crashes from propagating to the entire editor
 */

import React, { Component, ErrorInfo } from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class EditorErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[EditorErrorBoundary] Caught error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    // Reset error state when children change (e.g., file switch)
    componentDidUpdate(prevProps: Props) {
        if (prevProps.children !== this.props.children && this.state.hasError) {
            this.setState({ hasError: false, error: null });
        }
    }

    render() {
        if (this.state.hasError) {
            // Return fallback or minimal error indicator
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Minimal error UI that doesn't break layout
            return (
                <div className="flex items-center px-3 py-1 text-xs text-muted-foreground bg-muted/30 border-b border-border">
                    <span className="text-red-400 mr-2">⚠</span>
                    <span>Unable to load component</span>
                </div>
            );
        }

        return this.props.children;
    }
}

export default EditorErrorBoundary;
