import React from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface WelcomeMessageProps {
  onNewSession: () => void;
  hasProvider: boolean;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onNewSession, hasProvider }) => (
  <Card className="p-4 lg:p-6">
    <h2 className="text-lg lg:text-xl font-semibold text-foreground mb-3">Welcome to Agent Mode v1</h2>
    <p className="text-sm text-muted-foreground mb-4">
      Your AI coding assistant with powerful tool integration. The agent can:
    </p>
    <ul className="text-sm text-muted-foreground space-y-2 list-none">
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Read, write, edit, and search files in your workspace</span>
      </li>
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Perform Git operations (status, diff, commit, branch management)</span>
      </li>
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Navigate code structure and find symbol references</span>
      </li>
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Execute terminal commands with security controls</span>
      </li>
    </ul>

    {hasProvider ? (
      <Button className="mt-6" onClick={onNewSession}>
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Session
      </Button>
    ) : (
      <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-500">
          Please select a provider and model in the sidebar to get started.
        </p>
      </div>
    )}
  </Card>
);