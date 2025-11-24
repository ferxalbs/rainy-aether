import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentService } from '@/services/agent/AgentService';
import { ChatMessage } from '@/types/chat';
import {
  useActiveSession,
  useAgentLoading,
  agentActions,
} from '@/stores/agentStore';
import { StreamChunk } from '@/services/agent/providers';

export function useAgentChat() {
  const activeSession = useActiveSession();
  const isStoreLoading = useAgentLoading();
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');

  // Use a ref to persist the service instance across renders
  const agentServiceRef = useRef<AgentService | null>(null);

  // Initialize or update service when active session changes
  useEffect(() => {
    if (activeSession) {
      agentServiceRef.current = new AgentService({
        sessionId: activeSession.id,
        model: activeSession.model,
        systemPrompt: activeSession.systemPrompt,
      });
    } else {
      agentServiceRef.current = null;
    }
  }, [activeSession?.id, activeSession?.model, activeSession?.systemPrompt]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeSession || !agentServiceRef.current) return;

    const userMessageContent = input;
    setInput(''); // Clear input immediately
    agentActions.setLoading(true);

    try {
      // Add user message to store
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessageContent,
        timestamp: new Date(),
      };
      agentActions.addMessage(activeSession.id, userMessage);

      // Track streaming text
      let fullStreamedText = '';
      let hasAddedStreamedMessage = false;

      // Handle streaming chunks
      const handleChunk = (chunk: StreamChunk) => {
        if (chunk.type === 'text' && chunk.content) {
          fullStreamedText += chunk.content;
          setStreamingContent(fullStreamedText);
        } else if (chunk.type === 'tool_update' && chunk.fullMessage) {
          // Update the message in the store to reflect tool status changes
          // We need to find the message ID first. Since we don't have it easily,
          // we might need to rely on the fact that it's the last message or
          // use a temporary ID strategy.
          // For now, let's assume the store handles updates if we pass the full message
          // But wait, addMessage appends. We need updateMessage.
          
          // If the message hasn't been added yet (it's the first tool call), add it.
          if (!hasAddedStreamedMessage) {
             agentActions.addMessage(activeSession.id, chunk.fullMessage);
             hasAddedStreamedMessage = true;
             setStreamingContent(''); // Clear streaming text as it's now in the message
          } else {
             // Update existing message
             agentActions.updateMessage(activeSession.id, chunk.fullMessage.id, chunk.fullMessage);
          }
        } else if (chunk.type === 'done' && chunk.fullMessage) {
          // Clear streaming state
          setStreamingContent('');
          
          if (!hasAddedStreamedMessage) {
            agentActions.addMessage(activeSession.id, chunk.fullMessage);
            hasAddedStreamedMessage = true;
          } else {
             // If we already added the message (e.g. due to tool calls), update it with final content
             agentActions.updateMessage(activeSession.id, chunk.fullMessage.id, chunk.fullMessage);
          }
        }
      };

      // Send message with streaming
      await agentServiceRef.current.sendMessage(
        activeSession.messages.concat(userMessage),
        handleChunk
      );
    } catch (error) {
      console.error('Failed to send message:', error);

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date(),
      };
      agentActions.addMessage(activeSession.id, errorMessage);
    } finally {
      agentActions.setLoading(false);
      setStreamingContent('');
    }
  }, [input, activeSession]);

  const clearChat = useCallback(() => {
    if (activeSession) {
      agentActions.clearSession(activeSession.id);
    }
  }, [activeSession]);

  return {
    messages: activeSession?.messages || [],
    input,
    setInput,
    isLoading: isStoreLoading,
    streamingContent,
    sendMessage,
    clearChat,
  };
}