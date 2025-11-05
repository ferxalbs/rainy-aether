import React from 'react';
import { Bot } from 'lucide-react';
import { Card } from '../ui/card';
import { ExamplePrompt } from './ExamplePrompt';

export const EmptySessionMessage: React.FC = () => (
  <Card className="p-4 lg:p-6 bg-muted/30">
    <div className="text-center">
      <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Ready to assist</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Ask me anything about your code, or request file operations, Git commands, and more.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <ExamplePrompt text="Read the main.ts file" />
        <ExamplePrompt text="Show me the Git status" />
        <ExamplePrompt text="Search for all TODO comments" />
        <ExamplePrompt text="Create a new component" />
      </div>
    </div>
  </Card>
);