/**
 * Agent Configuration Store
 *
 * Manages dual-agent system configuration, metrics, and comparison data.
 * Persists settings using Tauri store plugin.
 */

import { Store } from '@tauri-apps/plugin-store';
import * as React from 'react';
import type {
  AgentType,
  AgentSettings,
  AgentMetrics,
  AgentComparison,
  AgentProfile,
} from '@/types/agentConfig';
import { DEFAULT_AGENT_SETTINGS, AGENT_PROFILES } from '@/types/agentConfig';

// ============================================================================
// STATE
// ============================================================================

interface AgentConfigState {
  settings: AgentSettings;
  metrics: Map<string, AgentMetrics[]>; // sessionId -> metrics array
  comparisons: AgentComparison[];
  selectedAgent: AgentType;
  isInitialized: boolean;
}

let state: AgentConfigState = {
  settings: DEFAULT_AGENT_SETTINGS,
  metrics: new Map(),
  comparisons: [],
  selectedAgent: DEFAULT_AGENT_SETTINGS.defaultAgent,
  isInitialized: false,
};

// ============================================================================
// STORE PERSISTENCE
// ============================================================================

let store: Store | null = null;
const STORE_KEY_SETTINGS = 'agent.config.settings';

async function initStore(): Promise<void> {
  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    console.warn('[AgentConfigStore] Running outside Tauri, using in-memory storage');
    return;
  }

  try {
    store = await Store.load('agent-config.json');
    console.log('[AgentConfigStore] Store initialized');
  } catch (error) {
    console.error('[AgentConfigStore] Failed to initialize store:', error);
  }
}

async function loadSettings(): Promise<AgentSettings> {
  if (!store) return DEFAULT_AGENT_SETTINGS;

  try {
    const saved = await store.get<AgentSettings>(STORE_KEY_SETTINGS);
    if (saved) {
      // Merge with defaults to ensure all new fields exist
      return {
        ...DEFAULT_AGENT_SETTINGS,
        ...saved,
        agent1: { ...DEFAULT_AGENT_SETTINGS.agent1, ...saved.agent1 },
        agent2: { ...DEFAULT_AGENT_SETTINGS.agent2, ...saved.agent2 },
        agent3: { ...DEFAULT_AGENT_SETTINGS.agent3, ...saved.agent3 },
        comparison: { ...DEFAULT_AGENT_SETTINGS.comparison, ...saved.comparison },
        telemetry: { ...DEFAULT_AGENT_SETTINGS.telemetry, ...saved.telemetry },
      };
    }
  } catch (error) {
    console.error('[AgentConfigStore] Failed to load settings:', error);
  }

  return DEFAULT_AGENT_SETTINGS;
}

async function saveSettings(settings: AgentSettings): Promise<void> {
  if (!store) return;

  try {
    await store.set(STORE_KEY_SETTINGS, settings);
    await store.save();
  } catch (error) {
    console.error('[AgentConfigStore] Failed to save settings:', error);
  }
}

// ============================================================================
// SUBSCRIBERS
// ============================================================================

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

