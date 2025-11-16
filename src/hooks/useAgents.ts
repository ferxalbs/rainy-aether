/**
 * React hooks for Rainy Agents multi-agent system
 *
 * Provides easy-to-use hooks for interacting with the agent system from React components.
 *
 * @example
 * ```tsx
 * import { useAgents, useAgentSession } from '@/hooks/useAgents';
 *
 * function MyComponent() {
 *   const { agents, selectedAgent, selectAgent } = useAgents();
 *   const { sendMessage, messages, isLoading } = useAgentSession();
 *
 *   return (
 *     <div>
 *       {agents.map(agent => (
 *         <button onClick={() => selectAgent(agent.id)}>{agent.name}</button>
 *       ))}
 *       <button onClick={() => sendMessage('Hello!')}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { agentRegistry } from '@/services/agents/core/AgentRegistry';
import { sessionBridge } from '@/services/agentIntegration/sessionBridge';
import type { AgentCore } from '@/services/agents/core/AgentCore';
import type { AbbySuggestion } from '@/services/agents/abby/AbbyAgent';
import type { AbbyAgent } from '@/services/agents/abby/AbbyAgent';
import type { AgentResult, ToolCall } from '@/types/rustAgent';

/**
 * Use agents hook
 *
 * Provides access to all available agents and selection state.
 *
 * @returns Agent state and actions
 */
export function useAgents() {
  const [agents, setAgents] = useState<AgentCore[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('rainy');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize agent registry
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!agentRegistry.isInitialized()) {
          await agentRegistry.initialize();
        }
        const allAgents = agentRegistry.getAll();
        setAgents(allAgents);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize agents:', error);
      }
    };

    initialize();
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
  }, []);

  const getSelectedAgent = useCallback(() => {
    return agentRegistry.get(selectedAgentId);
  }, [selectedAgentId]);

  return {
    agents,
    selectedAgentId,
    selectedAgent: getSelectedAgent(),
    selectAgent,
    isInitialized,
  };
}

/**
 * Use agent session hook
 *
 * Manages an agent session for sending messages and tracking conversation.
 *
 * @param agentId - ID of agent to use for this session
 * @returns Session state and actions
 */
export function useAgentSession(agentId: string = 'rainy') {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; toolCalls?: ToolCall[] }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        await sessionBridge.initialize();

        const newSessionId = await sessionBridge.createSession({
          name: `${agentId} Session`,
          agentId,
          providerId: agentId === 'claude-code' ? 'google' : 'groq',
          modelId: agentId === 'claude-code' ? 'gemini-2.0-flash-exp' : 'llama-3.3-70b-versatile',
        });

        setSessionId(newSessionId);
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      }
    };

    initSession();
  }, [agentId]);

  const sendMessage = useCallback(
    async (content: string, options?: { fastMode?: boolean }) => {
      if (!sessionId) {
        setError('Session not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Add user message immediately
      setMessages(prev => [...prev, { role: 'user', content }]);

      try {
        const result: AgentResult = await sessionBridge.sendMessage({
          sessionId,
          message: content,
          options,
        });

        // Add assistant response
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: result.content,
            toolCalls: result.toolCalls,
          },
        ]);

        return result;
      } catch (err) {
        console.error('Failed to send message:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
        // Remove the user message if sending failed
        setMessages(prev => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    sessionId,
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}

/**
 * Use Abby Mode hook
 *
 * Provides access to Abby Mode's proactive suggestions.
 *
 * @returns Abby Mode state and actions
 */
export function useAbbyMode() {
  const [suggestions, setSuggestions] = useState<AbbySuggestion[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [abbyAgent, setAbbyAgent] = useState<AbbyAgent | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!agentRegistry.isInitialized()) {
          await agentRegistry.initialize();
        }

        const abby = agentRegistry.get('abby') as AbbyAgent;
        if (abby) {
          setAbbyAgent(abby);
          setSuggestions(abby.getSuggestions());
        }
      } catch (error) {
        console.error('Failed to initialize Abby Mode:', error);
      }
    };

    initialize();
  }, []);

  // Poll for suggestions every 5 seconds when monitoring
  useEffect(() => {
    if (!isMonitoring || !abbyAgent) return;

    const interval = setInterval(() => {
      setSuggestions(abbyAgent.getSuggestions());
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring, abbyAgent]);

  const startMonitoring = useCallback(async () => {
    if (!abbyAgent) return;

    try {
      await abbyAgent.startMonitoring({
        checkInterval: 60000, // 1 minute
        minConfidence: 0.7,
      });
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  }, [abbyAgent]);

  const stopMonitoring = useCallback(async () => {
    if (!abbyAgent) return;

    try {
      await abbyAgent.stopMonitoring();
      setIsMonitoring(false);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  }, [abbyAgent]);

  const applySuggestion = useCallback(
    async (suggestionId: string) => {
      if (!abbyAgent) return;

      try {
        await abbyAgent.applySuggestion(suggestionId);
        setSuggestions(abbyAgent.getSuggestions());
      } catch (error) {
        console.error('Failed to apply suggestion:', error);
      }
    },
    [abbyAgent]
  );

  const rejectSuggestion = useCallback(
    (suggestionId: string, remember: boolean = false) => {
      if (!abbyAgent) return;

      try {
        abbyAgent.rejectSuggestion(suggestionId, remember);
        setSuggestions(abbyAgent.getSuggestions());
      } catch (error) {
        console.error('Failed to reject suggestion:', error);
      }
    },
    [abbyAgent]
  );

  return {
    suggestions,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    applySuggestion,
    rejectSuggestion,
  };
}
