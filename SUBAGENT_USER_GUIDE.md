# 🤖 Custom Subagent System - User Guide

## Quick Start

### Accessing the Subagent Manager

**Option 1: Via Agent Settings**
1. Open the **Agents** sidebar
2. Click the ⚙️ **Settings** icon (top right)
3. Look for the **"Manage Custom Subagents"** button
4. Click to open the Subagent Manager

**Option 2: Directly Add to Your UI**
The `SubagentManager` component is ready to use:
```tsx
import { SubagentManager } from "@/components/agents/SubagentManager";

// In your component:
<SubagentManager className="h-full" />
```

---

## Creating Your First Subagent

### Step 1: Open the Create Dialog
1. In the Subagent Manager, click **"New Subagent"** (top right)
2. Fill in the basic information:

### Step 2: Basic Configuration
- **Name**: Give your agent a descriptive name (e.g., "Security Auditor")
- **Description**: Describe what the agent does (used for AI routing!)
- **Scope**: 
  - `user` - Available in all projects (saved in `~/.rainy/agents/`)
  - `project` - Only for current project (saved in `.rainy/agents/`)

### Step 3: Choose AI Model
Select from available models:
- **Gemini 3 Flash** - Fast, cost-effective
- **Gemini 3 Pro** - More capable
- **Claude 3.5 Sonnet** - Excellent reasoning
- **Claude 3.5 Haiku** - Fast Claude model
- **GPT-4** - OpenAI's flagship
- **Grok Beta** - xAI's model

### Step 4: Select Tools
**Option A: Grant All Tools** (toggle on)
- Agent gets access to every tool
- Useful for general-purpose agents

**Option B: Choose Specific Tools** (recommended)
- Select only the tools your agent needs
- Click **"AI Suggest"** to get intelligent recommendations based on your description!
- Available tools:
  - `read_file` - Read file contents
  - `write_file` - Create/overwrite files
  - `edit_file` - Modify existing files
  - `search_code` - Search codebase
  - `list_dir` - List directory contents
  - `run_command` - Execute terminal commands
  - `git_status` - Check git status
 - `git_diff` - View changes

### Step 5: Write System Prompt
This is the agent's personality and instructions:
```
You are a specialized security auditor focused on finding vulnerabilities
in code. You analyze code for:
- SQL injection risks
- Authentication bypass issues
- Insecure data handling
- Missing input validation

Always provide concrete examples and suggest fixes.
```

### Step 6: Add Keywords (for Routing)
Add keywords that trigger this agent:
- `security`, `audit`, `vulnerability`, `pentest`

When a user says "audit this file for security", the routing system uses these keywords!

### Step 7: Configure Advanced Settings
- **Temperature** (0-2): Lower = focused, Higher = creative
- **Priority** (0-100): Higher = routes to this agent first
- **Tags**: Optional organization (e.g., `#security`, `#code-quality`)

### Step 8: Create!
Click **"Create Subagent"** and it's instantly available!

---

## Using Your Custom Subagents

### Automatic Routing
Once created, **subagents are automatically available** to the routing system:

1. **Keyword Matching**: If your task contains the agent's keywords, it routes there
2. **LLM Selection**: The AI router considers your agent for any task
3. **Explicit Mention**: Users can say "use my security auditor agent"

### Example Usage
```
User: "Review auth.ts for security issues"
→ Routes to "Security Auditor" agent (keyword: "security")

User: "Optimize the database queries"
→ Routes to "Performance Expert" agent (keyword: "optimize")

User: "Write tests for UserService"
→ Routes to "Test Generator" agent (keyword: "test")
```

---

## Managing Subagents

### Edit an Agent
1. Find the agent card in the grid
2. Click the ⋮ menu (appears on hover)
3. Select **"Edit"**
4. Update and save

### Delete an Agent
1. Click ⋮ menu on agent card
2. Select **"Delete"**
3. Confirm (⚠️ this cannot be undone!)

### Reload from Disk
- Click the 🔄 **Reload** button (top right)
- Useful if you edited `.md` files manually

### Search & Filter
- **Search bar**: Find agents by name, description, or tags
- **Filter buttons**: 
  - `All` - Show everything
  - `Enabled` - Only active agents
  - `Disabled` - Only inactive agents

