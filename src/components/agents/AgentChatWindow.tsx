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
                            return !inline && match ? (
                                <div className="relative group">
                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 bg-muted/50 hover:bg-muted"
                                            onClick={() => navigator.clipboard.writeText(String(children))}
                                        >
                                            <span className="sr-only">Copy</span>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="h-3 w-3"
                                            >
                                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                            </svg>
                                        </Button>
                                    </div>
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{ margin: 0, borderRadius: '0.375rem' }}
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
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
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="flex flex-col items-center gap-6 text-muted-foreground max-w-md text-center">
                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                                <Bot className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-foreground">How can I help you today?</h3>
                                <p className="text-sm text-muted-foreground">
                                    I can help you write code, debug issues, explain concepts, and manage your project.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-full mt-4">
                                <Button variant="outline" className="h-auto py-3 px-4 justify-start text-left text-xs" onClick={() => setInput("Explain the project structure")}>
                                    <span className="truncate">Explain project structure</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 px-4 justify-start text-left text-xs" onClick={() => setInput("Find bugs in current file")}>
                                    <span className="truncate">Find bugs in current file</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 px-4 justify-start text-left text-xs" onClick={() => setInput("Create a new component")}>
                                    <span className="truncate">Create a new component</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 px-4 justify-start text-left text-xs" onClick={() => setInput("Refactor selected code")}>
                                    <span className="truncate">Refactor selected code</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn(
                                "flex gap-4 group",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}>
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted border"
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
                                        <div className="w-full space-y-2 mt-2">
                                            {msg.toolCalls.map((tool) => (
                                                <ToolCallItem key={tool.id} tool={tool} />
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="h-8 w-8 rounded-lg bg-muted border flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col gap-2 max-w-[85%]">
                                    {streamingContent ? (
                                        <div className="rounded-lg p-4 text-sm bg-card border shadow-sm">
                                            {renderMessageContent(streamingContent)}
                                            <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1 align-middle" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm p-2 bg-muted/30 rounded-lg border border-transparent animate-pulse">
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

            <div className="p-4 pb-6 bg-background/80 backdrop-blur-sm border-t">
                <div className="mx-auto max-w-3xl relative rounded-xl border bg-card shadow-lg ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything (Ctrl+Enter to send)..."
                        className="min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                        disabled={isLoading}
                    />

                    <div className="flex items-center justify-between p-2 pl-3 border-t bg-muted/20 rounded-b-xl">
                        <div className="flex items-center gap-2">
                            <Select
                                value={activeSession?.model || AVAILABLE_MODELS[0].id}
                                onValueChange={handleModelChange}
                            >
                                <SelectTrigger className="h-7 w-[180px] border-0 bg-background/50 shadow-none text-xs hover:bg-background transition-colors">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_MODELS.map((model) => (
                                        <SelectItem key={model.id} value={model.id} className="text-xs">
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
                                <AtSign className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                className={cn(
                                    "h-8 w-8 ml-2 rounded-lg transition-all",
                                    input.trim() ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                                onClick={handleSendClick}
                                disabled={isLoading || !input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-2 text-[10px] text-muted-foreground/60">
                    AI can make mistakes. Please review generated code.
                </div>
            </div>
        </div>
    )
}
