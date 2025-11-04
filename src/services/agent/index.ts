/**
 * Agent System - Central Exports
 *
 * Provides a unified interface to the entire agent system.
 */

// Services
export { CredentialService, getCredentialService } from './credentialService';
export { ProviderManager, getProviderManager } from './providerManager';
export { AgentService, getAgentService } from './agentService';

// Providers
export * from './providers';

// Types from ProviderManager
export type { ProviderStatus } from './providerManager';

// Types from AgentService
export type { SendMessageOptions, AgentServiceStats } from './agentService';

// Re-export store for convenience
export {
  agentActions,
  useAgentState,
  getAgentState,
  type AgentState,
  type AgentSession,
  type AgentConfig,
  type Message,
} from '@/stores/agentStore';

/**
 * Initialize the entire agent system
 *
 * Call this once during app initialization
 */
export async function initializeAgentSystem(): Promise<void> {
  const agentService = getAgentService();
  await agentService.initialize();
}
