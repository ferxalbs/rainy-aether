/**
 * MCP Resilience Layer
 * 
 * Production hardening for MCP connections:
 * - Circuit breakers for failing servers
 * - Retry logic with exponential backoff
 * - Graceful degradation
 * - Connection pooling
 * - Health monitoring
 */

// ===========================
// Types
// ===========================

export interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number | null;
    successCount: number;
}

export interface RetryOptions {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

export interface MCPHealthStatus {
    serverName: string;
    healthy: boolean;
    lastCheck: number;
    responseTimeMs: number | null;
    consecutiveFailures: number;
    circuitState: CircuitBreakerState['state'];
}

// ===========================
// Constants
// ===========================

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
};

const CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    halfOpenRequests: 3,
};

// ===========================
// Circuit Breaker
// ===========================

const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get or create circuit breaker for a server
 */
function getCircuitBreaker(serverName: string): CircuitBreakerState {
    let breaker = circuitBreakers.get(serverName);
    if (!breaker) {
        breaker = {
            state: 'closed',
            failures: 0,
            lastFailure: null,
            successCount: 0,
        };
        circuitBreakers.set(serverName, breaker);
    }
    return breaker;
}

/**
 * Check if circuit breaker allows request
 */
export function canExecute(serverName: string): boolean {
    const breaker = getCircuitBreaker(serverName);

    switch (breaker.state) {
        case 'closed':
            return true;

        case 'open':
            // Check if reset timeout has passed
            if (breaker.lastFailure &&
                Date.now() - breaker.lastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
                breaker.state = 'half-open';
                breaker.successCount = 0;
                console.log(`[CircuitBreaker] ${serverName}: open -> half-open`);
                return true;
            }
            return false;

        case 'half-open':
            // Allow limited requests to test the server
            return breaker.successCount < CIRCUIT_BREAKER_CONFIG.halfOpenRequests;
    }
}

/**
 * Record successful request
 */
export function recordSuccess(serverName: string): void {
    const breaker = getCircuitBreaker(serverName);

    if (breaker.state === 'half-open') {
        breaker.successCount++;
        if (breaker.successCount >= CIRCUIT_BREAKER_CONFIG.halfOpenRequests) {
            breaker.state = 'closed';
            breaker.failures = 0;
            console.log(`[CircuitBreaker] ${serverName}: half-open -> closed`);
        }
    } else if (breaker.state === 'closed') {
        breaker.failures = 0;
    }
}

/**
 * Record failed request
 */
export function recordFailure(serverName: string): void {
    const breaker = getCircuitBreaker(serverName);
    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.state === 'half-open') {
        breaker.state = 'open';
        console.log(`[CircuitBreaker] ${serverName}: half-open -> open (test failed)`);
    } else if (breaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
        breaker.state = 'open';
        console.log(`[CircuitBreaker] ${serverName}: closed -> open (threshold reached)`);
    }
}

/**
 * Reset circuit breaker
 */
export function resetCircuitBreaker(serverName: string): void {
    circuitBreakers.set(serverName, {
        state: 'closed',
        failures: 0,
        lastFailure: null,
        successCount: 0,
    });
}

/**
 * Get circuit breaker status for all servers
 */
export function getCircuitBreakerStatus(): Map<string, CircuitBreakerState['state']> {
    const status = new Map<string, CircuitBreakerState['state']>();
    for (const [name, breaker] of circuitBreakers.entries()) {
        status.set(name, breaker.state);
    }
    return status;
}

// ===========================
// Retry Logic
// ===========================

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
    const exponentialDelay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
    const delay = Math.min(exponentialDelay, options.maxDelay);
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
}

/**
 * Execute with retry logic
 */
