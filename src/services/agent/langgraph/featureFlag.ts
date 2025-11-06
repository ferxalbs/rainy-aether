import { loadFromStore, saveToStore } from '@/stores/app-store';

const FEATURE_FLAG_KEY = 'agent.langgraph.enabled';

export type LangGraphFeatureFlagKey = typeof FEATURE_FLAG_KEY;
let cachedValue: boolean | null = null;
let isInitialized = false;

const parseEnvFlag = (): boolean => {
  try {
    const raw = (import.meta as any)?.env?.VITE_AGENT_LANGGRAPH_ENABLED;
    if (raw === undefined || raw === null) {
      return false;
    }
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      return ['true', '1', 'yes', 'on'].includes(raw.toLowerCase());
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Initializes the LangGraph feature flag cache from persistent storage.
 */
export async function initializeLangGraphFeatureFlag(): Promise<boolean> {
  if (isInitialized && cachedValue !== null) {
    return cachedValue;
  }

  const defaultValue = parseEnvFlag();
  try {
    const stored = await loadFromStore<boolean | null>(FEATURE_FLAG_KEY, null);
    cachedValue = stored === null ? defaultValue : Boolean(stored);
  } catch (error) {
    console.warn('[LangGraphFlag] Failed to load feature flag, defaulting to env value.', error);
    cachedValue = defaultValue;
  }

  isInitialized = true;
  return cachedValue;
}

/**
 * Returns the cached LangGraph flag synchronously. Falls back to `false` if not initialized.
 */
export function isLangGraphEnabled(): boolean {
  return cachedValue ?? false;
}

/**
 * Returns the cached value without defaulting. Helpful for components that need to know the tri-state.
 */
export function getLangGraphFlagCached(): boolean | null {
  return cachedValue;
}

/**
 * Persists a new value for the LangGraph feature flag.
 */
export async function setLangGraphFeatureFlag(value: boolean): Promise<void> {
  cachedValue = value;
  isInitialized = true;
  try {
    await saveToStore(FEATURE_FLAG_KEY, value);
  } catch (error) {
    console.error('[LangGraphFlag] Failed to persist feature flag value.', error);
  }
}
