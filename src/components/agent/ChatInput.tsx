import React, { useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import type { AgentSession } from '@/stores/agentStore';

interface ChatInputProps {
  input: string;
  isSending: boolean;
  activeSession: AgentSession | null;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isSending,
  activeSession,
  onInputChange,
  onSendMessage,
  onKeyDown,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="border-t border-border bg-muted/20 p-3 lg:p-4">
      <div className="max-w-3xl xl:max-w-4xl mx-auto">
        <Card className="p-3">
          <Textarea
            ref={textareaRef}
            placeholder={
              activeSession
                ? 'Ask the agent to help with your code... (tools available)'
                : 'Create a session to start chatting...'
            }
            className={cn(
              'min-h-24 resize-none border-0 focus-visible:ring-0 bg-transparent',
              'placeholder:text-muted-foreground/60'
            )}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!activeSession || isSending}
          />
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {activeSession ? (
                <span>
                  Press <kbd className="px-1 bg-muted rounded">Enter</kbd> to send,{' '}
                  <kbd className="px-1 bg-muted rounded">Shift+Enter</kbd> for new line
                </span>
              ) : (
                'Create a session to enable chat'
              )}
            </div>
            <Button
              size="sm"
              onClick={onSendMessage}
              disabled={!activeSession || !input.trim() || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};