import {
  SparklesIcon,
  ZapIcon,
  CodeIcon,
  FileCodeIcon,
  MessageCircleIcon,
  TrendingUpIcon,
  ClockIcon,
  StarIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentNavigationActions } from '@/stores/agentNavigationStore';
import { useChatActions } from '@/stores/chatStore';

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

/**
 * QuickAction component for the home view
 */
function QuickAction({ icon: Icon, title, description, onClick }: QuickActionProps) {
  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="size-5 text-primary" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

interface RecentActivityItem {
  id: string;
  title: string;
  type: 'chat' | 'code' | 'analysis';
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Home view component - dashboard with quick actions and recent activity
 *
 * Displays a welcome message, quick action cards for common tasks, and recent activity.
 * Provides easy navigation to Ask AI and Prompts views.
 *
 * @returns The home dashboard view
 */
export function HomeView() {
  const { setView } = useAgentNavigationActions();
  const { createNewChat } = useChatActions();

  const handleNewChat = () => {
    createNewChat();
    setView('ask-ai');
  };

  const recentActivity: RecentActivityItem[] = [
    {
      id: '1',
      title: 'Code review for authentication module',
      type: 'chat',
      timestamp: '2 hours ago',
      icon: MessageCircleIcon,
    },
    {
      id: '2',
      title: 'Generated React component boilerplate',
      type: 'code',
      timestamp: '5 hours ago',
      icon: CodeIcon,
    },
    {
      id: '3',
      title: 'Analyzed performance bottlenecks',
      type: 'analysis',
      timestamp: '1 day ago',
      icon: TrendingUpIcon,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
      <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Welcome Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome to Rainy AI</h1>
              <p className="text-muted-foreground">Your intelligent coding assistant</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction
              icon={MessageCircleIcon}
              title="Start New Chat"
              description="Begin a conversation with AI assistant"
              onClick={handleNewChat}
            />
            <QuickAction
              icon={FileCodeIcon}
              title="Browse Prompts"
              description="Explore pre-configured AI prompts"
              onClick={() => setView('prompts')}
            />
            <QuickAction
              icon={ZapIcon}
              title="Quick Generate"
              description="Generate code snippets instantly"
              onClick={handleNewChat}
            />
            <QuickAction
              icon={CodeIcon}
              title="Code Review"
              description="Get AI-powered code review"
              onClick={handleNewChat}
            />
            <QuickAction
              icon={TrendingUpIcon}
              title="Optimize Code"
              description="Improve performance and quality"
              onClick={handleNewChat}
            />
            <QuickAction
              icon={StarIcon}
              title="Ask Anything"
              description="Get help with any coding question"
              onClick={handleNewChat}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentActivity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ClockIcon className="size-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {item.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              Pro Tip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the Prompts library to save your frequently used AI configurations and contexts.
              This helps the AI understand your preferences and provide more targeted assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
