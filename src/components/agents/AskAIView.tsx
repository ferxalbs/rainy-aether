import { ChatMain } from './ChatMain';

/**
 * Ask AI view component - wrapper for chat interface
 *
 * This view provides the main chat interface where users can interact with the AI assistant.
 * It wraps the ChatMain component which handles the conversation logic.
 *
 * @returns The Ask AI chat interface
 */
export function AskAIView() {
  return <ChatMain />;
}
