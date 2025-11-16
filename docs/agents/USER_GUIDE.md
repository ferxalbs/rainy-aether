# 📘 Rainy Agents - User Guide

**Version**: 1.0
**Last Updated**: 2025-11-16
**Target Audience**: Rainy Code IDE Users

---

## 🎯 Introduction

Welcome to **Rainy Agents**, the multi-agent AI system powering Rainy Code IDE! This guide will help you understand and effectively use our AI agents to enhance your development workflow.

### What are Rainy Agents?

Rainy Agents is a sophisticated multi-agent system that provides specialized AI assistance for different development tasks. Instead of a one-size-fits-all AI, you get access to multiple specialized agents, each optimized for specific workflows.

### Available Agents

Currently, Rainy Code includes **three specialized agents**:

1. **Rainy** - General-purpose coding assistant
2. **Claude Code** - Code analysis and refactoring specialist
3. **Abby Mode** - Autonomous development assistant

---

## 🤖 Meet the Agents

### Rainy Agent

**Best for**: General coding tasks, quick queries, and everyday development

**Capabilities**:
- Code generation and editing
- File system operations
- Git operations
- Terminal command execution
- Workspace analysis
- Code refactoring
- Documentation generation

**Personality**: Professional, friendly, and proactive

**When to use**:
- "Write a function to validate email addresses"
- "Add error handling to this function"
- "Create a new React component"
- "Find all TypeScript files in the project"

**Model**: Groq Llama 3.3 70B (fast, capable)

---

### Claude Code Agent

**Best for**: Code analysis, refactoring, debugging, and testing

**Capabilities**:
- Deep code analysis and architecture review
- Safe refactoring strategies
- Bug detection and debugging
- Comprehensive test generation
- Documentation generation
- Performance optimization
- Security analysis

**Personality**: Precise, thoughtful, educational

**When to use**:
- "Analyze this code for potential bugs"
- "Suggest refactorings for better maintainability"
- "Generate comprehensive tests for this module"
- "Review this code for security issues"

**Model**: Google Gemini 2.0 Flash (accurate, consistent)

---

### Abby Mode Agent

**Best for**: Proactive workspace monitoring and autonomous suggestions

**Capabilities**:
- Autonomous coding assistance
- Proactive suggestions based on patterns
- Workflow automation recommendations
- Pattern detection and refactoring
- Code quality monitoring
- Test coverage analysis
- Dependency update notifications

**Personality**: Helpful but non-intrusive, learns from your preferences

**When to use**:
- Enable monitoring for continuous workspace observation
- Get automated suggestions during idle time
- Identify refactoring opportunities you might miss
- Track code quality trends over time

**Model**: Groq Llama 3.3 70B (responsive, balanced)

**Special Features**:
- **Proactive Monitoring**: Watches workspace for patterns and opportunities
- **Learning System**: Adapts to your coding style and preferences
- **Suggestion Priority**: High-impact, low-effort improvements first
- **Non-Intrusive**: Presents suggestions at appropriate times

**See**: `docs/agents/ABBY_MODE_GUIDE.md` for comprehensive Abby Mode documentation

---

## 🚀 Getting Started

### 1. Accessing Rainy Agents

Rainy Agents is integrated directly into the Rainy Code IDE:

1. Open Rainy Code IDE
2. Navigate to the **Agents** tab (sidebar or bottom panel)
3. You'll see the chat interface with agent selection

### 2. Selecting an Agent

To choose which agent to use:

1. Click the **agent selector** in the sidebar
2. See available agents with their descriptions
3. Click on an agent to select it
4. The selected agent will have a highlighted background

**Tip**: The agent selector shows which agent is currently active with a pulse indicator.

### 3. Sending Your First Message

Once you've selected an agent:

1. Type your message in the chat input
2. Press `Enter` or click **Send**
3. Watch as the agent processes your request
4. See tool executions in real-time (e.g., reading files, executing commands)
5. Receive a thoughtful, actionable response

---

## 💡 Best Practices

### Choosing the Right Agent

**Use Rainy when**:
- You need quick answers or simple code generation
- You're exploring the codebase
- You want to execute commands or manage files
- You need a general-purpose assistant

**Use Claude Code when**:
- You want detailed code analysis
- You're refactoring complex code
- You need test generation
- You're debugging tricky issues
- You want architecture or security review

### Writing Effective Prompts

