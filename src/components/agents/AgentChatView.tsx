import { Button } from '@/components/ui/button';
import { MessageCircle, Send } from 'lucide-react';

export function AgentChatView() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <MessageCircle className="size-5" />
          <h1 className="font-semibold">Agent Chat (Mockup)</h1>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="mx-auto size-12 mb-4 opacity-50" />
          <p>Chat interface mockup - Agent functionality removed</p>
        </div>

        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm">Welcome to the agent chat interface! (Mockup)</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded-md opacity-50"
            placeholder="Type your message... (Mockup)"
            disabled
          />
          <Button disabled className="opacity-50">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
