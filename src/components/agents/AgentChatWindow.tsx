import { AtSign, Image as ImageIcon, Send, Bot, Loader2, Terminal, CheckCircle2, XCircle, ChevronDown, ChevronRight, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
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

// Helper to safely render tool results
function renderToolResult(result: unknown): React.ReactNode {
    if (result === null || result === undefined) {
        return 'null';
    }
    if (typeof result === 'string') {
        return result;
    }
    try {
        return JSON.stringify(result, null, 2);
    } catch {
        return String(result);
    }
}

function ToolCallItem({ tool }: { tool: any }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="w-full bg-[#18181b] border border-[#27272a] rounded-md overflow-hidden mt-2 text-sm">
            <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-[#27272a] transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Terminal className="h-4 w-4" />
                    <span className="font-medium text-foreground text-xs">{tool.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {tool.status === 'success' && (
                        <span className="text-[10px] text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Success
                        </span>
                    )}
                    {tool.status === 'error' && (
                        <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                        </span>
                    )}
                    {(tool.status === 'pending' || !tool.status) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Running
                        </span>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="p-3 border-t border-[#27272a] bg-[#1e1e1e] space-y-3">
                    <div>
                        <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Arguments</div>
                        <div className="bg-[#18181b] p-2 rounded overflow-x-auto font-mono text-xs text-muted-foreground border border-[#27272a]">
                            <pre>{JSON.stringify(tool.arguments, null, 2)}</pre>
                        </div>
                    </div>

                    {tool.status === 'success' && tool.result !== undefined && (
                        <div>
                            <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Result</div>
                            <div className="bg-[#18181b] p-2 rounded overflow-x-auto font-mono text-xs text-muted-foreground border border-[#27272a] max-h-[200px]">
                                <pre>{renderToolResult(tool.result)}</pre>
                            </div>
                        </div>
                    )}

                    {tool.status === 'error' && (
                        <div>
                            <div className="text-[10px] font-semibold text-red-500 mb-1 uppercase tracking-wider">Error Details</div>
                            <div className="bg-red-500/10 text-red-500 p-2 rounded font-mono text-xs border border-red-500/20">
                                {tool.error}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function AgentChatWindow() {
    const { messages, input, setInput, isLoading, sendMessage, streamingContent } = useAgentChat();
    const activeSession = useActiveSession();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
            <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : ''

                            if (!inline && match) {
                                return (
                                    <CodeBlock
                                        language={language}
                                        value={String(children).replace(/\n$/, '')}
                                        {...props}
                                    />
                                )
                            }
                            return (
                                <code className={cn("bg-[#27272a] px-1.5 py-0.5 rounded font-mono text-sm text-primary", className)} {...props}>
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
        <div className="flex flex-col h-full w-full bg-[#18181b] relative">
            <div className="flex-1 overflow-y-auto p-0 scroll-smooth" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="flex flex-col items-center gap-6 text-muted-foreground max-w-md text-center">
                            <div className="h-12 w-12 rounded-xl bg-[#27272a] flex items-center justify-center">
                                <Bot className="h-6 w-6 text-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium text-foreground">Rainy Agent</h3>
                                <p className="text-sm text-muted-foreground">
                                    I'm here to help you build.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col pb-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn(
                                "flex gap-4 p-6 border-b border-[#27272a]/50 hover:bg-[#27272a]/20 transition-colors group",
                                msg.role === 'user' ? "bg-transparent" : "bg-transparent"
                            )}>
                                <div className="shrink-0 mt-1">
                                    {msg.role === 'user' ? (
                                        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded bg-purple-500/20 flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-purple-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm text-foreground">
                                            {msg.role === 'user' ? 'You' : 'Agent'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="text-sm text-muted-foreground/90 leading-relaxed">
                                        {renderMessageContent(msg.content)}
                                    </div>

                                    {/* Render Tool Calls */}
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <div className="w-full space-y-2 mt-3">
                                            {msg.toolCalls.map((tool) => (
                                                <ToolCallItem key={tool.id} tool={tool} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 p-6 border-b border-[#27272a]/50">
                                <div className="shrink-0 mt-1">
                                    <div className="h-6 w-6 rounded bg-purple-500/20 flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-purple-400" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm text-foreground">Agent</span>
                                    </div>
                                    {streamingContent ? (
                                        <div className="text-sm text-muted-foreground/90 leading-relaxed">
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
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#18181b] border-t border-[#27272a]">
                <div className="mx-auto max-w-4xl relative rounded-lg border border-[#27272a] bg-[#1e1e1e] focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className="min-h-[40px] max-h-[200px] w-full resize-none border-0 bg-transparent p-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                        disabled={isLoading}
                    />

                    <div className="flex items-center justify-between p-2 pl-3 border-t border-[#27272a] bg-[#1e1e1e] rounded-b-lg">
                        <div className="flex items-center gap-2">
                            <ModelSelector
                                value={activeSession?.model || AVAILABLE_MODELS[0].id}
                                onValueChange={handleModelChange}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[#27272a] rounded">
                                <AtSign className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[#27272a] rounded">
                                <ImageIcon className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                className={cn(
                                    "h-7 w-7 ml-2 rounded transition-all",
                                    input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-[#27272a] text-muted-foreground hover:bg-[#27272a]"
                                )}
                                onClick={handleSendClick}
                                disabled={isLoading || !input.trim()}
                            >
                                <Send className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-2 text-[10px] text-muted-foreground/40">
                    AI can make mistakes. Please review.
                </div>
            </div>
        </div>
    )
}