**Good Prompts**:
- ✅ "Analyze src/auth.ts for security vulnerabilities"
- ✅ "Refactor the UserService class to use dependency injection"
- ✅ "Generate unit tests for the validation utility functions"
- ✅ "Find all files that import the User model"

**Less Effective Prompts**:
- ❌ "Fix my code" (too vague)
- ❌ "Make it better" (unclear goals)
- ❌ "Help" (no context)

**Tips for Better Results**:
1. **Be Specific**: Mention file names, line numbers, or specific issues
2. **Provide Context**: Explain what you're trying to achieve
3. **Ask Follow-ups**: If the response isn't perfect, ask for clarification
4. **Use Examples**: Show the agent what you're looking for

---

## ⚡ Agent Modes

Both agents support **dual-mode operation**:

### Fast Mode (🚀)

- **Speed**: < 200ms responses
- **How it works**: Direct execution via Rust backend
- **Best for**: Simple queries, file reads, quick commands
- **Trade-off**: Less reasoning, simpler responses

**Example**: "List all TypeScript files in src/"

### Smart Mode (🧠)

- **Speed**: < 500ms responses
- **How it works**: LangGraph ReAct pattern with advanced reasoning
- **Best for**: Complex tasks, multi-step operations, code analysis
- **Trade-off**: Slightly slower but much more intelligent

**Example**: "Refactor this code to improve performance and maintainability"

### Auto Mode (🤖)

**Both agents automatically choose the best mode** based on your message:

- **Rainy**: Defaults to fast mode for simple queries, smart mode for complex tasks
- **Claude Code**: Defaults to smart mode (analysis benefits from reasoning)

**You can override** by explicitly requesting:
- "Quick mode: List files" → Forces fast mode
- "Detailed analysis: Review this code" → Forces smart mode

---

## 🛠️ Tool Execution

When agents work, they use **Rust-backed tools** for various operations:

### Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `read_file` | Read file contents | Reading source code |
| `write_file` | Create/update files | Saving generated code |
| `list_directory` | List directory contents | Exploring project structure |
| `execute_command` | Run terminal commands | Running tests, building |
| `git_status` | Check Git status | Before committing changes |
| `git_log` | View commit history | Understanding recent changes |
| `workspace_structure` | Analyze workspace | Understanding architecture |
| `search_files` | Search for patterns | Finding references |

### Watching Tool Execution

The UI shows **real-time tool execution**:

- **Pending** ⏳: Tool queued for execution
- **Running** 🔄: Tool currently executing
- **Success** ✅: Tool completed successfully
- **Error** ❌: Tool encountered an error

Click on any tool execution to see **detailed results**:
- Input parameters
- Output/result
- Execution time
- Error messages (if any)

---

## 🎨 User Interface Guide

### Chat Interface

```
┌─────────────────────────────────────────────────────────┐
│  [Rainy Agents v1]                            [☰]      │
├─────────────────────────────────────────────────────────┤
│  ┌─── Sidebar ────┐  ┌─── Main Chat ─────────────────┐ │
│  │ Agent Selector │  │                                │ │
│  │                │  │  [User Message]                │ │
│  │ ● Rainy        │  │                                │ │
│  │   Claude Code  │  │  [Agent Response]              │ │
│  │                │  │  ┌── Tool Executions ──┐      │ │
│  │                │  │  │ ✅ read_file         │      │ │
│  │                │  │  │ ✅ execute_command   │      │ │
│  │                │  │  └─────────────────────┘      │ │
│  │                │  │                                │ │
│  └────────────────┘  └────────────────────────────────┘ │
│  ┌────────────── Input ────────────────────────────────┐│
│  │ Type your message...                      [Send]   ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Components

1. **Agent Selector**: Choose which agent to use
2. **Chat Area**: Conversation history with agents
3. **Tool Execution View**: Real-time tool activity
4. **Input Box**: Type messages and send to agents

---

## 📊 Example Workflows

### Workflow 1: Code Review

**Goal**: Get a comprehensive code review

**Steps**:
1. Select **Claude Code** agent
2. Message: "Review src/utils/validation.ts for issues"
3. Claude Code will:
   - Read the file
   - Analyze code quality
   - Identify potential bugs
   - Suggest improvements
4. Follow up with: "Generate tests for the issues you found"

**Result**: Thorough review + test generation

---

### Workflow 2: Feature Implementation

**Goal**: Add a new feature with tests

**Steps**:
1. Select **Rainy** agent
2. Message: "Create a user authentication module with JWT"
3. Rainy will:
   - Generate the module code
   - Create necessary files
   - Explain the implementation
4. Switch to **Claude Code**
5. Message: "Generate comprehensive tests for the auth module"

**Result**: Complete feature with tests

---

### Workflow 3: Debugging

**Goal**: Fix a tricky bug

**Steps**:
1. Select **Claude Code** agent
2. Message: "Debug why the login function sometimes fails"
3. Claude Code will:
   - Read relevant files
   - Analyze execution flow
   - Identify potential race conditions or edge cases
   - Suggest fixes with explanations
4. Follow up: "Implement your suggested fix"

**Result**: Bug identified and fixed with explanation

---

## 🎓 Tips and Tricks

### Tip 1: Chain Conversations

Agents remember context within a session:

```
You: "Read src/config.ts"
Agent: [Reads file and shows content]

