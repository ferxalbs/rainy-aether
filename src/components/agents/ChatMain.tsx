import { useState } from 'react';
import { ChatWelcomeScreen } from './ChatWelcomeScreen';
import { ChatConversationView } from './ChatConversationView';
import { useAgents, useAgentSession } from '@/hooks/useAgents';
import { ToolExecutionView } from './ToolExecutionView';
import type { ToolCall } from '@/types/rustAgent';
import { roleToSender } from '@/types/chat';

/**
 * Local Message interface for UI display
 * Uses 'sender' field for backward compatibility with existing components
 * Maps from ChatMessage.role to this format
 */
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  toolCalls?: ToolCall[];
}

/**
 * Root chat component that manages conversation state and renders either the welcome screen or the conversation view.
 *
 * Manages the current input, selected UI mode and AI model, and the list of messages; exposes handlers to start a conversation,
 * reset it, and append new user messages.
 *
 * Now integrated with the Rainy Agents multi-agent system.
 *
 * @returns The chat UI: a ChatWelcomeScreen when no conversation has started, or a ChatConversationView when a conversation is active.
 */
export function ChatMain() {
  const { selectedAgentId, selectedAgent } = useAgents();
  const {
    messages: agentMessages,
    isLoading,
    sendMessage: sendToAgent,
  } = useAgentSession(selectedAgentId);

  const [message, setMessage] = useState('');
  const [selectedMode, setSelectedMode] = useState('smart');
  const [selectedModel, setSelectedModel] = useState(selectedAgentId);
  const [isConversationStarted, setIsConversationStarted] = useState(false);

  // Convert agent messages (with 'role' field) to UI messages (with 'sender' field)
  // Uses roleToSender helper for standardized conversion
  const messages: Message[] = agentMessages.map((msg, index) => ({
    id: `msg-${index}`,
    content: msg.content,
    sender: roleToSender(msg.role),
    timestamp: new Date(),
    toolCalls: msg.toolCalls,
  }));

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsConversationStarted(true);

    // Send message through agent system
    await sendToAgent(message, {
      fastMode: selectedMode === 'fast',
    });

    setMessage('');
  };

  const handleReset = () => {
    setIsConversationStarted(false);
    setMessage('');
    window.location.reload(); // Simple reset - reloads the page to clear session
  };

  const handleSendMessage = async (content: string) => {
    if (isLoading) return;

    await sendToAgent(content, {
      fastMode: selectedMode === 'fast',
    });

    setMessage('');
  };

  if (isConversationStarted) {
    return (
      <div className="flex flex-col h-full">
        <ChatConversationView
          messages={messages}
          message={message}
          onMessageChange={setMessage}
          onSend={handleSendMessage}
          onReset={handleReset}
        />

        {/* Show tool executions for last assistant message */}
        {messages.length > 0 &&
          messages[messages.length - 1].sender === 'ai' &&
          messages[messages.length - 1].toolCalls &&
          messages[messages.length - 1].toolCalls!.length > 0 && (
            <div className="border-t border-border bg-muted/30 max-h-48 overflow-y-auto">
              <ToolExecutionView
                toolCalls={messages[messages.length - 1].toolCalls}
                compact
              />
            </div>
          )}
      </div>
    );
  }

  return (
    <ChatWelcomeScreen
      message={message}
      onMessageChange={setMessage}
      onSend={handleSend}
      selectedMode={selectedMode}
      onModeChange={setSelectedMode}
      selectedModel={selectedAgent?.name || selectedAgentId}
      onModelChange={setSelectedModel}
    />
  );
}