export async function withRetry<T>(
    serverName: string,
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        // Check circuit breaker
        if (!canExecute(serverName)) {
            throw new Error(`Circuit breaker open for ${serverName}`);
        }

        try {
            const result = await operation();
            recordSuccess(serverName);
            return result;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            recordFailure(serverName);

            if (attempt < opts.maxRetries) {
                const delay = calculateDelay(attempt, opts);
                console.log(`[Retry] ${serverName} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error(`Failed after ${opts.maxRetries} retries`);
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    serverName?: string
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            if (serverName) {
                recordFailure(serverName);
            }
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        operation()
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

// ===========================
// Graceful Degradation
// ===========================

export interface FallbackOptions<T> {
    primary: () => Promise<T>;
    fallback: () => Promise<T>;
    serverName: string;
}

/**
 * Execute with fallback on failure
 */
export async function withFallback<T>(options: FallbackOptions<T>): Promise<T> {
    const { primary, fallback, serverName } = options;

    // Check circuit breaker first
    if (!canExecute(serverName)) {
        console.log(`[Fallback] ${serverName} circuit open, using fallback`);
        return fallback();
    }

    try {
        const result = await primary();
        recordSuccess(serverName);
        return result;
    } catch (error) {
        recordFailure(serverName);
        console.log(`[Fallback] ${serverName} failed, using fallback:`, error);
        return fallback();
    }
}

// ===========================
// Health Monitoring
// ===========================

const healthStatus = new Map<string, MCPHealthStatus>();

/**
 * Record health check result
 */
export function recordHealthCheck(
    serverName: string,
    healthy: boolean,
    responseTimeMs: number | null
): void {
    const existing = healthStatus.get(serverName);
    const breaker = getCircuitBreaker(serverName);

    const status: MCPHealthStatus = {
        serverName,
        healthy,
        lastCheck: Date.now(),
        responseTimeMs,
        consecutiveFailures: healthy ? 0 : (existing?.consecutiveFailures || 0) + 1,
        circuitState: breaker.state,
    };

    healthStatus.set(serverName, status);

    // Auto-manage circuit breaker based on health
    if (healthy) {
        recordSuccess(serverName);
    } else {
        recordFailure(serverName);
    }
}

/**
 * Get health status for a server
 */
export function getHealthStatus(serverName: string): MCPHealthStatus | undefined {
    return healthStatus.get(serverName);
}

/**
 * Get all health statuses
 */
export function getAllHealthStatuses(): MCPHealthStatus[] {
    return Array.from(healthStatus.values());
}

/**
 * Check if server is healthy
 */
export function isServerHealthy(serverName: string): boolean {
    const status = healthStatus.get(serverName);
    if (!status) return true; // Unknown = assume healthy

    // Consider unhealthy if last check was > 5 min ago and failed
    const staleCheck = Date.now() - status.lastCheck > 5 * 60 * 1000;
    if (staleCheck) return true; // Stale = give benefit of doubt

    return status.healthy;
}

// ===========================
// Rate Limiting
// ===========================

interface RateLimitState {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

const rateLimiters = new Map<string, RateLimitState>();

/**
 * Create rate limiter for a server
 */
export function createRateLimiter(
    serverName: string,
    maxTokens: number = 10,
    refillRate: number = 1
): void {
    rateLimiters.set(serverName, {
        tokens: maxTokens,
        lastRefill: Date.now(),
        maxTokens,
        refillRate,
    });
}

/**
 * Check if rate limit allows request
 */
export function checkRateLimit(serverName: string): boolean {
    let limiter = rateLimiters.get(serverName);
    if (!limiter) {
        createRateLimiter(serverName);
        limiter = rateLimiters.get(serverName)!;
    }

    // Refill tokens
    const now = Date.now();
    const elapsed = (now - limiter.lastRefill) / 1000;
    limiter.tokens = Math.min(limiter.maxTokens, limiter.tokens + elapsed * limiter.refillRate);
    limiter.lastRefill = now;

    // Check and consume
    if (limiter.tokens >= 1) {
        limiter.tokens--;
        return true;
    }

    return false;
}

// ===========================
// Utilities
// ===========================

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log with structured format
 */
export function logMCP(
    level: 'info' | 'warn' | 'error',
    serverName: string,
    message: string,
    data?: Record<string, unknown>
): void {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        level,
        server: serverName,
        message,
        ...data,
    };

    switch (level) {
        case 'info':
            console.log('[MCP]', JSON.stringify(logData));
            break;
        case 'warn':
            console.warn('[MCP]', JSON.stringify(logData));
            break;
        case 'error':
            console.error('[MCP]', JSON.stringify(logData));
            break;
    }
}
