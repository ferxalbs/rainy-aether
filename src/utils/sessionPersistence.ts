/**
 * Session Persistence Utilities
 *
 * Utilities for persisting agent sessions to localStorage and restoring them
 * on page reload. Includes compression, versioning, and migration support.
 *
 * Features:
 * - Save/restore sessions to localStorage
 * - Automatic compression for large sessions
 * - Version management for schema migrations
 * - TTL (time-to-live) for auto-cleanup
 * - Storage quota management
 *
 * @example
 * ```typescript
 * import { saveSession, restoreSession } from '@/utils/sessionPersistence';
 *
 * // Save session
 * saveSession('session-123', {
 *   messages: [...],
 *   agentId: 'rainy',
 *   metadata: { ... }
 * });
 *
 * // Restore session
 * const session = restoreSession('session-123');
 * ```
 */

/**
 * Session data structure
 */
export interface SessionData {
  /** Session ID */
  id: string;

  /** Agent ID */
  agentId: string;

  /** Conversation messages */
  messages: any[];

  /** Session metadata */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    title?: string;
    tags?: string[];
  };

  /** Agent configuration at time of session */
  agentConfig?: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };

  /** Session statistics */
  stats?: {
    messageCount: number;
    totalTokens: number;
    totalCost: number;
  };
}

/**
 * Persisted session structure (what's actually stored)
 */
interface PersistedSession {
  /** Schema version for migrations */
  version: number;

  /** Session data */
  data: SessionData;

  /** Expiry timestamp (TTL) */
  expiresAt?: number;

  /** Compressed flag */
  compressed: boolean;
}

/**
 * Storage configuration
 */
const STORAGE_CONFIG = {
  /** Storage key prefix */
  prefix: 'rainy_session_',

  /** Current schema version */
  version: 1,

  /** Default TTL: 7 days */
  defaultTTL: 7 * 24 * 60 * 60 * 1000,

  /** Max sessions to keep */
  maxSessions: 50,

  /** Compression threshold (bytes) */
  compressionThreshold: 10 * 1024, // 10KB
};

/**
 * Save session to localStorage
 *
 * @param sessionId - Unique session identifier
 * @param data - Session data to save
 * @param ttl - Time to live in milliseconds (optional)
 */
export function saveSession(
  sessionId: string,
  data: SessionData,
  ttl: number = STORAGE_CONFIG.defaultTTL
): boolean {
  try {
    const key = `${STORAGE_CONFIG.prefix}${sessionId}`;

    // Create persisted session object
    const persistedSession: PersistedSession = {
      version: STORAGE_CONFIG.version,
      data,
      expiresAt: Date.now() + ttl,
      compressed: false,
    };

    // Serialize
    let serialized = JSON.stringify(persistedSession);

    // Compress if over threshold (simple base64 encoding for now)
    if (serialized.length > STORAGE_CONFIG.compressionThreshold) {
      serialized = btoa(serialized);
      persistedSession.compressed = true;
    }

    // Save to localStorage
    localStorage.setItem(key, serialized);

    // Update session index
    updateSessionIndex(sessionId);

    // Cleanup old sessions if needed
    cleanupOldSessions();

    console.log(`✅ Session saved: ${sessionId} (${(serialized.length / 1024).toFixed(2)}KB)`);
    return true;
  } catch (error) {
    console.error('❌ Failed to save session:', error);

    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('⚠️ Storage quota exceeded. Cleaning up old sessions...');
      cleanupOldSessions(true); // Aggressive cleanup
      return false;
    }

    return false;
  }
}

/**
 * Restore session from localStorage
 *
 * @param sessionId - Session identifier to restore
 * @returns Session data or null if not found/expired
 */
export function restoreSession(sessionId: string): SessionData | null {
  try {
    const key = `${STORAGE_CONFIG.prefix}${sessionId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    // Parse (handle compression)
    let persistedSession: PersistedSession;

    try {
      // Try direct parse first
      persistedSession = JSON.parse(stored);
    } catch {
      // If that fails, try decompressing
      const decompressed = atob(stored);
      persistedSession = JSON.parse(decompressed);
    }

    // Check expiry
    if (persistedSession.expiresAt && Date.now() > persistedSession.expiresAt) {
      console.log(`⏰ Session expired: ${sessionId}`);
      deleteSession(sessionId);
      return null;
    }

    // Handle version migrations
    if (persistedSession.version !== STORAGE_CONFIG.version) {
      persistedSession = migrateSession(persistedSession);
    }

    // Convert date strings back to Date objects
    const data = persistedSession.data;
    if (data.metadata.createdAt) {
      data.metadata.createdAt = new Date(data.metadata.createdAt);
    }
    if (data.metadata.updatedAt) {
      data.metadata.updatedAt = new Date(data.metadata.updatedAt);
    }

    console.log(`✅ Session restored: ${sessionId} (${data.messages.length} messages)`);
    return data;
  } catch (error) {
    console.error('❌ Failed to restore session:', error);
    return null;
  }
}

/**
 * Delete session from localStorage
 *
 * @param sessionId - Session to delete
 */
export function deleteSession(sessionId: string): boolean {
  try {
    const key = `${STORAGE_CONFIG.prefix}${sessionId}`;
    localStorage.removeItem(key);

    // Update index
    const index = getSessionIndex();
    const updated = index.filter((id) => id !== sessionId);
    localStorage.setItem(`${STORAGE_CONFIG.prefix}index`, JSON.stringify(updated));

    console.log(`🗑️ Session deleted: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete session:', error);
    return false;
  }
}

