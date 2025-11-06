import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import type { Message } from '@/stores/agentStore';

export interface LangGraphConfig {
  sessionId: string;
  threadId: string;
  workspaceRoot?: string;
  userId?: string;
}

export interface LangGraphToolUpdate {
  toolName: string;
  status: 'starting' | 'executing' | 'complete' | 'error';
  message?: string;
  progress?: number;
}

export interface LangGraphStreamChunk {
  streamMode: 'messages' | 'updates' | 'custom';
  payload: unknown;
}

export type LangGraphStreamMode = 'messages' | 'updates' | 'custom';

export const AgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<string | null>({
    value: (_prev, incoming) => incoming,
    default: () => null,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;

export interface AgentGraphResult {
  messages: Message[];
}