---

## File Storage

### User-level Agents
Stored in: `~/.rainy/agents/`
```
~/.rainy/agents/
  ├── security-auditor.md
  ├── performance-expert.md
  └── test-generator.md
```

### Project-level Agents
Stored in: `<project>/.rainy/agents/`
```
my-project/
  └── .rainy/
      └── agents/
          └── project-specific-agent.md
```

### File Format
Agents are stored as Markdown with YAML frontmatter:
```markdown
---
id: security-auditor
name: Security Auditor
enabled: true
scope: user
model: claude-3.5-sonnet
tools:
  - read_file
  - search_code
keywords:
  - security
  - audit
tags:
  - security
priority: 90
temperature: 0.3
---

# System Prompt
You are a specialized security auditor...
```

You can edit these files directly and click **Reload**!

---

## Best Practices

### 1. **Focused Agents**
Create specialized agents for specific tasks:
- ✅ "React Component Generator"
- ✅ "API Documentation Writer"
- ❌ "Do Everything Agent"

### 2. **Clear Keywords**
Use distinct keywords to avoid routing conflicts:
- Security Auditor: `security`, `audit`, `vulnerability`
- Performance Expert: `optimize`, `performance`, `slow`
- Test Generator: `test`, `spec`, `coverage`

### 3. **Appropriate Tool Access**
Only grant necessary tools:
- **Read-only agent**: `read_file`, `search_code`, `list_dir`
- **Code writer**: `read_file`, `edit_file`, `write_file`
- **DevOps agent**: All tools including `run_command`

### 4. **Descriptive System Prompts**
Be specific about what the agent should do:
```
❌ "You are a helpful coding assistant"
✅ "You are a React expert who creates TypeScript components 
following Material-UI patterns with comprehensive prop types"
```

### 5. **Test Your Agents**
After creating:
1. Try a task that should route to it
2. Check if it uses the right tools
3. Adjust keywords/priority if needed

---

## Example Agents

### Security Auditor
```yaml
name: Security Auditor
model: claude-3.5-sonnet
tools: [read_file, search_code, analyze_file]
keywords: [security, audit, vulnerability, pentest]
priority: 90
temperature: 0.3
```

### React Component Generator
```yaml
name: React Component Generator
model: gemini-3-pro
tools: [read_file, write_file, search_code]
keywords: [component, react, jsx, tsx, ui]
priority: 70
temperature: 0.7
```

### Test Writer
```yaml
name: Test Writer
model: claude-3.5-haiku
tools: [read_file, write_file, search_code]
keywords: [test, spec, jest, vitest, coverage]
priority: 75
temperature: 0.5
```

### Performance Optimizer
```yaml
name: Performance Optimizer
model: gemini-3-flash
tools: [read_file, edit_file, search_code, analyze_file]
keywords: [optimize, performance, slow, memory, cpu]
priority: 80
temperature: 0.4
```

---

## Troubleshooting

### Agent Not Appearing
- ✅ Check it's **enabled** (green dot)
- ✅ Click **Reload** to refresh from disk
- ✅ Verify file is in correct directory

### Wrong Agent Being Selected
- Adjust **priority** (higher = preferred)
- Make **keywords** more specific
- Check for keyword overlap with other agents

### API Errors
- Ensure API keys are configured (⚙️ Settings)
- Check agent's model is available
- Verify selected model doesn't require specific API key

---

## Advanced: Direct API Usage

You can also interact programmatically:

```typescript
// List all subagents
const response = await fetch('http://localhost:3001/api/agentkit/subagents');
const { agents } = await response.json();

// Create a subagent
await fetch('http://localhost:3001/api/agentkit/subagents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "My Agent",
    description: "Does cool stuff",
    model: "gemini-3-flash",
    tools: ["read_file", "write_file"],
    systemPrompt: "You are...",
    keywords: ["cool"],
    enabled: true,
    scope: "user"
  })
});

// Get AI-powered tool suggestions
await fetch('http://localhost:3001/api/agentkit/subagents/suggest-tools', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: "Analyzes code for security vulnerabilities"
  })
});
```

---

## 🎉 That's It!

You're now ready to create powerful, specialized AI agents tailored to your exact needs!

**Happy agent building! 🚀**