You: "Now update the database URL"
Agent: [Updates the file, remembering the context]
```

### Tip 2: Be Specific About Files

Good:
- "Analyze src/services/auth.ts"
- "Refactor components/UserProfile.tsx"

Less Good:
- "Look at the auth file" (which one?)
- "Fix the component" (which component?)

### Tip 3: Use Multi-Step Requests

Both agents handle complex multi-step tasks:

```
"1. Read all files in src/utils
 2. Find duplicated code
 3. Suggest how to extract it into shared functions"
```

### Tip 4: Ask for Explanations

Don't just get code - understand it:

```
"Explain why you chose this approach"
"What are the trade-offs of this solution?"
"How does this compare to [alternative approach]?"
```

### Tip 5: Leverage Agent Strengths

- **Quick lookups**: Use Rainy (fast mode)
- **Deep analysis**: Use Claude Code (smart mode)
- **File operations**: Both work great
- **Code generation**: Start with Rainy, review with Claude Code

---

## ⚙️ Configuration

### API Keys

Agents require API keys for their respective providers:

**Rainy Agent**: Groq API key
**Claude Code**: Google Gemini API key

**Setting API Keys**:
1. Go to **Settings** > **Agents**
2. Enter your API keys
3. Keys are stored securely locally
4. Never shared or transmitted

**Getting API Keys**:
- Groq: https://console.groq.com/
- Google Gemini: https://ai.google.dev/

### Agent Settings

Each agent can be configured:

- **Temperature**: Creativity vs. consistency (0.0 - 1.0)
- **Max Tokens**: Maximum response length
- **Max Iterations**: How many tool calls allowed

**Recommended Settings**:
- **Rainy**: Temperature 0.7 (balanced)
- **Claude Code**: Temperature 0.3 (consistent)

---

## 🔒 Privacy & Security

### Your Data

- **Conversations**: Stored locally in your IDE
- **Code**: Only sent when explicitly mentioned in prompts
- **API Keys**: Stored securely, never shared
- **Tool Execution**: All file operations are sandboxed

### Best Practices

- ✅ Review code before applying agent suggestions
- ✅ Don't share API keys in chat messages
- ✅ Be cautious with destructive commands
- ✅ Use version control (Git) to track changes

### What Gets Sent to AI Providers

- Your messages to the agent
- File contents you ask the agent to read
- Command outputs from tool executions
- **NOT sent**: Your entire codebase, API keys, or credentials

---

## 🐛 Troubleshooting

### Agent Not Responding

**Possible Causes**:
- API key not configured
- Network connectivity issues
- Provider API rate limits

**Solutions**:
1. Check API key in Settings
2. Verify internet connection
3. Wait a few minutes if rate limited

### Tool Execution Fails

**Common Issues**:
- File not found
- Permission denied
- Command not available

**Solutions**:
- Verify file paths are correct
- Check file permissions
- Ensure commands are installed

### Unexpected Responses

**Tips**:
- Rephrase your question more specifically
- Provide more context
- Try the other agent (different perspective)
- Ask follow-up questions for clarification

---

## 📚 Further Reading

- **API Reference**: `docs/agents/API_REFERENCE.md` (coming soon)
- **Phase 4 Plan**: `docs/agents/PHASE_4_IMPLEMENTATION_PLAN.md`
- **Master Plan**: `docs/agents/RAINY_AGENTS_MASTER_PLAN.md`

---

## 🆘 Getting Help

**Have questions or feedback?**

- GitHub Issues: https://github.com/ferxalbs/rainy-aether-2/issues
- Documentation: This guide and linked docs
- Community: (coming soon)

---

**Enjoy coding with Rainy Agents! 🚀**

*Making AI-assisted development delightful since 2025*
