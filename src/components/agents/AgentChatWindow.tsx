import { Send, Bot, Loader2, User, Sparkles, Cpu } from "lucide-react"
import { useEffect, useRef, memo, useCallback, useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from "@/components/ui/button"
import { useAgentChat } from "@/hooks/useAgentChat"
import { cn } from "@/lib/utils"
import { useActiveSession, agentActions } from "@/stores/agentStore"
import { AVAILABLE_MODELS } from "@/services/agent/providers"
import { CodeBlock } from "./CodeBlock"
import { ToolExecutionList } from "./ToolExecutionList"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe, ChevronDown } from "lucide-react"

export interface AgentChatWindowProps {
    compact?: boolean;
}

// ============================================
// ISOLATED INPUT COMPONENT - CRITICAL FOR PERF
// Uses uncontrolled input to avoid re-renders
// ============================================
interface ChatInputAreaProps {
    compact: boolean;
    isLoading: boolean;
    onSend: (message: string) => void;
    activeSessionId?: string;
    activeSessionModel?: string;
}

const ChatInputArea = memo(function ChatInputArea({
    compact,
    isLoading,
    onSend,
    activeSessionId,
    activeSessionModel
}: ChatInputAreaProps) {
    // Use uncontrolled input with ref - NO STATE = NO RE-RENDERS
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [hasContent, setHasContent] = useState(false);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const value = inputRef.current?.value.trim() || '';
            if (value && !isLoading) {
                onSend(value);
                if (inputRef.current) {
                    inputRef.current.value = '';
                    setHasContent(false);
                }
            }
        }
    }, [isLoading, onSend]);

    const handleSendClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const value = inputRef.current?.value.trim() || '';
        if (value && !isLoading) {
            onSend(value);
            if (inputRef.current) {
                inputRef.current.value = '';
                setHasContent(false);
            }
        }
    }, [isLoading, onSend]);

    const handleInput = useCallback(() => {
        const hasText = !!(inputRef.current?.value.trim());
        if (hasText !== hasContent) {
            setHasContent(hasText);
        }
    }, [hasContent]);

    const handleModelChange = useCallback((modelId: string) => {
        if (activeSessionId) {
            agentActions.updateSessionModel(activeSessionId, modelId);
        }
    }, [activeSessionId]);

    return (
        <div className={cn("shrink-0 p-4 bg-background", compact && "p-2")}>
            <div className="max-w-4xl mx-auto w-full relative">
                <div className={cn(
                    "relative rounded-xl border border-border bg-muted/30 focus-within:bg-muted/40 focus-within:border-primary/20 transition-all duration-200 shadow-sm",
                    compact && "rounded-lg"
                )}>
                    <textarea
                        ref={inputRef}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        placeholder={compact ? "Ask anything..." : "Ask, search, or make anything..."}
                        className={cn(
                            "min-h-[52px] max-h-[200px] w-full resize-none border-0 bg-transparent px-4 py-3.5 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none placeholder:text-muted-foreground/40 text-foreground/90 leading-relaxed scrollbar-hide",
                            compact && "min-h-[44px] px-3 py-2.5 text-sm"
                        )}
                        disabled={isLoading}
                    />

                    {/* Bottom Actions Bar */}
                    <div className={cn("flex items-center justify-between px-2 pb-2", compact && "px-1 pb-1")}>
                        <div className="flex items-center gap-1">
                            {/* Auto / Model Selector */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-background/50 hover:text-foreground transition-all group text-xs font-medium text-muted-foreground/70">
                                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                        {!compact && (
                                            <span className="group-hover:text-primary transition-colors">
                                                {activeSessionModel ? (AVAILABLE_MODELS.find(m => m.id === activeSessionModel)?.name || 'Auto') : 'Auto'}
                                            </span>
                                        )}
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[200px]">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Select Agent Mode</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {AVAILABLE_MODELS.map((model) => (
                                        <DropdownMenuItem
                                            key={model.id}
                                            onClick={() => handleModelChange(model.id)}
                                            className="flex items-center justify-between cursor-pointer"
                                        >
                                            <span>{model.name}</span>
                                            {activeSessionModel === model.id && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Web Search Toggle */}
                            <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-background/50 hover:text-foreground transition-all group text-xs font-medium text-muted-foreground/70">
                                <Globe className="h-3.5 w-3.5 group-hover:text-blue-400 transition-colors" />
                                {!compact && <span>Search</span>}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                className={cn(
                                    "h-7 w-7 rounded-full transition-all duration-300 shadow-sm",
                                    hasContent
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-50 cursor-not-allowed",
                                    compact && "h-6 w-6"
                                )}
                                onClick={handleSendClick}
                                disabled={isLoading || !hasContent}
                            >
                                {isLoading ? (
                                    <div className="h-2 w-2 bg-current rounded-full" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {!compact && (
                    <div className="text-center mt-2 flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-muted-foreground font-medium">Rainy Agent can make mistakes. Check important info.</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export function AgentChatWindow({ compact = false }: AgentChatWindowProps) {
    const { messages, isLoading, sendMessage, streamingContent } = useAgentChat();
    const activeSession = useActiveSession();
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, streamingContent]);

    // Callback for sending messages from the isolated input
    const handleSend = useCallback((message: string) => {
        if (activeSession) {
            sendMessage(message);
        }
    }, [activeSession, sendMessage]);

    const renderMessageContent = (content: string) => {
        return (
            <div className={cn(
                "text-sm text-foreground/90 leading-relaxed max-w-none",
                compact && "text-xs leading-normal"
            )}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Headings
                        h1: ({ className, ...props }) => <h1 className={cn("text-2xl font-bold tracking-tight mb-4 mt-6 first:mt-0 text-foreground", compact && "text-lg mb-2 mt-3", className)} {...props} />,
                        h2: ({ className, ...props }) => <h2 className={cn("text-xl font-bold tracking-tight mb-3 mt-5 text-foreground", compact && "text-base mb-1.5 mt-2", className)} {...props} />,
                        h3: ({ className, ...props }) => <h3 className={cn("text-lg font-semibold tracking-tight mb-2 mt-4 text-foreground", compact && "text-sm mb-1.5 mt-2", className)} {...props} />,
                        h4: ({ className, ...props }) => <h4 className={cn("text-base font-semibold tracking-tight mb-2 mt-3 text-foreground", className)} {...props} />,

                        // Paragraphs and Lists
                        p: ({ className, ...props }) => <p className={cn("mb-3 last:mb-0 leading-relaxed", compact && "mb-2", className)} {...props} />,
                        ul: ({ className, ...props }) => <ul className={cn("my-2 ml-6 list-disc [&>li]:mt-0.5", compact && "ml-4 my-1", className)} {...props} />,
                        ol: ({ className, ...props }) => <ol className={cn("my-2 ml-6 list-decimal [&>li]:mt-0.5", compact && "ml-4 my-1", className)} {...props} />,
                        li: ({ className, ...props }) => <li className={cn("mb-0.5 pl-0.5", className)} {...props} />,

                        // Block-level elements
                        blockquote: ({ className, ...props }) => (
                            <blockquote className={cn("mt-4 mb-4 border-l-4 border-primary/20 pl-4 italic text-muted-foreground", compact && "mt-2 mb-2 pl-2 border-l-2", className)} {...props} />
                        ),
                        hr: ({ className, ...props }) => <hr className={cn("my-6 border-border", compact && "my-3", className)} {...props} />,

                        // Tables
                        table: ({ className, ...props }) => (
                            <div className="my-4 w-full overflow-y-auto rounded-lg border border-border">
                                <table className={cn("w-full text-sm", compact && "text-xs", className)} {...props} />
                            </div>
                        ),
                        thead: ({ className, ...props }) => <thead className={cn("bg-muted/50 border-b border-border text-left font-medium", className)} {...props} />,
                        tbody: ({ className, ...props }) => <tbody className={cn("divide-y divide-border/50", className)} {...props} />,
                        tr: ({ className, ...props }) => <tr className={cn("transition-colors hover:bg-muted/30", className)} {...props} />,
                        th: ({ className, ...props }) => <th className={cn("h-10 px-4 align-middle font-medium text-muted-foreground", compact && "h-8 px-2", className)} {...props} />,
                        td: ({ className, ...props }) => <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", compact && "p-2", className)} {...props} />,

                        // Inline elements
                        a: ({ className, ...props }) => (
                            <a
                                className={cn("font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors", className)}
                                target="_blank"
                                rel="noreferrer"
                                {...props}
                            />
                        ),
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : ''

                            if (!inline && match) {
                                return (
                                    <div className="my-3 rounded-lg overflow-hidden border border-border/50 bg-[#1e1e2e]">
                                        <CodeBlock
                                            language={language}
                                            value={String(children).replace(/\n$/, '')}
                                            {...props}
                                        />
                                    </div>
                                )
                            }
                            return (
                                <code className={cn("bg-muted/50 px-1.5 py-0.5 rounded-md font-mono text-[13px] text-foreground border border-border/40", compact && "text-[11px]", className)} {...props}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    // Filter out system messages for display
    const displayMessages = messages.filter(msg => msg.role !== 'system');
    const hasUserMessages = displayMessages.length > 0;

    return (
        <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
            {/* Top Bar removed - moved to AgentsLayout */}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-0 scroll-smooth" ref={scrollRef}>
                {!hasUserMessages ? (
                    <div className={cn("h-full flex flex-col items-center justify-center p-8", compact && "p-4")}>
                        <div className={cn("flex flex-col items-center gap-6 max-w-lg text-center animate-in fade-in zoom-in-95 duration-500", compact && "gap-4")}>
                            <div className={cn(
                                "h-20 w-20 rounded-2xl bg-gradient-to-tr from-purple-500/10 via-indigo-500/10 to-blue-500/10 flex items-center justify-center border border-white/5 shadow-xl",
                                compact && "h-12 w-12 rounded-xl"
                            )}>
                                <Bot className={cn("h-10 w-10 text-foreground/80", compact && "h-6 w-6")} />
                            </div>
                            <div className={cn("space-y-3", compact && "space-y-1.5")}>
                                <h3 className={cn(
                                    "text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60",
                                    compact && "text-lg"
                                )}>
                                    How can I help you build?
                                </h3>
                                <p className={cn("text-muted-foreground", compact && "text-xs max-w-[200px] mx-auto")}>
                                    I'm your AI coding companion. Ask me to generate components, debug code, or explain complex concepts.
                                </p>
                            </div>

                            {!compact && (
                                <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-6">
                                    {[
                                        { icon: CodeBlock, label: "Generate React Component" },
                                        { icon: Cpu, label: "Explain Code" },
                                        { icon: Bot, label: "Refactor Function" },
                                        { icon: Sparkles, label: "Find Bugs" }
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5 hover:bg-muted/50 hover:border-white/10 transition-all text-sm text-muted-foreground hover:text-foreground text-left group"
                                            onClick={() => handleSend(item.label)}
                                        >
                                            <div className="p-2 rounded-lg bg-background/50 group-hover:bg-background transition-colors">
                                                {/* @ts-ignore - Lucide icon compatibility */}
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0 min-h-full">
                        {displayMessages.map((msg) => (
                            <div key={msg.id} className={cn(
                                "flex gap-6 px-6 py-8 border-b border-border/40 group transition-colors",
                                compact && "gap-3 px-3 py-4",
                                msg.role === 'user' ? "bg-muted/10 ignore-prose" : "bg-transparent"
                            )}>
                                {!compact && (
                                    <div className="shrink-0 mt-0.5">
                                        {msg.role === 'user' ? (
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center ring-1 ring-white/10">
                                                <Sparkles className="h-4 w-4 text-purple-400" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 flex-1 min-w-0 max-w-4xl">
                                    <div className="flex items-center gap-2 mb-0">
                                        <span className="font-semibold text-sm text-foreground">
                                            {msg.role === 'user' ? 'You' : 'Rainy Agent'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="text-sm text-foreground/90 leading-relaxed font-normal">
                                        {renderMessageContent(msg.content)}
                                    </div>

                                    {/* Render Tool Calls */}
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <ToolExecutionList tools={msg.toolCalls} className="mt-4" compact={compact} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className={cn("flex gap-6 px-6 py-8 border-b border-border/40 bg-transparent animate-in fade-in duration-300", compact && "gap-3 px-3 py-4")}>
                                {!compact && (
                                    <div className="shrink-0 mt-0.5">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center ring-1 ring-white/10">
                                            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 flex-1 min-w-0 max-w-4xl">
                                    <div className="flex items-center gap-2 mb-0">
                                        <span className="font-semibold text-sm text-foreground">Rainy Agent</span>
                                    </div>
                                    {streamingContent ? (
                                        <div className="text-sm text-foreground/90 leading-relaxed">
                                            {renderMessageContent(streamingContent)}
                                            <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-1 align-middle" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span className="text-xs">Thinking...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} className="h-4" />
                    </div>
                )}
            </div>

            {/* Input Area - ISOLATED COMPONENT FOR PERFORMANCE */}
            <ChatInputArea
                compact={compact}
                isLoading={isLoading}
                onSend={handleSend}
                activeSessionId={activeSession?.id}
                activeSessionModel={activeSession?.model}
            />
        </div>
    )
}
