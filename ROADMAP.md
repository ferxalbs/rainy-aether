# ROADMAP

# RAINY AETHER - IDE ROADMAP

## Next-Generation AI-First Development Environment

Based on the analysis of your AGENTS.md file and the latest features from Cursor 2.0, TRAE.AI, and Windsurf, here's a comprehensive feature roadmap for Rainy Aether 2 IDE built with React and Tauri 2.0.

## CORE ARCHITECTURE PRINCIPLES

### Dual IDE Mode System

- **Sidebar Mode**: Traditional IDE with enhanced AI assistance
- **Rainy Mode (Agent Mode)**: Full autonomous agent execution environment
- **Seamless Switching**: Instant toggle between modes with state preservation


### Multi-Provider AI Integration

- **Primary Providers**: Cerebras, Groq, OpenAI, Anthropic, XAI, Z.ai
- **Claude Agents SDK Orchestration**: Default orchestration for compatible models
- **Parallel Agent Execution**: Run multiple models simultaneously for accuracy

***

## MVP FEATURES (Phase 1) - Essential Launch Features

### 1. Enhanced Code Editor Core

**Priority: Critical**

- [x] CodeMirror 6 with multi-language support
- [ ] **Voice Mode Integration** (inspired by Cursor 2.0)[^1]
    - Speech-to-text for code commands
    - Voice-driven code navigation
    - Natural language code editing
- [ ] **Smart Context Awareness** (from TRAE.AI Cue)[^2]
    - Chronological tracking of user edits
    - Symbol support and cross-file navigation
    - Auto-import with intelligent suggestions


### 2. Integrated Browser Environment

**Priority: Critical**

- [ ] **Native Browser Tool** (Cursor 2.0 feature)[^3][^4]
    - Embedded browser with devtools
    - DOM element selection and inspection
    - Live preview with hot reload
    - Agent-browser interaction for testing


### 3. Rainy Mode (Agent Mode) Foundation

**Priority: Critical**

- [ ] **Agent Command Interface**
    - Natural language command processing
    - Context-aware task understanding
    - Multi-step workflow execution
- [ ] **Sandboxed Terminal** (Cursor 2.0 inspired)[^3]
    - Secure command execution
    - Workspace-scoped file access
    - No internet access by default


### 4. Multi-Provider AI Integration

**Priority: Critical**

- [ ] **Provider Management System**
    - API key management for all providers
    - Model selection interface
    - Usage tracking and billing integration
- [ ] **Claude Agents SDK Integration**
    - Default orchestration for compatible models
    - Multi-agent workflow coordination
    - Context management and memory


### 5. Smart Code Review System

**Priority: High**

- [ ] **Unified Diff View** (Cursor 2.0 approach)[^4][^3]
    - Multi-file change aggregation
    - Interactive review interface
    - Accept/reject individual changes
- [ ] **AI Code Review**
    - Automated code quality analysis
    - Security vulnerability detection
    - Performance optimization suggestions

***

## PHASE 2 - Advanced AI Features

### 6. Parallel Agent System

**Priority: High**

- [ ] **Multi-Model Execution** (Cursor 2.0 feature)[^3]
    - Run same prompt across 8 different models
    - Consensus-based decision making
    - Cost vs accuracy optimization
- [ ] **Agent Specialization**
    - Different models for planning vs implementation
    - Task-specific model selection
    - Performance monitoring and optimization


### 7. Enhanced Context Management

**Priority: High**

- [ ] **Smart Context Gathering** (Cursor 2.0 improvement)[^3]
    - Automatic context detection
    - Remove explicit @mentions requirement
    - Self-gathering context from codebase
- [ ] **Project-Wide Awareness** (TRAE.AI approach)[^2]
    - Real-time symbol tracking
    - Dependency graph understanding
    - Cross-file relationship mapping


### 8. Turbo Mode (Autonomous Execution)

**Priority: High**

