import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export function HomeView() {
  return (
    <div className="p-8 space-y-6">
      <div className="text-center">
        <Bot className="mx-auto size-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Agent Home (Mockup)</h1>
        <p className="text-muted-foreground mt-2">
          This is a mockup of the agent interface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Chat with Agent</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start a conversation with an AI assistant (Mockup)
          </p>
          <Button disabled className="w-full opacity-50">
            Start Chat (Mockup)
          </Button>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Code Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Analyze and improve your code (Mockup)
          </p>
          <Button disabled variant="outline" className="w-full opacity-50">
            Analyze Code (Mockup)
          </Button>
        </div>
      </div>
    </div>
  );
}
