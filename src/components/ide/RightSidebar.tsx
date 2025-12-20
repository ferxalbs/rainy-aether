import { AgentChatWindow } from "@/components/agents/AgentChatWindow";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
    className?: string;
}

export function RightSidebar({ className }: RightSidebarProps) {
    return (
        <div className={cn("h-full w-full flex flex-col bg-background border-l border-border", className)}>
            <div className="flex-1 overflow-hidden">
                <AgentChatWindow compact={true} />
            </div>
        </div>
    );
}