/**
 * List all saved sessions
 *
 * @returns Array of session IDs
 */
export function listSessions(): string[] {
  return getSessionIndex();
}

/**
 * Get session metadata without loading full session
 *
 * @param sessionId - Session ID
 * @returns Session metadata or null
 */
export function getSessionMetadata(sessionId: string): SessionData['metadata'] | null {
  try {
    const session = restoreSession(sessionId);
    return session?.metadata || null;
  } catch {
    return null;
  }
}

/**
 * Clear all sessions
 */
export function clearAllSessions(): boolean {
  try {
    const index = getSessionIndex();

    for (const sessionId of index) {
      deleteSession(sessionId);
    }

    localStorage.removeItem(`${STORAGE_CONFIG.prefix}index`);
    console.log('🗑️ All sessions cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear sessions:', error);
    return false;
  }
}

/**
 * Get storage usage statistics
 *
 * @returns Storage stats
 */
export function getStorageStats(): {
  totalSessions: number;
  totalSize: number;
  averageSize: number;
  oldestSession: Date | null;
  newestSession: Date | null;
} {
  const index = getSessionIndex();
  let totalSize = 0;
  let oldestSession: Date | null = null;
  let newestSession: Date | null = null;

  for (const sessionId of index) {
    const key = `${STORAGE_CONFIG.prefix}${sessionId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      totalSize += stored.length;

      const metadata = getSessionMetadata(sessionId);
      if (metadata?.createdAt) {
        if (!oldestSession || metadata.createdAt < oldestSession) {
          oldestSession = metadata.createdAt;
        }
        if (!newestSession || metadata.createdAt > newestSession) {
          newestSession = metadata.createdAt;
        }
      }
    }
  }

  return {
    totalSessions: index.length,
    totalSize,
    averageSize: index.length > 0 ? totalSize / index.length : 0,
    oldestSession,
    newestSession,
  };
}

/**
 * Internal: Get session index
 */
function getSessionIndex(): string[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_CONFIG.prefix}index`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Internal: Update session index
 */
function updateSessionIndex(sessionId: string): void {
  const index = getSessionIndex();

  if (!index.includes(sessionId)) {
    index.push(sessionId);
    localStorage.setItem(`${STORAGE_CONFIG.prefix}index`, JSON.stringify(index));
  }
}

/**
 * Internal: Cleanup old sessions
 */
function cleanupOldSessions(aggressive = false): void {
  const index = getSessionIndex();

  // Sort by creation date (oldest first)
  const sessions = index
    .map((id) => ({
      id,
      metadata: getSessionMetadata(id),
    }))
    .filter((s) => s.metadata !== null)
    .sort((a, b) => {
      const aDate = a.metadata!.createdAt.getTime();
      const bDate = b.metadata!.createdAt.getTime();
      return aDate - bDate;
    });

  // Determine how many to keep
  const keepCount = aggressive
    ? Math.floor(STORAGE_CONFIG.maxSessions / 2)
    : STORAGE_CONFIG.maxSessions;

  // Delete oldest if over limit
  if (sessions.length > keepCount) {
    const toDelete = sessions.slice(0, sessions.length - keepCount);
    for (const session of toDelete) {
      deleteSession(session.id);
    }
    console.log(`🧹 Cleaned up ${toDelete.length} old sessions`);
  }
}

/**
 * Internal: Migrate session to current version
 */
function migrateSession(session: PersistedSession): PersistedSession {
  console.log(`🔄 Migrating session from v${session.version} to v${STORAGE_CONFIG.version}`);

  // Add migration logic here as schema evolves
  // For now, just update version
  session.version = STORAGE_CONFIG.version;

  return session;
}

/**
 * Export session to JSON file
 *
 * @param sessionId - Session to export
 * @returns JSON string or null
 */
export function exportSession(sessionId: string): string | null {
  const session = restoreSession(sessionId);
  if (!session) return null;

  return JSON.stringify(session, null, 2);
}

/**
 * Import session from JSON string
 *
 * @param json - JSON string
 * @param newSessionId - Optional new session ID
 * @returns Success boolean
 */
export function importSession(json: string, newSessionId?: string): boolean {
  try {
    const data: SessionData = JSON.parse(json);

    // Generate new ID if not provided
    const sessionId = newSessionId || `imported_${Date.now()}`;

    // Save imported session
    return saveSession(sessionId, data);
  } catch (error) {
    console.error('❌ Failed to import session:', error);
    return false;
  }
}
