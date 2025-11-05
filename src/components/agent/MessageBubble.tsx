import React from 'react';
import { Bot, User as UserIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import type { Message } from '@/stores/agentStore';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs">
          {message.content}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn('p-3 lg:p-4', isUser ? 'bg-primary/5' : 'bg-muted/30')}>
      <div className="flex gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground text-background'
          )}
        >
          {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {isUser ? 'You' : 'Assistant'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {message.tokens && (
              <Badge variant="secondary" className="text-xs">
                {message.tokens} tokens
              </Badge>
            )}
            {message.cost && (
              <Badge variant="secondary" className="text-xs">
                ${message.cost.toFixed(6)}
              </Badge>
            )}
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </Card>
  );
};