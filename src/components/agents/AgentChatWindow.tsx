import { Image as ImageIcon, Send, Bot, Loader2, User, Settings, Sparkles, Cpu, Paperclip } from "lucide-react"
import { useEffect, useRef } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAgentChat } from "@/hooks/useAgentChat"
import { cn } from "@/lib/utils"
import { useActiveSession, agentActions } from "@/stores/agentStore"
import { AVAILABLE_MODELS } from "@/services/agent/providers"
import { ModelSelector } from "./ModelSelector"
import { CodeBlock } from "./CodeBlock"
import { ToolExecutionList } from "./ToolExecutionList"

export function AgentChatWindow() {
    const { messages, input, setInput, isLoading, sendMessage, streamingContent } = useAgentChat();
    const activeSession = useActiveSession();
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, streamingContent]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleSendClick = (e: React.MouseEvent) => {
        e.preventDefault();
        sendMessage();
    };

    const handleModelChange = (modelId: string) => {
        if (activeSession) {
            agentActions.updateSessionModel(activeSession.id, modelId);
        }
    };

    const renderMessageContent = (content: string) => {
        return (
            <div className="text-sm text-foreground/90 leading-relaxed max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Headings
                        h1: ({ className, ...props }) => <h1 className={cn("text-2xl font-bold tracking-tight mb-4 mt-6 first:mt-0 text-foreground", className)} {...props} />,
                        h2: ({ className, ...props }) => <h2 className={cn("text-xl font-bold tracking-tight mb-3 mt-5 text-foreground", className)} {...props} />,
                        h3: ({ className, ...props }) => <h3 className={cn("text-lg font-semibold tracking-tight mb-2 mt-4 text-foreground", className)} {...props} />,
                        h4: ({ className, ...props }) => <h4 className={cn("text-base font-semibold tracking-tight mb-2 mt-3 text-foreground", className)} {...props} />,

                        // Paragraphs and Lists
                        p: ({ className, ...props }) => <p className={cn("mb-3 last:mb-0 leading-relaxed", className)} {...props} />,
                        ul: ({ className, ...props }) => <ul className={cn("my-2 ml-6 list-disc [&>li]:mt-0.5", className)} {...props} />,
                        ol: ({ className, ...props }) => <ol className={cn("my-2 ml-6 list-decimal [&>li]:mt-0.5", className)} {...props} />,
                        li: ({ className, ...props }) => <li className={cn("mb-0.5 pl-0.5", className)} {...props} />,

                        // Block-level elements
                        blockquote: ({ className, ...props }) => (
                            <blockquote className={cn("mt-4 mb-4 border-l-4 border-primary/20 pl-4 italic text-muted-foreground", className)} {...props} />
                        ),
                        hr: ({ className, ...props }) => <hr className={cn("my-6 border-border", className)} {...props} />,

                        // Tables
                        table: ({ className, ...props }) => (
                            <div className="my-4 w-full overflow-y-auto rounded-lg border border-border">
                                <table className={cn("w-full text-sm", className)} {...props} />
                            </div>
                        ),
                        thead: ({ className, ...props }) => <thead className={cn("bg-muted/50 border-b border-border text-left font-medium", className)} {...props} />,
                        tbody: ({ className, ...props }) => <tbody className={cn("divide-y divide-border/50", className)} {...props} />,
                        tr: ({ className, ...props }) => <tr className={cn("transition-colors hover:bg-muted/30", className)} {...props} />,
                        th: ({ className, ...props }) => <th className={cn("h-10 px-4 align-middle font-medium text-muted-foreground", className)} {...props} />,
                        td: ({ className, ...props }) => <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />,

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
                                <code className={cn("bg-muted/50 px-1.5 py-0.5 rounded-md font-mono text-[13px] text-foreground border border-border/40", className)} {...props}>
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

    return (
        <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/10">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">
                            {activeSession?.name || 'Rainy Agent'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {AVAILABLE_MODELS.find(m => m.id === activeSession?.model)?.name || 'Gemini Flash 2.0 Lite'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-0 scroll-smooth" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="flex flex-col items-center gap-6 max-w-lg text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-purple-500/10 via-indigo-500/10 to-blue-500/10 flex items-center justify-center border border-white/5 shadow-xl">
                                <Bot className="h-10 w-10 text-foreground/80" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
                                    How can I help you build?
                                </h3>
                                <p className="text-muted-foreground">
                                    I'm your AI coding companion. Ask me to generate components, debug code, or explain complex concepts.
                                </p>
                            </div>

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
                                        onClick={() => setInput(item.label)}
                                    >
                                        <div className="p-2 rounded-lg bg-background/50 group-hover:bg-background transition-colors">
                                            {/* @ts-ignore - Lucide icon compatibility */}
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0 min-h-full">
                        {messages.filter(msg => msg.role !== 'system').map((msg) => (
                            <div key={msg.id} className={cn(
                                "flex gap-6 px-6 py-8 border-b border-border/40 group transition-colors",
                                msg.role === 'user' ? "bg-muted/10" : "bg-transparent"
                            )}>
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
                                        <ToolExecutionList tools={msg.toolCalls} className="mt-4" />
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-6 px-6 py-8 border-b border-border/40 bg-transparent animate-in fade-in duration-300">
                                <div className="shrink-0 mt-0.5">
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center ring-1 ring-white/10">
                                        <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                                    </div>
                                </div>
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

            {/* Input Area */}
            <div className="shrink-0 p-4 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20">
                <div className="max-w-4xl mx-auto w-full relative">
                    <div className="relative rounded-2xl border border-border/50 bg-muted/30 backdrop-blur-xl shadow-lg transition-all duration-300 focus-within:border-primary/30 focus-within:bg-muted/50 focus-within:shadow-primary/5 group overflow-hidden">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything..."
                            className="min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent p-4 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 text-foreground/90"
                            disabled={isLoading}
                        />

                        <div className="flex items-center justify-between p-2 pl-3 border-t border-border/10 bg-white/5">
                            <div className="flex items-center gap-2">
                                <ModelSelector
                                    value={activeSession?.model || AVAILABLE_MODELS[0].id}
                                    onValueChange={handleModelChange}
                                />
                            </div>

                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 ml-2 rounded-lg transition-all duration-300 shadow-sm",
                                        input.trim()
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={handleSendClick}
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-2.5 flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-muted-foreground font-medium">Rainy Agent can make mistakes. Check important info.</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
