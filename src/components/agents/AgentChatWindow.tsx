import { AtSign, Image as ImageIcon, Send, Bot } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function AgentChatWindow() {
    return (
        <div className="flex flex-col h-full w-full bg-background relative">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">How can I help you today?</h3>
                    <p className="text-sm">Start a conversation to create a new agent or manage existing ones.</p>
                </div>
            </div>

            <div className="p-4 pb-6">
                <div className="mx-auto max-w-3xl relative rounded-xl border bg-card shadow-lg ring-1 ring-black/5">
                    <Textarea
                        placeholder="Plan, @ for context, / for commands..."
                        className="min-h-[100px] w-full resize-none border-0 bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
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
                            <Button size="icon" className="h-8 w-8 ml-2">
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
