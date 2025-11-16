import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';

import type { AgentSession, Message } from '@/stores/agentStore';

import type { LangGraphConfig } from './types';
import { buildLangGraphTools, type LangGraphToolProgressHandler } from './tools';
import { createLangGraphChatModel } from './modelFactory';
import { rustBridge } from './rustBridge';

export interface BuildLangGraphAgentOptions {
  session: AgentSession;
  newUserMessage: string;
  apiKey: string;
  config: LangGraphConfig;
  onToolUpdate?: LangGraphToolProgressHandler;
}

function toLangChainMessages(history: Message[]): (HumanMessage | AIMessage | SystemMessage)[] {
  return history.map((msg) => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    }
    if (msg.role === 'assistant') {
      return new AIMessage(msg.content);
    }
    return new SystemMessage(msg.content);
  });
}

// Create a shared checkpointer instance for memory persistence
const checkpointer = new MemorySaver();

/**
 * Flag to control tool source
 * - true: Use Rust-backed tools (RECOMMENDED for performance)
 * - false: Use TypeScript tools (legacy)
 */
const USE_RUST_TOOLS = true;

export async function buildLangGraphAgent(options: BuildLangGraphAgentOptions) {
  const { session, newUserMessage, apiKey, config } = options;

  const model = createLangGraphChatModel({
    providerId: session.providerId,
    modelId: session.modelId,
    apiKey,
    config: session.config,
  });

  // Get tools based on configuration
  let tools;
  if (USE_RUST_TOOLS) {
    // Initialize Rust bridge if not already done (idempotent)
    await rustBridge.initialize();

    // Get all Rust-backed tools
    tools = rustBridge.getAllTools();
    console.log(`🦀 Using ${tools.length} Rust-backed tools for agent`);
  } else {
    // Legacy: Use TypeScript tools
    tools = buildLangGraphTools(options.onToolUpdate);
    console.log(`📦 Using ${tools.length} TypeScript tools for agent (legacy mode)`);
  }

  // Add system message if present
  const systemMessage = session.messages.find((m) => m.role === 'system');
  const stateModifier = systemMessage ? new SystemMessage(systemMessage.content) : undefined;

  const agent = createReactAgent({
    llm: model,
    tools,
    checkpointSaver: checkpointer,
    ...(stateModifier && { stateModifier }),
  });

  const history = toLangChainMessages(session.messages.filter((m) => m.role !== 'system'));
  const inputs = {
    messages: [...history, new HumanMessage(newUserMessage)],
  };

  // Use 'values' stream mode for complete state updates (recommended for most use cases)
  // This gives us the full state after each step, making it easier to track progress
  const streamConfig = {
    configurable: {
      thread_id: config.threadId, // LangGraph standard key
      sessionId: config.sessionId,
      workspaceRoot: config.workspaceRoot,
      userId: config.userId,
      messages: session.messages,
    },
    streamMode: 'values' as const, // Stream complete state after each step
  };

  return {
    agent,
    inputs,
    streamConfig,
  };
}
