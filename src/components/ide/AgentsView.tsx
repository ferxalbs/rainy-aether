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

import React, { useState, useEffect } from 'react';
import { useAgentState, agentActions } from '@/stores/agentStore';
import { getAgentService } from '@/services/agent/agentService';
import { ProviderManager } from '@/services/agent/providerManager';
import { AgentToolsPanel } from './agent-tools/AgentToolsPanel';
import { cn } from '@/lib/utils';
import { useIDEState } from '@/stores/ideStore';
import {
  SessionSidebar,
  ChatHeader,
  ChatMessages,
  ChatInput,
} from '../agent';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

const AgentsView: React.FC = () => {
  const agentState = useAgentState();
  const ideState = useIDEState();
  const workspace = ideState.workspace;
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const agentService = getAgentService();
  const providerManager = ProviderManager.getInstance();

  const activeSession = agentState.activeSessionId
    ? agentState.sessions.get(agentState.activeSessionId) || null
    : null;

  // Initialize agent service with workspace root
  useEffect(() => {
    agentService.initialize(workspace?.path);
  }, [workspace?.path]);

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
      // Build context-aware system prompt
      let systemPrompt = `You are an expert AI coding assistant integrated into Rainy Aether IDE with full access to the codebase through powerful development tools.

## Your Capabilities
You have 18 production-ready tools at your disposal:

**File Operations** (7 tools):
- file_read: Read file contents with optional line ranges
- file_write: Create or overwrite files
- file_edit: Multi-operation editing (replace, insert, delete)
- file_delete: Safe file/directory deletion
- file_rename: Rename or move files
- file_copy: Copy files or directories
- file_search: Search by glob patterns and content

**Git Operations** (5 tools):
- git_status: Get current Git status
- git_diff: View file changes
- git_commit: Create commits (with auto-staging)
- git_branch: List, create, or delete branches
- git_checkout: Switch branches or restore files

**Workspace Navigation** (3 tools):
- workspace_structure: View directory tree
- workspace_search_symbol: Find functions, classes, interfaces
- workspace_find_references: Find symbol references

**Terminal** (3 tools):
- terminal_execute: Run shell commands (with security controls)
- terminal_list_sessions: List active terminals
- terminal_kill: Terminate terminal sessions

## Current Workspace`;

      if (workspace?.path) {
        systemPrompt += `\n**Active Project**: ${workspace.name || 'Unknown'}
**Path**: \`${workspace.path}\`
**Type**: ${workspace.type || 'Unknown'}`;
      } else {
        systemPrompt += '\n**No workspace loaded** - Ask the user to open a project first.';
      }

      systemPrompt += `

## Instructions
1. **ALWAYS use tools** when the user asks about files, code, or git operations
2. **Be autonomous**: Don't ask permission to use read-only tools (file_read, git_status, workspace_structure)
3. **Verify before writing**: Use file_read before file_write/file_edit to see current content
4. **Use relative paths**: All paths should be relative to the workspace root
5. **Provide context**: Explain what tools you're using and why
6. **Be accurate**: Never claim to have done something without actually using the tool
7. **Show results**: Always share tool outputs with the user

## Example Workflows
- "What files are in src?" → Use workspace_structure
- "Show me the main component" → Use file_search, then file_read
- "Add a new function" → Use file_read (to see context), then file_edit
- "What's the git status?" → Use git_status
- "Find all uses of handleClick" → Use workspace_find_references

Remember: You are working with a REAL codebase. Use tools to interact with it!`;

      const sessionId = await agentService.createSession({
        name: `Session ${agentState.sessions.size + 1}`,
        providerId: selectedProvider,
        modelId: selectedModel,
        systemPrompt,
        workspaceRoot: workspace?.path,
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
        workspaceRoot: activeSession.workspaceRoot || workspace?.path,
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

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Invalid API Key') || errorMessage.includes('401')) {
        // Add error message to chat
        agentActions.addMessage(activeSession.id, {
          role: 'system',
          content: '❌ **API Key Error**: Your API key appears to be invalid. Please check:\n\n1. The API key is correct and properly formatted\n2. For Groq: Key should start with `gsk_`\n3. For OpenAI: Key should start with `sk-`\n4. For Anthropic: Key should start with `sk-ant-`\n\nClick the key icon (🔑) in the sidebar to update your API key.',
        });
      } else {
        agentActions.addMessage(activeSession.id, {
          role: 'system',
          content: `❌ **Error**: ${errorMessage}`,
        });
      }
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
    <ResizablePanelGroup
      direction="horizontal"
      className="flex h-full w-full overflow-hidden bg-background"
    >
      {/* Left Panel - Sessions */}
      <ResizablePanel
        defaultSize={22}
        minSize={18}
        maxSize={30}
        collapsible
        collapsedSize={ sidebarCollapsed ? 6 : undefined }
        className={cn(
          'flex h-full flex-col border-r border-border/50 bg-muted/10 backdrop-blur-sm transition-all duration-300 ease-in-out',
          sidebarCollapsed && 'min-w-[3.5rem] max-w-[3.5rem]'
        )}
      >
        <SessionSidebar
          sessions={agentState.sessions}
          activeSessionId={agentState.activeSessionId}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden lg:flex" />

      {/* Center Panel - Conversation */}
      <ResizablePanel defaultSize={showToolsPanel ? 56 : 78} minSize={38} className="flex">
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          <ChatHeader
            activeSession={activeSession}
            showToolsPanel={showToolsPanel}
            onToggleToolsPanel={() => setShowToolsPanel((prev) => !prev)}
            className="relative z-10 border-b border-border/60 bg-background/95 backdrop-blur"
          />

          <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/10">
            <ChatMessages
              activeSession={activeSession}
              onNewSession={handleNewSession}
              hasProvider={!!selectedModel}
              containerClassName="pb-40"
            />

            <ChatInput
              variant="floating"
              input={input}
              isSending={isSending}
              activeSession={activeSession}
              onInputChange={setInput}
              onSendMessage={handleSendMessage}
              onKeyDown={handleKeyDown}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={setSelectedProvider}
              onModelChange={setSelectedModel}
              onNewSession={handleNewSession}
              className="pointer-events-none absolute bottom-6 left-1/2 w-full -translate-x-1/2 px-4 sm:px-6 md:max-w-4xl"
            />
          </div>
        </div>
      </ResizablePanel>

      {showToolsPanel && (
        <>
          <ResizableHandle withHandle className="hidden lg:flex" />
          <ResizablePanel defaultSize={22} minSize={20} maxSize={30} className="hidden h-full flex-col border-l border-border/50 bg-muted/8 lg:flex">
            <AgentToolsPanel defaultTab="executions" className="flex-1 overflow-hidden" />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};


export default AgentsView;
