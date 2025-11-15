/**
 * Agent Configuration Types
 *
 * Defines the configuration structure for dual-agent system:
 * - Agent 1: Custom implementation (AI SDK-based)
 * - Agent 2: LangGraph-based (ReAct agents)
 */

export type AgentType = 'agent1' | 'agent2' | 'agent3';

export interface AgentProfile {
  id: AgentType;
  name: string;
  description: string;
  version: string;
  status: 'stable' | 'beta' | 'experimental';
  features: {
    streaming: boolean;
    tools: boolean;
    memory: boolean;
    multiTurn: boolean;
    parallelTools: boolean;
    reasoning: boolean;
    humanInLoop: boolean;
  };
  pros: string[];
  cons: string[];
  bestFor: string[];
}

export interface AgentSettings {
  // Global agent selection
  defaultAgent: AgentType;

  // Agent 1 (Custom) Settings
  agent1: {
    enabled: boolean;
    config: {
      maxRetries: number;
      timeout: number;
      streamBufferSize: number;
      toolExecutionMode: 'sequential' | 'parallel';
      costTracking: boolean;
      debugLogging: boolean;
    };
  };

  // Agent 2 (LangGraph) Settings
  agent2: {
    enabled: boolean;
    config: {
      // Core LangGraph settings
      checkpointing: boolean;
      checkpointStorage: 'memory' | 'postgres' | 'redis';
      streamMode: 'values' | 'updates' | 'messages' | 'debug';

      // ReAct Agent settings
      maxIterations: number;
      agentType: 'react' | 'plan-execute' | 'reflection';
      reasoningVerbosity: 'minimal' | 'normal' | 'verbose';

      // Tool execution
      toolTimeout: number;
      maxParallelTools: number;
      toolRetryStrategy: 'none' | 'exponential' | 'linear';

      // Performance
      cacheEnabled: boolean;
      cacheTTL: number;
      batchSize: number;

      // Advanced
      interruptBefore: string[]; // Node names to interrupt before
      interruptAfter: string[];  // Node names to interrupt after
      customEvents: boolean;
      telemetry: boolean;

      // Experimental
      multiAgent: boolean;
      hierarchicalAgents: boolean;
      selfCorrection: boolean;
      planningDepth: number;
    };
  };

  // Agent 3 (Rust Core) Settings
  agent3: {
    enabled: boolean;
    config: {
      // Core Rust settings
      maxIterations: number;
      toolTimeout: number;
      parallelTools: boolean;
      maxConcurrentTools: number;

      // Temperature and token limits
      temperature: number;
      maxTokens: number;

      // Rate limiting
      rateLimitEnabled: boolean;
      maxRequestsPerMinute: number;

      // Memory management
      maxMemoryTokens: number;
      memoryPruningEnabled: boolean;

      // Performance
      inferenceTimeout: number;
      cacheEnabled: boolean;

      // Metrics and telemetry
      metricsEnabled: boolean;
      debugLogging: boolean;
    };
  };

  // Comparison & Testing
  comparison: {
    enabled: boolean;
    mode: 'side-by-side' | 'sequential' | 'automatic';
    metricsTracking: boolean;
    autoSwitch: boolean; // Switch to better performing agent
    autoSwitchThreshold: number; // Performance difference threshold
  };

  // Telemetry & Analytics
  telemetry: {
    enabled: boolean;
    collectMetrics: boolean;
    sendAnalytics: boolean;
    metricsEndpoint?: string;
  };
}

export interface AgentMetrics {
  agentType: AgentType;
  sessionId: string;

  // Performance
  latency: {
    firstToken: number;
    totalResponse: number;
    toolExecution: number;
  };

  // Usage
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };

  cost: number;

  // Quality
  successRate: number;
  errorRate: number;
  toolSuccessRate: number;

  // User experience
  streamingQuality: number; // 0-100
  responseQuality: number;  // 0-100 (user rating)

  // Timestamp
  timestamp: number;
}

export interface AgentComparison {
  sessionId: string;
  prompt: string;

  agent1Result: {
    response: string;
    metrics: AgentMetrics;
    success: boolean;
    error?: string;
  };

  agent2Result: {
    response: string;
    metrics: AgentMetrics;
    success: boolean;
    error?: string;
  };

  comparison: {
    winner: AgentType | 'tie';
    latencyDiff: number;
    costDiff: number;
    qualityDiff: number;
    recommendation: string;
  };

  timestamp: number;
}

