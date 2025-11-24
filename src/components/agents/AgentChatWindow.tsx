import { AtSign, Image as ImageIcon, Send, Bot, Loader2, FileCode, Terminal } from "lucide-react"
import { useEffect, useRef } from "react"

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

export function AgentChatWindow() {
    const { messages, input, setInput, isLoading, sendMessage } = useAgentChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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
                                    "flex flex-col gap-2 max-w-[80%]",
                                    msg.role === 'user' ? "items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "rounded-lg p-3 text-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted/50 border"
                                    )}>
                                        {msg.content}
                                    </div>
                                    
                                    {/* Render Tool Calls */}
                                    {msg.toolCalls?.map((tool) => (
                                        <div key={tool.id} className="w-full bg-card border rounded-md p-3 text-xs font-mono mt-1">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                <Terminal className="h-3 w-3" />
                                                <span>Executing: {tool.name}</span>
                                            </div>
                                            <div className="bg-muted/30 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(tool.arguments, null, 2)}
                                            </div>
                                            {tool.status === 'success' && (
                                                <div className="mt-2 text-green-600 dark:text-green-400 flex items-center gap-1">
                                                    <FileCode className="h-3 w-3" />
                                                    <span>Completed</span>
                                                </div>
                                            )}
                                            {tool.status === 'error' && (
                                                <div className="mt-2 text-red-500">
                                                    Error: {tool.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Thinking...
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
                            <Select defaultValue="gemini-3-pro">
                                <SelectTrigger className="h-8 w-[160px] border-0 bg-background shadow-sm">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-3-pro">4x Gemini 3 Pro</SelectItem>
                                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                                    <SelectItem value="claude-3">Claude 3 Opus</SelectItem>
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
