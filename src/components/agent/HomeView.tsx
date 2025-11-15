/**
 * Agent Home View
 *
 * Landing page for the agent interface with quick actions and overview
 */

import { MessageSquare, Sparkles, BookOpen, Zap, Code, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HomeViewProps {
  onNavigate: (view: 'ask-ai' | 'prompts') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const quickActions = [
    {
      icon: MessageSquare,
      title: 'Ask AI',
      description: 'Chat with AI agent to get help with coding tasks',
      action: () => onNavigate('ask-ai'),
      color: 'text-blue-500'
    },
    {
      icon: Sparkles,
      title: 'Prompt Gallery',
      description: 'Browse and use pre-configured prompts',
      action: () => onNavigate('prompts'),
      color: 'text-purple-500'
    }
  ];

  const features = [
    {
      icon: Code,
      title: 'Code Review',
      description: 'Get AI-powered code reviews and suggestions'
    },
    {
      icon: Zap,
      title: 'Quick Fixes',
      description: 'Debug and fix issues with intelligent assistance'
    },
    {
      icon: FileText,
      title: 'Documentation',
      description: 'Generate comprehensive documentation automatically'
    },
    {
      icon: BookOpen,
      title: 'Learn & Explain',
      description: 'Understand complex code with detailed explanations'
    }
  ];

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-foreground">AI Agent</h1>
        <p className="text-muted-foreground">
          Your intelligent coding assistant for development, debugging, and documentation
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={action.action}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg bg-background p-2 ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Get Started →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">What You Can Do</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <Icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Tips for working with the AI agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            <p>
              <strong className="text-foreground">Be Specific:</strong> Provide clear context
              and details about what you need help with
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            <p>
              <strong className="text-foreground">Use Prompts:</strong> Browse the prompt
              gallery for common tasks and workflows
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            <p>
              <strong className="text-foreground">Iterate:</strong> Refine your questions
              based on the responses you receive
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            <p>
              <strong className="text-foreground">Share Code:</strong> Include relevant code
              snippets for better assistance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
