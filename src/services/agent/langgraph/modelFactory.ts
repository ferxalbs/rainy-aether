import { ChatGroq } from '@langchain/groq';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { AgentConfig } from '@/stores/agentStore';

export interface LangGraphModelFactoryOptions {
  providerId: string;
  modelId: string;
  apiKey: string;
  config: AgentConfig;
}

function ensureApiKey(apiKey: string | null | undefined, providerId: string): string {
  if (!apiKey) {
    throw new Error(`Missing API key for provider ${providerId}.`);
  }
  return apiKey;
}

function applyCommonSamplingConfig(config: AgentConfig) {
  const sampling: Record<string, unknown> = {};
  if (typeof config.temperature === 'number') {
    sampling.temperature = config.temperature;
  }
  if (typeof config.topP === 'number') {
    sampling.topP = config.topP;
  }
  if (typeof config.maxTokens === 'number') {
    sampling.maxTokens = config.maxTokens;
  }
  return sampling;
}

export function createLangGraphChatModel(options: LangGraphModelFactoryOptions): BaseChatModel {
  const { providerId, modelId, apiKey, config } = options;
  const validatedKey = ensureApiKey(apiKey, providerId);
  const samplingConfig = applyCommonSamplingConfig(config);

  switch (providerId) {
    case 'groq': {
      return new ChatGroq({
        model: modelId,
        apiKey: validatedKey,
        ...samplingConfig,
      });
    }
    default: {
      throw new Error(`Unsupported LangGraph provider: ${providerId}`);
    }
  }
}
