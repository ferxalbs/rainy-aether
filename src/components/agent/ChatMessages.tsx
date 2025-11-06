import React, { useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { useAgentState } from '@/stores/agentStore';
import type { AgentSession } from '@/stores/agentStore';
import { WelcomeMessage } from './WelcomeMessage';
import { EmptySessionMessage } from './EmptySessionMessage';
import { MessageBubble } from './MessageBubble';
import { cn } from '@/lib/utils';

interface ChatMessagesProps {
  activeSession: AgentSession | null;
  onNewSession: () => void;
  hasProvider: boolean;
  containerClassName?: string;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  activeSession,
  onNewSession,
  hasProvider,
  containerClassName,
}) => {
  const agentState = useAgentState();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto px-4 pb-32 pt-6 sm:px-6 sm:pb-40 lg:px-8',
        containerClassName
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 xl:max-w-4xl">
        {!activeSession ? (
          <WelcomeMessage onNewSession={onNewSession} hasProvider={hasProvider} />
        ) : activeSession.messages.length === 0 ? (
          <EmptySessionMessage />
        ) : (
          activeSession.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {agentState.lastError && (
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500">Error</p>
                <p className="text-xs text-red-500/80 mt-1">{agentState.lastError}</p>
              </div>
            </div>
          </Card>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
