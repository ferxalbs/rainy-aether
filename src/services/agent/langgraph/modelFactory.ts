import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatCerebras } from '@langchain/cerebras';
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

/**
 * Create a LangChain chat model based on provider configuration
 * Supports: Groq, OpenAI, Anthropic, Google Gemini, Cerebras
 */
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

    case 'openai': {
      return new ChatOpenAI({
        model: modelId,
        apiKey: validatedKey,
        ...samplingConfig,
      });
    }

    case 'anthropic': {
      return new ChatAnthropic({
        model: modelId,
        apiKey: validatedKey,
        ...samplingConfig,
      });
    }

    case 'google': {
      return new ChatGoogleGenerativeAI({
        model: modelId,
        apiKey: validatedKey,
        ...samplingConfig,
      });
    }

    case 'cerebras': {
      return new ChatCerebras({
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
