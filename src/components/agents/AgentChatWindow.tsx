
import { AtSign, Image as ImageIcon, Mic, Send } from "lucide-react"

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
        <div className="flex flex-col h-full w-full bg-background">
            <div className="flex-1 overflow-y-auto p-4">
                {/* Chat history will go here */}
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Start a conversation with an agent...
                </div>
            </div>

            <div className="p-4 border-t">
                <div className="relative rounded-xl border bg-card shadow-sm">
                    <Textarea
                        placeholder="Plan, @ for context, / for commands"
                        className="min-h-[120px] w-full resize-none border-0 bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />

                    <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                            <Select defaultValue="gemini-3-pro">
                                <SelectTrigger className="h-8 w-[180px] bg-muted/50">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-3-pro">4x Gemini 3 Pro</SelectItem>
                                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                                    <SelectItem value="claude-3">Claude 3 Opus</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select defaultValue="main">
                                <SelectTrigger className="h-8 w-[140px] bg-muted/50">
                                    <SelectValue placeholder="Worktree" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="main">Worktree</SelectItem>
                                    <SelectItem value="dev">Development</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <AtSign className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Mic className="h-4 w-4" />
                            </Button>
                            <Button size="icon" className="h-8 w-8">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
