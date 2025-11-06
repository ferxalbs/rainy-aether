import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

import type { AgentSession, Message } from '@/stores/agentStore';

import type { LangGraphConfig, LangGraphStreamMode } from './types';
import { buildLangGraphTools, type LangGraphToolProgressHandler } from './tools';
import { createLangGraphChatModel } from './modelFactory';

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

export function buildLangGraphAgent(options: BuildLangGraphAgentOptions) {
  const { session, newUserMessage, apiKey, config } = options;

  const model = createLangGraphChatModel({
    providerId: session.providerId,
    modelId: session.modelId,
    apiKey,
    config: session.config,
  });

  const tools = buildLangGraphTools(options.onToolUpdate);

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  const history = toLangChainMessages(session.messages);
  const inputs = {
    messages: [...history, new HumanMessage(newUserMessage)],
  };

  const streamModes: LangGraphStreamMode[] = ['messages', 'updates', 'custom'];

  const streamConfig = {
    configurable: {
      sessionId: config.sessionId,
      threadId: config.threadId,
      workspaceRoot: config.workspaceRoot,
      userId: config.userId,
      messages: session.messages,
    },
    streamMode: streamModes,
  };

  return {
    agent,
    inputs,
    streamConfig,
  };
}
