/**
 * Agent Integration Module
 *
 * Provides integration between the new Rainy Agents system and
 * the existing UI/store infrastructure.
 *
 * @example
 * ```typescript
 * import { sessionBridge } from '@/services/agentIntegration';
 *
 * // Initialize
 * await sessionBridge.initialize();
 *
 * // Create session and send message
 * const sessionId = await sessionBridge.createSession({
 *   name: 'My Session',
 *   providerId: 'groq',
 *   modelId: 'llama-3.3-70b-versatile',
 * });
 *
 * const result = await sessionBridge.sendMessage({
 *   sessionId,
 *   message: 'Hello!',
 * });
 * ```
 */

export { sessionBridge, AgentSessionBridge } from './sessionBridge';
export type {
  CreateSessionParams,
  SendMessageParams,
  SessionMetadata,
} from './sessionBridge';
