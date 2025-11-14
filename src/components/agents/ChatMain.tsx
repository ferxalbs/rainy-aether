import { useState } from 'react';
import { ChatWelcomeScreen } from './ChatWelcomeScreen';
import { ChatConversationView } from './ChatConversationView';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

/**
 * Root chat component that manages conversation state and renders either the welcome screen or the conversation view.
 *
 * Manages the current input, selected UI mode and AI model, and the list of messages; exposes handlers to start a conversation,
 * reset it, and append new user messages.
 *
 * @returns The chat UI: a ChatWelcomeScreen when no conversation has started, or a ChatConversationView when a conversation is active.
 */
export function ChatMain() {
  const [message, setMessage] = useState('');
  const [selectedMode, setSelectedMode] = useState('fast');
  const [selectedModel, setSelectedModel] = useState('rainy-3');
  const [isConversationStarted, setIsConversationStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = () => {
    if (!message.trim()) return;

    setIsConversationStarted(true);

    setMessages([
      {
        id: '1',
        content: message,
        sender: 'user',
        timestamp: new Date(),
      },
      {
        id: '2',
        content:
          "Hello! I'm Rainy AI, your intelligent coding assistant. I'm here to help you build amazing software. How can I assist you today?",
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
    setMessage('');
  };

  const handleReset = () => {
    setIsConversationStarted(false);
    setMessages([]);
    setMessage('');
  };

  const handleSendMessage = (content: string) => {
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        content,
        sender: 'user',
        timestamp: new Date(),
      },
    ]);
    setMessage('');
  };

  if (isConversationStarted) {
    return (
      <ChatConversationView
        messages={messages}
        message={message}
        onMessageChange={setMessage}
        onSend={handleSendMessage}
        onReset={handleReset}
      />
    );
  }

  return (
    <ChatWelcomeScreen
      message={message}
      onMessageChange={setMessage}
      onSend={handleSend}
      selectedMode={selectedMode}
      onModeChange={setSelectedMode}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
    />
  );
}