// Default agent profiles
export const AGENT_PROFILES: Record<AgentType, AgentProfile> = {
  agent1: {
    id: 'agent1',
    name: 'Agent 1 (Custom)',
    description: 'Custom-built agent with AI SDK foundation. Optimized for speed and simplicity.',
    version: '1.0.0',
    status: 'stable',
    features: {
      streaming: true,
      tools: true,
      memory: false,
      multiTurn: false,
      parallelTools: true,
      reasoning: false,
      humanInLoop: false,
    },
    pros: [
      'Fast and lightweight',
      'Simple architecture',
      'Proven stability',
      'Direct provider integration',
      'Lower latency',
    ],
    cons: [
      'No conversation memory',
      'Limited reasoning capabilities',
      'No multi-agent support',
      'Manual state management',
      'Limited extensibility',
    ],
    bestFor: [
      'Quick responses',
      'Simple queries',
      'Single-turn interactions',
      'Performance-critical scenarios',
      'Minimal complexity requirements',
    ],
  },

  agent2: {
    id: 'agent2',
    name: 'Agent 2 (LangGraph)',
    description: 'Advanced ReAct agent powered by LangGraph. Built for complex reasoning and multi-agent workflows.',
    version: '1.0.0',
    status: 'beta',
    features: {
      streaming: true,
      tools: true,
      memory: true,
      multiTurn: true,
      parallelTools: true,
      reasoning: true,
      humanInLoop: true,
    },
    pros: [
      'Conversation memory (checkpointing)',
      'ReAct reasoning pattern',
      'Multi-agent orchestration ready',
      'Advanced tool execution',
      'Human-in-the-loop support',
      'Plan-and-execute patterns',
      'Self-correction capabilities',
      'Extensible architecture',
    ],
    cons: [
      'Slightly higher latency',
      'More complex architecture',
      'Larger memory footprint',
      'Beta status',
      'Requires Node.js polyfills in browser',
    ],
    bestFor: [
      'Complex multi-step tasks',
      'Conversational interactions',
      'Tool-heavy workflows',
      'Research and analysis',
      'Autonomous development',
      'Multi-agent scenarios',
    ],
  },

  agent3: {
    id: 'agent3',
    name: 'Agent 3 (Rust Core)',
    description: 'High-performance Rust-powered agent core. Native execution, blazing fast inference, and robust tool orchestration.',
    version: '1.0.0',
    status: 'experimental',
    features: {
      streaming: true,
      tools: true,
      memory: true,
      multiTurn: true,
      parallelTools: true,
      reasoning: false,
      humanInLoop: false,
    },
    pros: [
      'Blazing fast performance (Rust native)',
      'Low memory footprint',
      'Parallel tool execution',
      'Rate limiting built-in',
      'Metrics and telemetry',
      'Conversation memory',
      'Production-grade error handling',
      'Cross-platform compatibility',
    ],
    cons: [
      'Experimental status',
      'Limited reasoning (no ReAct pattern)',
      'No human-in-the-loop',
      'Requires Tauri backend',
      'Less flexible than TypeScript agents',
    ],
    bestFor: [
      'Maximum performance requirements',
      'Resource-constrained environments',
      'Production workloads',
      'High-throughput scenarios',
      'Native desktop integration',
      'When latency is critical (<200ms)',
    ],
  },
};

// Default settings
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  defaultAgent: 'agent1', // Start with stable agent

  agent1: {
    enabled: true,
    config: {
      maxRetries: 3,
      timeout: 30000,
      streamBufferSize: 1024,
      toolExecutionMode: 'sequential',
      costTracking: true,
      debugLogging: false,
    },
  },

  agent2: {
    enabled: true,
    config: {
      checkpointing: true,
      checkpointStorage: 'memory',
      streamMode: 'values',

      maxIterations: 10,
      agentType: 'react',
      reasoningVerbosity: 'normal',

      toolTimeout: 30000,
      maxParallelTools: 3,
      toolRetryStrategy: 'exponential',

      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      batchSize: 1,

      interruptBefore: [],
      interruptAfter: [],
      customEvents: true,
      telemetry: true,

      multiAgent: false,
      hierarchicalAgents: false,
      selfCorrection: false,
      planningDepth: 3,
    },
  },

  agent3: {
    enabled: true,
    config: {
      maxIterations: 10,
      toolTimeout: 30000,
      parallelTools: true,
      maxConcurrentTools: 10,

      temperature: 0.7,
      maxTokens: 4096,

      rateLimitEnabled: true,
      maxRequestsPerMinute: 100,

      maxMemoryTokens: 100000,
      memoryPruningEnabled: true,

      inferenceTimeout: 60000,
      cacheEnabled: true,

      metricsEnabled: true,
      debugLogging: false,
    },
  },

  comparison: {
    enabled: false,
    mode: 'side-by-side',
    metricsTracking: true,
    autoSwitch: false,
    autoSwitchThreshold: 0.2, // 20% performance difference
  },

  telemetry: {
    enabled: true,
    collectMetrics: true,
    sendAnalytics: false,
    metricsEndpoint: undefined,
  },
};