function subscribe(callback: Subscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

// ============================================================================
// GETTERS
// ============================================================================

function getState(): AgentConfigState {
  return state;
}

function getSettings(): AgentSettings {
  return state.settings;
}

function getSelectedAgent(): AgentType {
  return state.selectedAgent;
}

function getAgentProfile(agentType: AgentType): AgentProfile {
  return AGENT_PROFILES[agentType];
}

function getMetrics(sessionId: string): AgentMetrics[] {
  return state.metrics.get(sessionId) || [];
}

function getAllComparisons(): AgentComparison[] {
  return state.comparisons;
}

function getLatestComparison(): AgentComparison | null {
  return state.comparisons.length > 0
    ? state.comparisons[state.comparisons.length - 1]
    : null;
}

// ============================================================================
// ACTIONS
// ============================================================================

async function initialize(): Promise<void> {
  if (state.isInitialized) {
    console.log('[AgentConfigStore] Already initialized');
    return;
  }

  await initStore();
  state.settings = await loadSettings();
  state.selectedAgent = state.settings.defaultAgent;
  state.isInitialized = true;

  console.log('[AgentConfigStore] Initialized with agent:', state.selectedAgent);
  notifySubscribers();
}

async function updateSettings(updates: Partial<AgentSettings>): Promise<void> {
  state.settings = {
    ...state.settings,
    ...updates,
  };

  await saveSettings(state.settings);
  notifySubscribers();
}

async function setDefaultAgent(agentType: AgentType): Promise<void> {
  state.settings.defaultAgent = agentType;
  state.selectedAgent = agentType;

  await saveSettings(state.settings);
  notifySubscribers();

  console.log('[AgentConfigStore] Default agent set to:', agentType);
}

async function selectAgent(agentType: AgentType): Promise<void> {
  state.selectedAgent = agentType;
  notifySubscribers();

  console.log('[AgentConfigStore] Selected agent:', agentType);
}

async function toggleAgentEnabled(agentType: AgentType, enabled: boolean): Promise<void> {
  if (agentType === 'agent1') {
    state.settings.agent1.enabled = enabled;
  } else {
    state.settings.agent2.enabled = enabled;
  }

  await saveSettings(state.settings);
  notifySubscribers();
}

async function updateAgent1Config(config: Partial<AgentSettings['agent1']['config']>): Promise<void> {
  state.settings.agent1.config = {
    ...state.settings.agent1.config,
    ...config,
  };

  await saveSettings(state.settings);
  notifySubscribers();
}

async function updateAgent2Config(config: Partial<AgentSettings['agent2']['config']>): Promise<void> {
  state.settings.agent2.config = {
    ...state.settings.agent2.config,
    ...config,
  };

  await saveSettings(state.settings);
  notifySubscribers();
}

async function updateComparisonSettings(
  settings: Partial<AgentSettings['comparison']>
): Promise<void> {
  state.settings.comparison = {
    ...state.settings.comparison,
    ...settings,
  };

  await saveSettings(state.settings);
  notifySubscribers();
}

async function updateTelemetrySettings(
  settings: Partial<AgentSettings['telemetry']>
): Promise<void> {
  state.settings.telemetry = {
    ...state.settings.telemetry,
    ...settings,
  };

  await saveSettings(state.settings);
  notifySubscribers();
}

// ============================================================================
// METRICS
// ============================================================================

function recordMetrics(sessionId: string, metrics: AgentMetrics): void {
  const existing = state.metrics.get(sessionId) || [];
  existing.push(metrics);
  state.metrics.set(sessionId, existing);

  notifySubscribers();
}

function getAggregatedMetrics(agentType: AgentType): {
  avgLatency: number;
  avgCost: number;
  avgTokens: number;
  successRate: number;
  totalSessions: number;
} {
  const allMetrics: AgentMetrics[] = [];
  state.metrics.forEach((metrics) => {
    allMetrics.push(...metrics.filter((m) => m.agentType === agentType));
  });

  if (allMetrics.length === 0) {
    return {
      avgLatency: 0,
      avgCost: 0,
      avgTokens: 0,
      successRate: 0,
      totalSessions: 0,
    };
  }

  const total = allMetrics.length;
  const sum = allMetrics.reduce(
    (acc, m) => ({
      latency: acc.latency + m.latency.totalResponse,
      cost: acc.cost + m.cost,
      tokens: acc.tokens + m.tokens.total,
      success: acc.success + m.successRate,
    }),
    { latency: 0, cost: 0, tokens: 0, success: 0 }
  );

  return {
    avgLatency: sum.latency / total,
    avgCost: sum.cost / total,
    avgTokens: sum.tokens / total,
    successRate: sum.success / total,
    totalSessions: new Set(allMetrics.map((m) => m.sessionId)).size,
  };
}

function clearMetrics(sessionId?: string): void {
  if (sessionId) {
    state.metrics.delete(sessionId);
  } else {
    state.metrics.clear();
  }

  notifySubscribers();
}

// ============================================================================
// COMPARISONS
// ============================================================================

function recordComparison(comparison: AgentComparison): void {
  state.comparisons.push(comparison);

  // Keep only last 100 comparisons
  if (state.comparisons.length > 100) {
    state.comparisons = state.comparisons.slice(-100);
  }

  notifySubscribers();
}

function getComparisonStats(): {
  agent1Wins: number;
  agent2Wins: number;
  ties: number;
  total: number;
} {
  const stats = {
    agent1Wins: 0,
    agent2Wins: 0,
    ties: 0,
    total: state.comparisons.length,
  };

  state.comparisons.forEach((comp) => {
    if (comp.comparison.winner === 'agent1') {
      stats.agent1Wins++;
    } else if (comp.comparison.winner === 'agent2') {
      stats.agent2Wins++;
    } else {
      stats.ties++;
    }
  });

  return stats;
}

function clearComparisons(): void {
  state.comparisons = [];
  notifySubscribers();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const agentConfigStore = {
  subscribe,
  getState,
  getSettings,
  getSelectedAgent,
  getAgentProfile,
  getMetrics,
  getAllComparisons,
  getLatestComparison,
  getAggregatedMetrics,
  getComparisonStats,
};

export const agentConfigActions = {
  initialize,
  updateSettings,
  setDefaultAgent,
  selectAgent,
  toggleAgentEnabled,
  updateAgent1Config,
  updateAgent2Config,
  updateComparisonSettings,
  updateTelemetrySettings,
  recordMetrics,
  clearMetrics,
  recordComparison,
  clearComparisons,
};

// ============================================================================
// REACT HOOKS
// ============================================================================

export function useAgentConfig() {
  const [, forceUpdate] = React.useState({});

  React.useEffect(() => {
    return agentConfigStore.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return agentConfigStore.getState();
}

export function useAgentSettings() {
  const [, forceUpdate] = React.useState({});

  React.useEffect(() => {
    return agentConfigStore.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return agentConfigStore.getSettings();
}

export function useSelectedAgent() {
  const [, forceUpdate] = React.useState({});

  React.useEffect(() => {
    return agentConfigStore.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return agentConfigStore.getSelectedAgent();
}
