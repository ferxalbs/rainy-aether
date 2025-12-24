/**
 * Preview Browser Panel
 *
 * Integrated browser preview for viewing localhost development servers.
 * Uses Tauri 2's native WebviewWindow for optimal performance.
 *
 * NOTE: The actual webview content is rendered in a separate native window.
 * This panel provides controls and displays the current state.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Home,
    Globe,
    ExternalLink,
    X,
    Loader2,
    Plus,
    Monitor,
} from 'lucide-react';
import { useBrowserState, useBrowserInstances, useActiveInstance, browserActions } from '@/stores/browserStore';
import { cn } from '@/lib/cn';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PreviewBrowserPanelProps {
    onClose?: () => void;
    className?: string;
}

/** Navigation button component */
const NavButton: React.FC<{
    icon: React.ComponentType<{ size?: number; className?: string }>;
    onClick: () => void;
    disabled?: boolean;
    label: string;
    loading?: boolean;
}> = ({ icon: Icon, onClick, disabled, label, loading }) => (
    <TooltipProvider delayDuration={200}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    disabled={disabled}
                    className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-md transition-all',
                        'hover:bg-white/10 active:bg-white/15',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={label}
                >
                    {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Icon size={14} />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export const PreviewBrowserPanel: React.FC<PreviewBrowserPanelProps> = ({
    onClose,
    className,
}) => {
    const browserState = useBrowserState();
    const instanceList = useBrowserInstances();
    const activeInstance = useActiveInstance();
    const activeInstanceId = browserState.activeInstanceId;

    const [urlInput, setUrlInput] = useState('http://localhost:3000');
    const [isUrlFocused, setIsUrlFocused] = useState(false);

    // Initialize store on mount
    useEffect(() => {
        browserActions.initialize();
    }, []);

    // Sync URL input with active instance
    useEffect(() => {
        if (activeInstance && !isUrlFocused) {
            setUrlInput(activeInstance.url);
        }
    }, [activeInstance?.url, isUrlFocused]);

    const handleNavigate = useCallback(() => {
        if (!activeInstanceId) {
            // No browser open, open one
            browserActions.openBrowser(urlInput);
        } else {
            browserActions.navigate(activeInstanceId, urlInput);
        }
    }, [activeInstanceId, urlInput]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleNavigate();
            }
        },
        [handleNavigate]
    );

    const handleOpenNew = useCallback(() => {
        browserActions.openBrowser(urlInput);
    }, [urlInput]);

    const handleHome = useCallback(() => {
        if (activeInstanceId) {
            browserActions.navigate(activeInstanceId, 'http://localhost:3000');
        }
    }, [activeInstanceId]);

    return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
            {/* Browser Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                {/* Navigation buttons */}
                <div className="flex items-center gap-1">
                    <NavButton
                        icon={ArrowLeft}
                        onClick={() => activeInstanceId && browserActions.goBack(activeInstanceId)}
                        disabled={!activeInstance?.canGoBack}
                        label="Back"
                    />
                    <NavButton
                        icon={ArrowRight}
                        onClick={() => activeInstanceId && browserActions.goForward(activeInstanceId)}
                        disabled={!activeInstance?.canGoForward}
                        label="Forward"
                    />
                    <NavButton
                        icon={RotateCw}
                        onClick={() => activeInstanceId && browserActions.reload(activeInstanceId)}
                        disabled={!activeInstanceId}
                        loading={activeInstance?.isLoading}
                        label="Reload"
                    />
                    <NavButton icon={Home} onClick={handleHome} disabled={!activeInstanceId} label="Home" />
                </div>

                {/* URL Bar */}
                <div className="flex-1 flex items-center">
                    <div
                        className={cn(
                            'flex items-center flex-1 h-7 px-2 rounded-md border bg-background/50 transition-all',
                            isUrlFocused
                                ? 'border-primary ring-1 ring-primary/30'
                                : 'border-border hover:border-muted-foreground/30'
                        )}
                    >
                        <Globe size={12} className="text-muted-foreground mr-2 shrink-0" />
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onFocus={() => setIsUrlFocused(true)}
                            onBlur={() => setIsUrlFocused(false)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter URL (e.g., http://localhost:3000)"
                            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                        />
                        {activeInstance?.isLoading && (
                            <Loader2 size={12} className="text-primary animate-spin ml-2" />
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                    <NavButton icon={Plus} onClick={handleOpenNew} label="Open new preview" />
                    {onClose && <NavButton icon={X} onClick={onClose} label="Close panel" />}
                </div>
            </div>

            {/* Browser Instances / Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {instanceList.length === 0 ? (
                    // Empty state
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="p-4 rounded-full bg-muted/30">
                            <Monitor size={32} className="opacity-50" />
                        </div>
                        <div className="text-center max-w-md">
                            <h3 className="text-sm font-medium text-foreground mb-1">No Preview Open</h3>
                            <p className="text-xs">
                                Enter a URL above and press Enter to open a browser preview.
                                <br />
                                The preview will open in a separate window.
                            </p>
                        </div>
                        <button
                            onClick={() => browserActions.openBrowser('http://localhost:3000')}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium',
                                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                            )}
                        >
                            <ExternalLink size={14} />
                            Open localhost:3000
                        </button>
                    </div>
                ) : (
                    // Instance list
                    <div className="flex-1 flex flex-col gap-2 p-3 overflow-auto">
                        <div className="text-xs text-muted-foreground mb-1">
                            Active Browser Windows ({instanceList.length})
                        </div>
                        {instanceList.map((instance) => (
                            <div
                                key={instance.id}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                                    activeInstanceId === instance.id
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border bg-muted/20 hover:bg-muted/40'
                                )}
                                onClick={() => browserActions.setActiveInstance(instance.id)}
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                                    {instance.isLoading ? (
                                        <Loader2 size={16} className="text-primary animate-spin" />
                                    ) : (
                                        <Globe size={16} className="text-primary" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground truncate">
                                            {instance.title || 'Preview'}
                                        </span>
                                        {/* Status indicator */}
                                        <span className={cn(
                                            'px-1.5 py-0.5 text-[10px] font-medium rounded',
                                            instance.connectionStatus === 'connected' && 'bg-green-500/20 text-green-500',
                                            instance.connectionStatus === 'connecting' && 'bg-yellow-500/20 text-yellow-500',
                                            instance.connectionStatus === 'disconnected' && 'bg-orange-500/20 text-orange-500',
                                            instance.connectionStatus === 'failed' && 'bg-red-500/20 text-red-500',
                                            instance.connectionStatus === 'closed' && 'bg-muted text-muted-foreground'
                                        )}>
                                            {instance.connectionStatus}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">{instance.url}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            browserActions.reload(instance.id);
                                        }}
                                        className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCw size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            browserActions.closeBrowser(instance.id);
                                        }}
                                        className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            {activeInstance && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border text-xs text-muted-foreground bg-muted/20">
                    <span className="flex items-center gap-1.5">
                        {activeInstance.connectionStatus === 'connecting' && (
                            <>
                                <Loader2 size={10} className="animate-spin text-yellow-500" />
                                <span className="text-yellow-500">Connecting...</span>
                            </>
                        )}
                        {activeInstance.connectionStatus === 'connected' && (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-green-500">Connected</span>
                            </>
                        )}
                        {activeInstance.connectionStatus === 'disconnected' && (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                <span className="text-orange-500">Disconnected</span>
                            </>
                        )}
                        {activeInstance.connectionStatus === 'failed' && (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="text-red-500">Failed</span>
                            </>
                        )}
                        {activeInstance.connectionStatus === 'closed' && (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                <span>Closed</span>
                            </>
                        )}
                        {activeInstance.isLoading && activeInstance.connectionStatus !== 'connecting' && (
                            <Loader2 size={10} className="animate-spin ml-1" />
                        )}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="truncate flex-1">{activeInstance.url}</span>
                    {activeInstance.errorMessage && (
                        <span className="text-red-400 truncate max-w-[200px]" title={activeInstance.errorMessage}>
                            {activeInstance.errorMessage}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default PreviewBrowserPanel;
