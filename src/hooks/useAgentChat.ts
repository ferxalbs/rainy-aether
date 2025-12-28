import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AgentService } from '@/services/agent/AgentService';
import { ChatMessage } from '@/types/chat';
import {
  useActiveSession,
  useAgentLoading,
  agentActions,
} from '@/stores/agentStore';
import { StreamChunk, getModelConfig } from '@/services/agent/providers';
import { getContextStatus, ContextStatus } from '@/services/agent/TokenCounter';

export function useAgentChat() {
  const activeSession = useActiveSession();
  const isStoreLoading = useAgentLoading();

  // Use local state for input - isolated from store updates
  const [input, setInputState] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThoughts, setStreamingThoughts] = useState('');

  // Use a ref to persist the service instance across renders
  const agentServiceRef = useRef<AgentService | null>(null);

  // Cache values for stable dependencies
  const sessionId = activeSession?.id;
  const sessionModel = activeSession?.model;
  const sessionSystemPrompt = activeSession?.systemPrompt;

  // Initialize or update service when active session changes
  useEffect(() => {
    if (sessionId && sessionModel && sessionSystemPrompt) {
      agentServiceRef.current = new AgentService({
        sessionId,
        model: sessionModel,
        systemPrompt: sessionSystemPrompt,
      });
    } else {
      agentServiceRef.current = null;
    }
  }, [sessionId, sessionModel, sessionSystemPrompt]);

  // Memoize setInput to prevent unnecessary re-renders
  const setInput = useCallback((value: string) => {
    setInputState(value);
  }, []);

  // Cache messages to avoid re-creating array on every render
  const messages = useMemo(() => {
    return activeSession?.messages || [];
  }, [activeSession?.messages]);

  // Calculate context status for token usage display
  const contextStatus: ContextStatus | null = useMemo(() => {
    if (!sessionModel || messages.length === 0) return null;

    const modelConfig = getModelConfig(sessionModel);
    if (!modelConfig) return null;

    return getContextStatus(messages, {
      contextWindow: modelConfig.contextWindow,
      maxOutputTokens: modelConfig.maxOutputTokens,
    });
  }, [sessionModel, messages]);

  // sendMessage now accepts optional message and images for multimodal
  const sendMessage = useCallback(async (directMessage?: string, images?: import('@/types/chat').ImageAttachment[]) => {
    const messageToSend = directMessage || input;
    if (!messageToSend.trim() || !activeSession || !agentServiceRef.current) return;

    const userMessageContent = messageToSend.trim();
    setInputState(''); // Clear input immediately
    agentActions.setLoading(true);

    try {
      // Add user message to store (with optional images)
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessageContent,
        timestamp: new Date(),
        images: images && images.length > 0 ? images : undefined,
      };
      agentActions.addMessage(activeSession.id, userMessage);

      // Track streaming text, thoughts, and added messages
      let fullStreamedText = '';
      let fullStreamedThoughts = '';
      const addedMessageIds = new Set<string>();

      // Handle streaming chunks
      const handleChunk = (chunk: StreamChunk) => {
        if (chunk.type === 'thought' && chunk.content) {
          // Capture thinking content
          fullStreamedThoughts += chunk.content;
          setStreamingThoughts(fullStreamedThoughts);
        } else if (chunk.type === 'text' && chunk.content) {
          fullStreamedText += chunk.content;
          setStreamingContent(fullStreamedText);
        } else if (chunk.type === 'tool_update' && chunk.fullMessage) {
          // Update the message in the store to reflect tool status changes
          if (!addedMessageIds.has(chunk.fullMessage.id)) {
            agentActions.addMessage(activeSession.id, chunk.fullMessage);
            addedMessageIds.add(chunk.fullMessage.id);
            setStreamingContent(''); // Clear streaming text as it's now in the message
            setStreamingThoughts(''); // Clear thoughts too
            fullStreamedText = '';
            fullStreamedThoughts = '';
          } else {
            // Update existing message
            agentActions.updateMessage(activeSession.id, chunk.fullMessage.id, chunk.fullMessage);
          }
        } else if (chunk.type === 'done' && chunk.fullMessage) {
          // Clear streaming state
          setStreamingContent('');
          setStreamingThoughts('');
          fullStreamedText = ''; // Reset text buffer for next message (if any)
          fullStreamedThoughts = '';

          if (!addedMessageIds.has(chunk.fullMessage.id)) {
            agentActions.addMessage(activeSession.id, chunk.fullMessage);
            addedMessageIds.add(chunk.fullMessage.id);
          } else {
            // If we already added the message (e.g. due to tool calls), update it with final content
            agentActions.updateMessage(activeSession.id, chunk.fullMessage.id, chunk.fullMessage);
          }
        }
      };

      // Send message with streaming
      const response = await agentServiceRef.current.sendMessage(
        activeSession.messages.concat(userMessage),
        handleChunk
      );

      // If response wasn't added via streaming (e.g. fallback or error), add it now
      if (!addedMessageIds.has(response.id)) {
        agentActions.addMessage(activeSession.id, response);
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)
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
    messages,
    input,
    setInput,
    isLoading: isStoreLoading,
    streamingContent,
    streamingThoughts,
    sendMessage,
    clearChat,
    contextStatus, // Token context usage status
  };
}