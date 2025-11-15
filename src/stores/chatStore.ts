import { useSyncExternalStore } from 'react';
import { mockChats, type Chat, type Message } from '@/data/mockChats';

export interface ChatState {
  chats: Chat[];
  selectedChatId: string | null;
}

const initialState: ChatState = {
  chats: mockChats,
  selectedChatId: null,
};

let currentState: ChatState = initialState;
let cachedSnapshot: ChatState = { ...initialState };

type ChatStateListener = () => void;
const listeners = new Set<ChatStateListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Chat state listener error:', error);
    }
  });
};

const setState = (updater: (prev: ChatState) => ChatState) => {
  const next = updater(currentState);
  currentState = next;
  cachedSnapshot = { ...next };
  notifyListeners();
};

const subscribe = (listener: ChatStateListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): ChatState => cachedSnapshot;

// Actions
export const chatActions = {
  selectChat: (chatId: string) => {
    setState((state) => ({
      ...state,
      selectedChatId: chatId,
    }));
  },

  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    setState((state) => ({
      ...state,
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  ...message,
                  id: `msg-${Date.now()}-${Math.random()}`,
                  timestamp: new Date(),
                },
              ],
              updatedAt: new Date(),
            }
          : chat
      ),
    }));
  },

  createNewChat: () => {
    setState((state) => {
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: 'New Conversation',
        icon: 'message-circle-dashed',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
      };
      return {
        chats: [newChat, ...state.chats],
        selectedChatId: newChat.id,
      };
    });
  },

  archiveChat: (chatId: string) => {
    setState((state) => ({
      ...state,
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isArchived: true } : chat
      ),
    }));
  },

  unarchiveChat: (chatId: string) => {
    setState((state) => ({
      ...state,
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isArchived: false } : chat
      ),
    }));
  },

  deleteChat: (chatId: string) => {
    setState((state) => ({
      ...state,
      chats: state.chats.filter((chat) => chat.id !== chatId),
      selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
    }));
  },
};

// React hooks
export function useChatStore(): ChatState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useChatActions() {
  return chatActions;
}
