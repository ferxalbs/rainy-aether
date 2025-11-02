import React from "react";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";

const AgentsView: React.FC = () => {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Agent Sessions</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Placeholder for agent sessions */}
          <Card className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate">New Agent Session</h3>
                <p className="text-xs text-muted-foreground mt-1">Click to start</p>
              </div>
            </div>
          </Card>

          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No active sessions</p>
            <p className="text-xs mt-1">Start a new agent session below</p>
          </div>
        </div>

        <Separator />

        <div className="p-3">
          <Button
            variant="outline"
            className="w-full"
            size="sm"
          >
            New Session
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center px-4 bg-muted/20">
          <h1 className="text-sm font-medium text-foreground">Agent Workspace</h1>
        </div>

        {/* Chat/Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Placeholder welcome message */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">Welcome to Agent Mode</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This is a placeholder for the advanced AI agent system. Future features will include:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Multi-agent orchestration with up to 8 parallel agents</li>
                <li>Autonomous development workflows</li>
                <li>Voice mode integration</li>
                <li>Advanced context management (200k tokens)</li>
                <li>Native browser tool with DevTools</li>
                <li>Model Context Protocol (MCP) integration</li>
              </ul>
            </Card>

            {/* Example agent message */}
            <Card className="p-4 bg-primary/5">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                  AI
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Agent capabilities will be integrated here. This space will allow you to interact with autonomous agents
                    that can help with complex development tasks, code generation, debugging, and more.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-muted/20 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-3">
              <Textarea
                placeholder="Type your message to the agent... (coming soon)"
                className={cn(
                  "min-h-24 resize-none border-0 focus-visible:ring-0 bg-transparent",
                  "placeholder:text-muted-foreground/60"
                )}
                disabled
              />
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Agent mode is currently in development
                </div>
                <Button size="sm" disabled>
                  Send
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsView;
