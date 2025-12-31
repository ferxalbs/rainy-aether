/**
 * Shared Types for Rainy Brain Network
 * 
 * Defines the network state structure for cross-agent memory,
 * file caching, and execution planning.
 */

// ===========================
// File Cache Types
// ===========================

export interface CachedFile {
    content: string;
    timestamp: number;
    lineCount: number;
    size: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
}

// ===========================
// Execution Plan Types
// ===========================

export interface ExecutionStep {
    agent: string;
    action: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
    result?: unknown;
}

export interface ExecutionPlan {
    steps: ExecutionStep[];
    currentIndex: number;
    totalSteps: number;
    startedAt: number;
    completedAt?: number;
}

// ===========================
// Context Types
// ===========================

export interface WorkspaceContext {
    path: string;
    name: string;
    projectType: 'npm' | 'cargo' | 'python' | 'unknown';
    entryPoints: string[];
    configFiles: string[];
}

export interface TaskContext {
    workspace: string;
    currentFile?: string;
    relevantFiles: string[];
    selectedCode?: string;
    previousOutput?: string;
}

// ===========================
// Network State Type
// ===========================

/**
 * The complete state shared across all agents in the network.
 * Accessed via `network.state.data` in agents and tools.
 */
export interface NetworkState {
    // File cache to avoid redundant disk reads
    fileCache: Record<string, CachedFile>;
    fileCacheStats: CacheStats;

    // Symbol cache for code navigation
    symbolCache: Record<string, {
        symbols: string[];
        timestamp: number;
    }>;

    // Current task context
    context: TaskContext;

    // Workspace information (cached on first access)
    workspaceInfo?: WorkspaceContext;

    // Execution planning
    plan?: ExecutionPlan;

    // Agent coordination
    lastAgent?: string;
    lastAgentOutput?: string;
    handoffReason?: string;

    // Progress tracking
    iteration: number;
    maxIterations: number;

    // Flags for state-based routing
    flags: {
        contextLoaded: boolean;
        planGenerated: boolean;
        taskCompleted: boolean;
        needsUserInput: boolean;
    };

    // Custom data for agent-specific state
    custom: Record<string, unknown>;
}

// ===========================
// Network State Defaults
// ===========================

export function createDefaultNetworkState(workspace: string): NetworkState {
    return {
        fileCache: {},
        fileCacheStats: { hits: 0, misses: 0, evictions: 0 },
        symbolCache: {},
        context: {
            workspace,
            relevantFiles: [],
        },
        iteration: 0,
        maxIterations: 30,
        flags: {
            contextLoaded: false,
            planGenerated: false,
            taskCompleted: false,
            needsUserInput: false,
        },
        custom: {},
    };
}

// ===========================
// Cache Configuration
// ===========================

export const CACHE_CONFIG = {
    // How long cached files remain valid (30 seconds)
    FILE_TTL_MS: 30000,

    // Maximum files to keep in cache
    MAX_CACHED_FILES: 50,

    // Maximum size of a single cached file (100KB)
    MAX_FILE_SIZE: 100 * 1024,

    // Symbol cache TTL (60 seconds)
    SYMBOL_TTL_MS: 60000,
};

// ===========================
// Helper Types for Tools
// ===========================

export interface ToolNetworkContext {
    state: {
        data: NetworkState;
        kv: Map<string, unknown>;
    };
}

/**
 * Check if a cached entry is still valid
 */
export function isCacheValid(timestamp: number, ttlMs: number): boolean {
    return Date.now() - timestamp < ttlMs;
}

/**
 * Get a file from cache if valid, or undefined
 */
export function getCachedFile(
    state: NetworkState,
    path: string
): CachedFile | undefined {
    const cached = state.fileCache[path];
    if (cached && isCacheValid(cached.timestamp, CACHE_CONFIG.FILE_TTL_MS)) {
        state.fileCacheStats.hits++;
        return cached;
    }
    if (cached) {
        // Expired, remove it
        delete state.fileCache[path];
        state.fileCacheStats.evictions++;
    }
    state.fileCacheStats.misses++;
    return undefined;
}

/**
 * Store a file in the cache
 */
export function setCachedFile(
    state: NetworkState,
    path: string,
    content: string
): void {
    // Check size limit
    if (content.length > CACHE_CONFIG.MAX_FILE_SIZE) {
        console.log(`[FileCache] Skipping ${path} - exceeds size limit`);
        return;
    }

    // Evict oldest if at capacity
    const keys = Object.keys(state.fileCache);
    if (keys.length >= CACHE_CONFIG.MAX_CACHED_FILES) {
        let oldest = keys[0];
        let oldestTime = state.fileCache[oldest].timestamp;

        for (const key of keys) {
            if (state.fileCache[key].timestamp < oldestTime) {
                oldest = key;
                oldestTime = state.fileCache[key].timestamp;
            }
        }

        delete state.fileCache[oldest];
        state.fileCacheStats.evictions++;
        console.log(`[FileCache] Evicted ${oldest}`);
    }

    state.fileCache[path] = {
        content,
        timestamp: Date.now(),
        lineCount: content.split('\n').length,
        size: content.length,
    };
}

/**
 * Invalidate a cached file (call after writes)
 */
export function invalidateCachedFile(state: NetworkState, path: string): void {
    if (state.fileCache[path]) {
        delete state.fileCache[path];
        console.log(`[FileCache] Invalidated ${path}`);
    }
}

/**
 * Invalidate all cached files in a directory
 */
export function invalidateDirectory(state: NetworkState, dirPath: string): void {
    const prefix = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
    let count = 0;

    for (const path of Object.keys(state.fileCache)) {
        if (path.startsWith(prefix) || path === dirPath) {
            delete state.fileCache[path];
            count++;
        }
    }

    if (count > 0) {
        console.log(`[FileCache] Invalidated ${count} files in ${dirPath}`);
    }
}
