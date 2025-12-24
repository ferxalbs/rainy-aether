import React, { useState, useCallback, useEffect, useRef } from "react";
import { addRemote } from "@/stores/gitStore";
import { cn } from "@/lib/utils";

interface RemoteConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * VS Code-style quick input for adding remotes
 * Appears centered at top like VS Code command palette
 */
const RemoteConfigDialog: React.FC<RemoteConfigDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [remoteName, setRemoteName] = useState("origin");
    const [remoteUrl, setRemoteUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setStep(1);
            setRemoteName("origin");
            setRemoteUrl("");
            setIsSubmitting(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Focus input when step changes
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [step, open]);

    const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onOpenChange(false);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();

            if (step === 1) {
                if (remoteName.trim()) {
                    setStep(2);
                }
            } else {
                if (remoteUrl.trim() && !isSubmitting) {
                    setIsSubmitting(true);
                    try {
                        await addRemote(remoteName.trim(), remoteUrl.trim());
                        onOpenChange(false);
                    } catch {
                        // Error shown by gitStore
                        setIsSubmitting(false);
                    }
                }
            }
        }
    }, [step, remoteName, remoteUrl, isSubmitting, onOpenChange]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-150"
                onClick={() => onOpenChange(false)}
            />

            {/* Quick input - positioned at top center like VS Code */}
            <div className={cn(
                "fixed z-50 w-[90vw] sm:w-[70vw] md:w-[50vw] lg:w-[40vw] max-w-[500px] min-w-[280px]",
                "top-[12%] left-1/2 -translate-x-1/2",
                "animate-in fade-in-0 slide-in-from-top-2 duration-200"
            )}>
                <div className={cn(
                    "bg-popover/95 backdrop-blur-xl border border-border/60 rounded-lg shadow-2xl",
                    "ring-1 ring-white/5"
                )}>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
                        <div className={cn(
                            "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium",
                            step === 1
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}>
                            1
                        </div>
                        <div className="w-6 h-px bg-border/60" />
                        <div className={cn(
                            "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium",
                            step === 2
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}>
                            2
                        </div>
                        <span className="ml-2 text-xs text-muted-foreground">
                            {step === 1 ? "Remote name" : "Repository URL"}
                        </span>
                    </div>

                    {/* Label */}
                    <div className="px-3 pt-3 pb-1">
                        <label className="text-sm font-medium text-foreground">
                            {step === 1
                                ? "Enter remote name"
                                : `Enter URL for "${remoteName}"`
                            }
                        </label>
                    </div>

                    {/* Input */}
                    <div className="px-3 pb-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={step === 1 ? remoteName : remoteUrl}
                            onChange={(e) => step === 1 ? setRemoteName(e.target.value) : setRemoteUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={step === 1 ? "origin" : "https://github.com/user/repo.git"}
                            disabled={isSubmitting}
                            className={cn(
                                "w-full px-3 py-2 text-sm rounded-md",
                                "bg-background/80 border border-border/60",
                                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                                "placeholder:text-muted-foreground/50 transition-all",
                                isSubmitting && "opacity-50 cursor-not-allowed"
                            )}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>

                    {/* Hints for URL step */}
                    {step === 2 && (
                        <div className="px-3 pb-3 pt-0">
                            <div className="text-[11px] text-muted-foreground/70 space-y-0.5">
                                <div className="font-medium text-muted-foreground mb-1">Supported formats:</div>
                                <div className="pl-2">• https://github.com/user/repo.git</div>
                                <div className="pl-2">• git@github.com:user/repo.git</div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-muted/30 rounded-b-lg">
                        <div className="text-[11px] text-muted-foreground">
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
                            <span className="ml-1">{step === 1 ? "Next" : "Add remote"}</span>
                            <span className="mx-2">•</span>
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
                            <span className="ml-1">Cancel</span>
                        </div>
                        {isSubmitting && (
                            <div className="text-xs text-muted-foreground">Adding...</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default RemoteConfigDialog;

// Legacy export for compatibility
export function setupRemoteConfigListener(): () => void {
    return () => { };
}
