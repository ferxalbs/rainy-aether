# Agent Chat Components

This directory contains a complete chat interface for the Agents view, converted from Next.js 16 to work with Vite and Tauri.

## Components

### Main Component
- **AgentChatView** - The main container component that integrates the entire chat interface

### Chat Components
- **ChatMain** - Manages the main chat area with conversation state
- **ChatSidebar** - Displays chat history, navigation, and settings
- **ChatConversationView** - Shows active conversation with messages
- **ChatWelcomeScreen** - Initial screen shown before starting a conversation
- **ChatMessage** - Individual message component (user/AI)
- **ChatInputBox** - Input area with model selection and tools

## Store

The chat state is managed using the `useSyncExternalStore` pattern (matching the project's architecture):

```tsx
import { useChatStore, useChatActions } from '@/stores/chatStore';

function MyComponent() {
  const { chats, selectedChatId } = useChatStore();
  const { selectChat, archiveChat, deleteChat } = useChatActions();

  // Use state and actions...
}
```

## Data

Mock data is available in `src/data/mockChats.ts` for testing purposes.

## UI Components Added

Two new UI components were added to support the chat interface:
- **Logo** (`src/components/ui/logo.tsx`) - Square AI logo component
- **GridPattern** (`src/components/ui/grid-pattern.tsx`) - Decorative background pattern

## Usage

To use the Agent Chat View in your application:

```tsx
import { AgentChatView } from '@/components/agents';

function App() {
  return <AgentChatView />;
}
```

## Features

- ✅ Responsive design (mobile and desktop)
- ✅ Chat history management (recent and archived)
- ✅ Multiple chat modes (Fast, In-depth, Magic AI, Holistic)
- ✅ Model selection dropdown
- ✅ Message threading
- ✅ Sidebar navigation
- ✅ Theme support (day/night modes)
- ✅ Tailwind v4 styling
- ✅ shadcn/ui components

## Adaptations from Next.js

The following changes were made to convert from Next.js to Vite:

1. **Removed Next.js dependencies:**
   - Removed `"use client"` directives
   - Replaced `next/image` with standard HTML `<img>` and avatar components
   - Replaced `next/link` with standard `<a>` tags

2. **Store conversion:**
   - Converted from Zustand to `useSyncExternalStore` pattern
   - Matches the project's existing store architecture

3. **Import paths:**
   - All imports use `@/*` alias (already configured in the project)
   - Consistent with project structure

4. **TypeScript:**
   - All components are fully typed
   - No TypeScript errors

## Integration with AgentsView

This chat interface is ready to be integrated into the existing AgentsView component when needed.
