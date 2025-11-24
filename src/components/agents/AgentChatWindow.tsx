import { AtSign, Image as ImageIcon, Send, Bot, Loader2, Terminal, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAgentChat } from "@/hooks/useAgentChat"
import { cn } from "@/lib/utils"
import { useActiveSession, agentActions } from "@/stores/agentStore"
import { AVAILABLE_MODELS } from "@/services/agent/providers"

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
        <div className="w-full bg-card border rounded-md overflow-hidden mt-2 text-sm">
            <div
                className="flex items-center justify-between p-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Terminal className="h-4 w-4" />
                    <span className="font-medium text-foreground">{tool.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {tool.status === 'success' && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Success
                        </span>
                    )}
                    {tool.status === 'error' && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                        </span>
                    )}
                    {(tool.status === 'pending' || !tool.status) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Running
                        </span>
                    )}
                </div>
            </div>
            
            {isExpanded && (
                <div className="p-3 border-t bg-background/50 space-y-3">
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Arguments</div>
                        <div className="bg-muted/30 p-2 rounded overflow-x-auto font-mono text-xs">
                            <pre>{JSON.stringify(tool.arguments, null, 2)}</pre>
                        </div>
                    </div>
                    
                    {tool.status === 'success' && tool.result !== undefined && (
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Result</div>
                            <div className="bg-muted/30 p-2 rounded overflow-x-auto font-mono text-xs max-h-[200px]">
                                <pre>{renderToolResult(tool.result)}</pre>
                            </div>
                        </div>
                    )}
                    
                    {tool.status === 'error' && (
                        <div>
                            <div className="text-xs font-semibold text-red-500 mb-1">Error Details</div>
                            <div className="bg-red-500/10 text-red-500 p-2 rounded font-mono text-xs">
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
                            return !inline && match ? (
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={cn("bg-muted px-1.5 py-0.5 rounded font-mono text-sm", className)} {...props}>
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
        <div className="flex flex-col h-full w-full bg-background relative">
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md text-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Bot className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">How can I help you today?</h3>
                            <p className="text-sm">Start a conversation to create a new agent or manage existing ones.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn(
                                "flex gap-4",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}>
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    {msg.role === 'user' ? <AtSign className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div className={cn(
                                    "flex flex-col gap-2 max-w-[85%]",
                                    msg.role === 'user' ? "items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "rounded-lg p-4 text-sm shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-card border"
                                    )}>
                                        {renderMessageContent(msg.content)}
                                    </div>
                                    
                                    {/* Render Tool Calls */}
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <div className="w-full space-y-2">
                                            {msg.toolCalls.map((tool) => (
                                                <ToolCallItem key={tool.id} tool={tool} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col gap-2 max-w-[85%]">
                                    {streamingContent ? (
                                        <div className="rounded-lg p-4 text-sm bg-card border shadow-sm">
                                            {renderMessageContent(streamingContent)}
                                            <span className="inline-block w-1 h-4 bg-foreground animate-pulse ml-1 align-middle" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm p-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Thinking...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 pb-6">
                <div className="mx-auto max-w-3xl relative rounded-xl border bg-card shadow-lg ring-1 ring-black/5">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Plan, @ for context, / for commands..."
                        className="min-h-[100px] w-full resize-none border-0 bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                        disabled={isLoading}
                    />

                    <div className="flex items-center justify-between p-3 border-t bg-muted/20 rounded-b-xl">
                        <div className="flex items-center gap-2">
                            <Select
                                value={activeSession?.model || AVAILABLE_MODELS[0].id}
                                onValueChange={handleModelChange}
                            >
                                <SelectTrigger className="h-8 w-[200px] border-0 bg-background shadow-sm">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_MODELS.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <AtSign className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                className="h-8 w-8 ml-2"
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-2 text-xs text-muted-foreground">
                    AI can make mistakes. Please review generated code.
                </div>
            </div>
        </div>
    )
}
