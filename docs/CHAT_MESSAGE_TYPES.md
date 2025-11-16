# Chat Message Type System

## Overview

This document explains the chat message type system used across Rainy Aether's codebase to ensure type safety and prevent mismatches between different modules.

## Type Definitions

### Primary Type: `ChatMessage`

Location: `src/types/chat.ts`

```typescript
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}
```

**This is the canonical message type** used across the application. It aligns with:
- Agent system expectations (`role` field)
- OpenAI/Anthropic API conventions
- LangGraph message format
- Standard chat protocols

### Legacy UI Type: Local `Message` Interface

Some UI components still use a local `Message` interface with a `sender` field for backward compatibility:

```typescript
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';  // Legacy field
  timestamp: Date;
}
```

**Components using this format:**
- `ChatMessage.tsx` - Renders individual messages
- `ChatConversationView.tsx` - Full conversation UI
- `ChatMain.tsx` - Root chat component

## Type Conversion

### Helper Functions

Location: `src/types/chat.ts`

```typescript
// Convert role to sender (for UI display)
function roleToSender(role: 'user' | 'assistant' | 'system'): 'user' | 'ai' {
  return role === 'assistant' || role === 'system' ? 'ai' : 'user';
}

// Convert sender to role (for agent system)
function senderToRole(sender: 'user' | 'ai'): 'user' | 'assistant' {
  return sender === 'ai' ? 'assistant' : 'user';
}
```

### Example Usage

**VirtualizedMessageList** - Accepts `ChatMessage[]` and converts for display:

```typescript
<ChatMessageComponent
  message={{
    id: message.id,
    content: message.content,
    sender: roleToSender(message.role),
    timestamp: message.timestamp,
  }}
/>
```

**ChatMain** - Converts agent messages to UI format:

```typescript
const messages: Message[] = agentMessages.map((msg, index) => ({
  id: `msg-${index}`,
  content: msg.content,
  sender: roleToSender(msg.role),
  timestamp: new Date(),
  toolCalls: msg.toolCalls,
}));
```

## Architecture Decisions

### Why Two Types?

1. **Agent System**: Uses `role: 'user' | 'assistant' | 'system'` to align with:
   - LLM API conventions (OpenAI, Anthropic, Google)
   - Standard chat protocols
   - System message support

2. **UI Components**: Some use `sender: 'user' | 'ai'` for:
   - Backward compatibility with existing code
   - Simpler UI logic (two-party conversation)
   - Gradual migration path

### Migration Path

The codebase is designed for gradual migration:

1. **Phase 1 (Current)**: Dual types with conversion helpers
2. **Phase 2 (Future)**: Migrate UI components to use `role` directly
3. **Phase 3 (Future)**: Deprecate local `Message` interfaces
4. **Phase 4 (Future)**: Single `ChatMessage` type everywhere

## Components Overview

### Using `ChatMessage` (Canonical Type)

| Component | Usage | Conversion |
|-----------|-------|------------|
| `VirtualizedMessageList` | Accepts `ChatMessage[]` | Converts to `sender` for `ChatMessage` component |
| Agent system | Uses `ChatMessage` directly | No conversion needed |
| API integrations | Uses `ChatMessage` directly | No conversion needed |

### Using Local `Message` (Legacy)

| Component | Usage | Needs Migration |
|-----------|-------|-----------------|
| `ChatMessage.tsx` | Uses `sender` field | Yes (low priority) |
| `ChatConversationView.tsx` | Uses `sender` field | Yes (low priority) |
| `ChatMain.tsx` | Converts `role` → `sender` | Yes (low priority) |

## Best Practices

### For New Code

✅ **DO**: Use `ChatMessage` from `src/types/chat.ts`
```typescript
import { ChatMessage } from '@/types/chat';
```

✅ **DO**: Use conversion helpers when interfacing with legacy code
```typescript
import { roleToSender, senderToRole } from '@/types/chat';
```

❌ **DON'T**: Create new local `Message` interfaces
```typescript
// Bad - creates type divergence
interface Message {
  sender: 'user' | 'ai';
  // ...
}
```

❌ **DON'T**: Hardcode conversions
```typescript
// Bad - use roleToSender() instead
sender: msg.role === 'user' ? 'user' : 'ai'
```

### For Existing Code

When modifying existing components:

1. Add documentation comments explaining the local type
2. Use conversion helpers instead of inline logic
3. Consider migrating to `ChatMessage` if refactoring

## Type Safety

### Exported Types

The `VirtualizedMessageList` re-exports `ChatMessage` as `Message` for backward compatibility:

```typescript
// src/components/chat/VirtualizedMessageList.tsx
export type { ChatMessage as Message } from '@/types/chat';
```

This allows existing code to continue working:
```typescript
import { Message } from '@/components/chat';
// Message is actually ChatMessage
```

### Import Paths

**Primary (Recommended):**
```typescript
import { ChatMessage } from '@/types/chat';
```

**Secondary (Backward Compatible):**
```typescript
import { Message } from '@/components/chat';
// Actually imports ChatMessage via re-export
```

## Future Improvements

### Potential Enhancements

1. **Single Source of Truth**: Migrate all components to use `ChatMessage` directly
2. **Stricter Types**: Add branded types to prevent role/sender mixing
3. **Validation**: Add runtime validation for message shape
4. **Zod Schemas**: Add schema validation for API boundaries

### Migration Checklist

When migrating a component from `sender` to `role`:

- [ ] Update interface to use `ChatMessage`
- [ ] Remove conversion helpers
- [ ] Update tests
- [ ] Update documentation
- [ ] Verify no type errors
- [ ] Test UI rendering

## Related Files

- `src/types/chat.ts` - Type definitions and helpers
- `src/components/chat/VirtualizedMessageList.tsx` - Virtualized message display
- `src/components/agents/ChatMessage.tsx` - Individual message renderer
- `src/components/agents/ChatMain.tsx` - Root chat component
- `src/services/agent/providers/base.ts` - Agent ChatMessage interface

## Questions?

For questions or issues with the type system:
1. Check this documentation
2. Review `src/types/chat.ts`
3. Look at existing conversion examples in `ChatMain.tsx`
4. Open an issue with the "type-system" label
