/**
 * Agents View - Version 1
 *
 * Fully functional AI agent interface with tool integration.
 * Features:
 * - Session management
 * - Real-time chat with streaming
 * - Tool execution visibility
 * - Agent Tools Panel integration
 * - Provider/model selection
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAgentState, agentActions } from '@/stores/agentStore';
import { getAgentService } from '@/services/agent/agentService';
import { ProviderManager } from '@/services/agent/providerManager';
import { AgentToolsPanel } from './agent-tools/AgentToolsPanel';
import { useIDEState } from '@/stores/ideStore';
import {
  SessionSidebar,
  ChatHeader,
  ChatMessages,
  ChatInput,
} from '../agent';

const AgentsView: React.FC = () => {
  const agentState = useAgentState();
  const ideState = useIDEState();
  const workspace = ideState.workspace;
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agentService = getAgentService();
  const providerManager = ProviderManager.getInstance();

  const activeSession = agentState.activeSessionId
    ? agentState.sessions.get(agentState.activeSessionId) || null
    : null;

  // Initialize agent service
  useEffect(() => {
    agentService.initialize();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Load available models for selected provider
  useEffect(() => {
    const loadModels = async () => {
      const provider = providerManager.getProvider(selectedProvider);
      if (provider) {
        const models = await provider.listModels();
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].id);
        }
      }
    };
    loadModels();
  }, [selectedProvider]);

  const handleNewSession = async () => {
    try {
      const sessionId = await agentService.createSession({
        name: `Session ${agentState.sessions.size + 1}`,
        providerId: selectedProvider,
        modelId: selectedModel,
        systemPrompt: 'You are a helpful AI coding assistant with access to powerful development tools. Use the available tools to help users with file operations, Git workflows, code navigation, and terminal commands.',
      });
      agentActions.setActiveSession(sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
      agentActions.setError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !activeSession || isSending) return;

    const messageContent = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await agentService.sendMessage({
        sessionId: activeSession.id,
        content: messageContent,
        workspaceRoot: workspace?.path,
        onToken: () => {
          // Token streaming is handled internally by agentActions
        },
        onComplete: () => {
          setIsSending(false);
        },
        onError: (error) => {
          console.error('Message send error:', error);
          setIsSending(false);
        },
        onToolCall: (toolName, result) => {
          console.log(`Tool executed: ${toolName}`, result);
        },
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      await agentActions.deleteSession(sessionId);
      if (agentState.activeSessionId === sessionId) {
        const sessions = Array.from(agentState.sessions.keys());
        if (sessions.length > 0) {
          agentActions.setActiveSession(sessions[0]);
        }
      }
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Responsive sidebar - hidden on small screens, fixed width on larger */}
      <div className="hidden lg:flex">
        <SessionSidebar
          sessions={agentState.sessions}
          activeSessionId={agentState.activeSessionId}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={setSelectedProvider}
          onModelChange={setSelectedModel}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ChatHeader
          activeSession={activeSession}
          showToolsPanel={showToolsPanel}
          onToggleToolsPanel={() => setShowToolsPanel(!showToolsPanel)}
        />

        <div className="flex-1 flex overflow-hidden">
          <ChatMessages
            activeSession={activeSession}
            onNewSession={handleNewSession}
            hasProvider={!!selectedModel}
          />

          {/* Responsive tools panel - collapsible on smaller screens */}
          {showToolsPanel && (
            <div className="w-80 xl:w-96 border-l border-border overflow-hidden">
              <AgentToolsPanel defaultTab="executions" />
            </div>
          )}
        </div>

        <ChatInput
          input={input}
          isSending={isSending}
          activeSession={activeSession}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};


export default AgentsView;
