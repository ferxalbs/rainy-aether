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
import {
  Plus,
  Send,
  Settings,
  Trash2,
  Bot,
  User as UserIcon,
  Wrench,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '@/lib/utils';
import { useAgentState, agentActions } from '@/stores/agentStore';
import type { Message } from '@/stores/agentStore';
import { getAgentService } from '@/services/agent/agentService';
import { ProviderManager } from '@/services/agent/providerManager';
import { AgentToolsPanel } from './agent-tools/AgentToolsPanel';
import { useIDEState } from '@/stores/ideStore';
import ReactMarkdown from 'react-markdown';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const agentService = getAgentService();
  const providerManager = ProviderManager.getInstance();

  const activeSession = agentState.activeSessionId
    ? agentState.sessions.get(agentState.activeSessionId)
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
      {/* Sidebar - Session List */}
      <div className="w-64 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Agent Sessions</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {agentState.sessions.size} active
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agentState.sessions.size === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No active sessions</p>
              <p className="text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            Array.from(agentState.sessions.values()).map((session) => (
              <Card
                key={session.id}
                className={cn(
                  'p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  agentState.activeSessionId === session.id && 'bg-accent border-primary'
                )}
                onClick={() => agentActions.setActiveSession(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {session.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {session.messages.length} messages
                      </Badge>
                      {session.isStreaming && (
                        <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-500">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          streaming
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <Separator />

        {/* Provider & Model Selection */}
        <div className="p-3 space-y-2 border-t border-border">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="groq">Groq (Fast & Free)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider === 'groq' && (
                  <>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B</SelectItem>
                  </>
                )}
                {selectedProvider === 'openai' && (
                  <>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </>
                )}
                {selectedProvider === 'anthropic' && (
                  <>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="default"
            className="w-full"
            size="sm"
            onClick={handleNewSession}
            disabled={!selectedModel}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-foreground">
              {activeSession ? activeSession.name : 'Agent Workspace'}
            </h1>
            {activeSession && (
              <Badge variant="secondary" className="text-xs">
                {activeSession.providerId} · {activeSession.modelId}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToolsPanel(!showToolsPanel)}
              className={cn(showToolsPanel && 'bg-accent')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Tools
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages + Tools Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {!activeSession ? (
                <WelcomeMessage
                  onNewSession={handleNewSession}
                  hasProvider={!!selectedModel}
                />
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

          {/* Agent Tools Panel (Right Side) */}
          {showToolsPanel && (
            <div className="w-96 border-l border-border overflow-hidden">
              <AgentToolsPanel defaultTab="executions" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-muted/20 p-4">
          <div className="max-w-4xl mx-auto">
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
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
                  onClick={handleSendMessage}
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
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface WelcomeMessageProps {
  onNewSession: () => void;
  hasProvider: boolean;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onNewSession, hasProvider }) => (
  <Card className="p-6">
    <h2 className="text-xl font-semibold text-foreground mb-3">Welcome to Agent Mode v1</h2>
    <p className="text-sm text-muted-foreground mb-4">
      Your AI coding assistant with powerful tool integration. The agent can:
    </p>
    <ul className="text-sm text-muted-foreground space-y-2 list-none">
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Read, write, edit, and search files in your workspace</span>
      </li>
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Perform Git operations (status, diff, commit, branch management)</span>
      </li>
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Navigate code structure and find symbol references</span>
      </li>
      <li className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Execute terminal commands with security controls</span>
      </li>
    </ul>

    {hasProvider ? (
      <Button className="mt-6" onClick={onNewSession}>
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Session
      </Button>
    ) : (
      <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-500">
          Please select a provider and model in the sidebar to get started.
        </p>
      </div>
    )}
  </Card>
);

const EmptySessionMessage: React.FC = () => (
  <Card className="p-6 bg-muted/30">
    <div className="text-center">
      <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Ready to assist</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Ask me anything about your code, or request file operations, Git commands, and more.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <ExamplePrompt text="Read the main.ts file" />
        <ExamplePrompt text="Show me the Git status" />
        <ExamplePrompt text="Search for all TODO comments" />
        <ExamplePrompt text="Create a new component" />
      </div>
    </div>
  </Card>
);

const ExamplePrompt: React.FC<{ text: string }> = ({ text }) => (
  <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
    {text}
  </Badge>
);

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
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
    <Card className={cn('p-4', isUser ? 'bg-primary/5' : 'bg-muted/30')}>
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
          <div className="flex items-center gap-2 mb-1">
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

export default AgentsView;