- [ ] **Autonomous Task Execution** (Windsurf Wave 3)[^5]
    - Iterative task completion without approval
    - Multi-step workflow automation
    - Safety guardrails and rollback


### 9. Advanced Navigation

**Priority: Medium**

- [ ] **Tap to Jump** (Windsurf feature)[^5]
    - Predictive cursor positioning
    - Smart navigation between edit locations
    - Workflow acceleration

***

## PHASE 3 - Productivity \& Collaboration

### 10. Model Context Protocol (MCP) Integration

**Priority: High**

- [ ] **MCP Server Support** (Windsurf Wave 3)[^5]
    - External data source integration
    - Custom tool call capabilities
    - JSON configuration through settings
- [ ] **MCP Cascade Flow System**
    - Workflow orchestration with external data
    - Custom MCP server development tools


### 11. Enhanced Terminal \& Development Tools

**Priority: Medium**

- [ ] **Advanced Terminal Features**
    - Multiple terminal sessions
    - Directory synchronization
    - Shell-specific optimizations
- [ ] **Integrated Development Tools**
    - Git workflow integration
    - Package manager interfaces
    - Build system integration


### 12. Team Collaboration Features

**Priority: Medium**

- [ ] **Shareable Team Commands** (Cursor 2.0)[^3]
    - Custom command libraries
    - Team-wide configuration sync
    - Collaborative workflows
- [ ] **Real-time Collaboration**
    - Live editing with team members
    - Shared agent sessions
    - Comment and review system

***

## PHASE 4 - Advanced Features \& Polish

### 13. Multi-Modal Capabilities

**Priority: Medium**

- [ ] **Drag \& Drop Image Support** (Windsurf)[^5]
    - Direct image upload to editor
    - AI-assisted image analysis
    - Visual design assistance
- [ ] **Visual Design Integration**
    - Figma plugin support
    - Design-to-code conversion
    - UI component generation


### 14. Advanced AI Orchestration

**Priority: Medium**

- [ ] **Complex Workflow Orchestration**
    - Multi-agent coordination
    - Task dependency management
    - Error handling and recovery
- [ ] **Custom Agent Development**
    - Agent creation tools
    - Behavior customization
    - Performance tuning


### 15. Performance \& Optimization

**Priority: Low**

- [ ] **Response Time Optimization**
    - Sub-700ms latency target (TRAE.AI benchmark)[^2]
    - Caching strategies
    - Predictive loading
- [ ] **Resource Management**
    - Memory optimization
    - CPU usage monitoring
    - Battery efficiency on laptops

***

## TECHNICAL IMPLEMENTATION DETAILS

### Core Technologies

- **Frontend**: React + TypeScript with Tailwind CSS v4
- **Desktop**: Tauri 2.0 (Rust backend)
- **Editor**: CodeMirror 6 with language servers
- **AI Orchestration**: Claude Agents SDK as primary orchestrator
- **State Management**: React stores with `useSyncExternalStore`


### Security \& Privacy

- **Sandboxed Execution**: All agent commands run in controlled environment
- **Data Privacy**: Local-first approach with encrypted API communications
- **Permission System**: Granular access controls for file operations
- **Audit Trail**: Complete logging of all agent actions


### Performance Targets

- **Startup Time**: < 2 seconds cold start
- **AI Response**: < 700ms average latency
- **File Operations**: < 100ms for common operations
- **Memory Usage**: < 500MB baseline footprint


### Differentiation Strategy

Unlike VS Code forks, Rainy Aether 2 focuses on:

1. **Agent-First Design**: Built around AI collaboration from ground up
2. **Dual Mode Architecture**: Traditional and autonomous modes
3. **Multi-Provider Integration**: Not tied to single AI provider
4. **Embedded Browser**: Native web development workflow
5. **Voice Interface**: Natural language interaction

This roadmap positions Rainy Aether 2 as a next-generation IDE that combines the best features from current market leaders while establishing unique capabilities in AI-driven development workflows. The progressive rollout ensures a solid MVP launch while building toward advanced autonomous development features.