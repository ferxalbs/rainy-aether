import React, { useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

import type { AgentSession } from '@/stores/agentStore';

interface ChatInputProps {
  input: string;
  isSending: boolean;
  activeSession: AgentSession | null;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  variant?: 'default' | 'floating';
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isSending,
  activeSession,
  onInputChange,
  onSendMessage,
  onKeyDown,
  variant = 'default',
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFloating = variant === 'floating';

  return (
    <div
      className={cn(
        isFloating
          ? 'pointer-events-auto w-full max-w-3xl sm:max-w-4xl transition-all'
          : 'border-t border-border bg-muted/15 px-3 py-3 sm:px-4 sm:py-4'
      ,
        className
      )}
    >
      <div
        className={cn(
          'mx-auto',
          isFloating ? 'w-full' : 'max-w-3xl xl:max-w-4xl'
        )}
      >
        <div
          className={cn(
            'overflow-hidden border bg-background transition-all',
            isFloating
              ? 'rounded-2xl border-border/50 shadow-xl shadow-black/15 backdrop-blur'
              : 'rounded-xl border-border/60 shadow-sm'
          )}
        >
          <Textarea
            ref={textareaRef}
            placeholder={
              activeSession
                ? 'Ask the agent to help with your code... (tools available)'
                : 'Create a session to start chatting...'
            }
            className={cn(
              'min-h-28 resize-none border-0 bg-transparent px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-0 sm:px-5 sm:py-4',
              'placeholder:text-muted-foreground/60'
            )}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!activeSession || isSending}
          />
          <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="text-xs text-muted-foreground">
              {activeSession ? (
                <span>
                  Press <kbd className="rounded bg-muted px-1">Enter</kbd> to send,{' '}
                  <kbd className="rounded bg-muted px-1">Shift+Enter</kbd> for new line
                </span>
              ) : (
                'Create a session to enable chat'
              )}
            </div>
            <Button
              size="sm"
              className={cn(
                isFloating && 'rounded-full px-5'
              )}
              onClick={onSendMessage}
              disabled={!activeSession || !input.trim() || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};