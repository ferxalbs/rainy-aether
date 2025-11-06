import type { AgentSession } from '@/stores/agentStore';

import { isLangGraphEnabled } from './featureFlag';
import type { LangGraphConfig } from './types';
import { buildLangGraphAgent } from './graphFactory';
import type { LangGraphToolProgressHandler } from './tools';

export interface LangGraphRunnerInput {
  session: AgentSession;
  apiKey: string;
  userMessage: string;
  config: LangGraphConfig;
  onToolUpdate?: LangGraphToolProgressHandler;
}

export function canUseLangGraph(): boolean {
  return isLangGraphEnabled();
}

export async function runLangGraphSession(input: LangGraphRunnerInput) {
  if (!canUseLangGraph()) {
    throw new Error('LangGraph is not enabled.');
  }

  const { session, apiKey, userMessage, config, onToolUpdate } = input;
  const { agent, inputs, streamConfig } = buildLangGraphAgent({
    session,
    newUserMessage: userMessage,
    apiKey,
    config,
    onToolUpdate,
  });

  const stream = await agent.stream(inputs, streamConfig);

  return {
    agent,
    stream,
  };
}
