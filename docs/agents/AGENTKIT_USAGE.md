# AgentKit Integration Guide

## MCP Configuration (Standard Format)

Create `.rainy/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"],
      "env": {}
    },
    "dart-mcp-server": {
      "command": "dart",
      "args": ["mcp-server"],
      "env": {}
    },
    "firebase-mcp-server": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"],
      "env": {}
    }
  }
}
```

> This format is **100% compatible** with Claude Desktop, Cursor, and other MCP clients.

---

## Using the React Hook

```tsx
import { useAgentKit } from '@/hooks/useAgentKit';

function ChatComponent() {
  const { isLoading, task, events, execute } = useAgentKit({
    onEvent: (e) => console.log(e.type, e),
  });

  const handleSubmit = async (message: string) => {
    await execute(message, {
      workspace: '/path/to/project',
      currentFile: 'src/App.tsx',
    });
  };

  return (
    <div>
      {events.map((e, i) => (
        <div key={i}>
          <strong>{e.type}</strong>: {e.message || e.tool || e.agent}
        </div>
      ))}
      {task?.output && <pre>{task.output}</pre>}
    </div>
  );
}
```

---

## API Endpoints

### Execute Task
```bash
POST /api/agentkit/execute
{
  "task": "Create a login component",
  "context": { "workspace": "/path" }
}
```

### Stream Events (SSE)
```bash
GET /api/agentkit/tasks/:taskId/stream
```

### MCP Configuration
```bash
# Get servers
GET /api/agentkit/mcp/servers?workspace=/path

# Get config
GET /api/agentkit/mcp/config?workspace=/path

# Create default config
POST /api/agentkit/mcp/config { "workspace": "/path" }

# Add server
POST /api/agentkit/mcp/servers {
  "workspace": "/path",
  "name": "my-server",
  "server": { "command": "npx", "args": [...] }
}
```

---

## Agents

| Agent | Purpose |
|-------|---------|
| `planner` | Task breakdown, architecture |
| `coder` | Write/edit code |
| `reviewer` | Code review |
| `terminal` | Run commands |
| `docs` | Documentation |

---

## Event Types

```typescript
type AgentEvent =
  | { type: 'agent.start'; agent: string }
  | { type: 'agent.thinking'; message: string }
  | { type: 'tool.call'; tool: string; args: object }
  | { type: 'tool.result'; tool: string; success: boolean }
  | { type: 'task.complete'; status: 'completed' | 'failed' }
```
