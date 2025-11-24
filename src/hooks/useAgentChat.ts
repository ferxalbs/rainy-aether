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

      // Handle streaming chunks
      const handleChunk = (chunk: StreamChunk) => {
        if (chunk.type === 'text' && chunk.content) {
          fullStreamedText += chunk.content;
          setStreamingContent(fullStreamedText);
        } else if (chunk.type === 'done' && chunk.fullMessage) {
          // Clear streaming state
          setStreamingContent('');
          // Add final message to store
          agentActions.addMessage(activeSession.id, chunk.fullMessage);
        }
      };

      // Send message with streaming
      const response = await agentServiceRef.current.sendMessage(
        activeSession.messages.concat(userMessage),
        handleChunk
      );

      // If not streaming or streaming failed, add response directly
      if (!streamingContent) {
        agentActions.addMessage(activeSession.id, response);
      }
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