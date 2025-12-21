/**
 * Retry Utilities for Agent API
 * 
 * Provides exponential backoff, circuit breaker, and timeout handling
 * for resilient API calls.
 */

// ===========================
// Utility Functions
// ===========================

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add jitter to a delay to prevent thundering herd
 */
export function addJitter(delay: number, jitterFactor: number = 0.2): number {
    const jitter = delay * jitterFactor * Math.random();
    return Math.floor(delay + jitter);
}

// ===========================
// Retry Configuration
// ===========================

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Base delay in milliseconds (default: 1000) */
    baseDelayMs: number;
    /** Maximum delay cap in milliseconds (default: 30000) */
    maxDelayMs: number;
    /** Error types that should trigger a retry */
    retryableErrors: string[];
    /** Callback for logging retry attempts */
    onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableErrors: [
        'TIMEOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'NETWORK',
        'FETCH_FAILED',
        'Load failed',
        'timed out',
        'aborted',
        'rate limit',
        '429',
        '500',
        '502',
        '503',
        '504',
    ],
};

// ===========================
// Error Classification
// ===========================

/**
 * Check if an error is retryable based on configured patterns
 */
export function isRetryableError(error: Error, patterns: string[]): boolean {
    const errorString = error.message.toLowerCase() + (error.name?.toLowerCase() || '');

    return patterns.some(pattern =>
        errorString.includes(pattern.toLowerCase())
    );
}

/**
 * Extract error details for logging
 */
export function getErrorDetails(error: unknown): { message: string; code?: string } {
    if (error instanceof Error) {
        return {
            message: error.message,
            code: (error as any).code || (error as any).status?.toString(),
        };
    }
    return { message: String(error) };
}

// ===========================
// Exponential Backoff Retry
// ===========================

/**
 * Wrap an async function with retry logic using exponential backoff
 * 
 * @param fn - The async function to wrap
 * @param options - Retry configuration
 * @returns The result of the function, or throws after all retries exhausted
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if we've exhausted retries
            if (attempt >= config.maxRetries) {
                console.error(`[RetryUtils] All ${config.maxRetries} retries exhausted`, lastError);
                throw lastError;
            }

            // Check if error is retryable
            if (!isRetryableError(lastError, config.retryableErrors)) {
                console.warn('[RetryUtils] Non-retryable error, failing immediately:', lastError.message);
                throw lastError;
            }

            // Calculate delay with exponential backoff
            const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
            const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
            const delayWithJitter = addJitter(cappedDelay);

            console.warn(
                `[RetryUtils] Attempt ${attempt + 1}/${config.maxRetries} failed. ` +
                `Retrying in ${delayWithJitter}ms...`,
                lastError.message
            );

            // Notify caller if callback provided
            config.onRetry?.(attempt + 1, lastError, delayWithJitter);

            // Wait before retrying
            await sleep(delayWithJitter);
        }
    }

    throw lastError;
}

// ===========================
// Circuit Breaker Pattern
// ===========================

export interface CircuitBreakerOptions {
    /** Number of failures before opening circuit (default: 3) */
    failureThreshold: number;
    /** Time to wait before attempting reset (default: 30000ms) */
    resetTimeoutMs: number;
    /** Callback when circuit opens */
    onOpen?: () => void;
    /** Callback when circuit closes */
    onClose?: () => void;
}

const DEFAULT_CIRCUIT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
};

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker implementation to prevent cascading failures
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Requests fail immediately without calling the service
 * - HALF_OPEN: One test request is allowed through
 */
export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private lastFailureTime = 0;
    private options: CircuitBreakerOptions;

    constructor(options: Partial<CircuitBreakerOptions> = {}) {
        this.options = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };
    }

    /**
     * Get current circuit state
     */
    getState(): CircuitState {
        // Check if we should transition from OPEN to HALF_OPEN
        if (this.state === 'OPEN') {
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            if (timeSinceFailure >= this.options.resetTimeoutMs) {
                this.state = 'HALF_OPEN';
                console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
            }
        }
        return this.state;
    }

    /**
     * Check if requests are allowed
     */
    isAllowed(): boolean {
        const state = this.getState();
        return state === 'CLOSED' || state === 'HALF_OPEN';
    }

    /**
     * Record a successful operation
     */
    recordSuccess(): void {
        if (this.state === 'HALF_OPEN') {
            console.log('[CircuitBreaker] Success in HALF_OPEN state, closing circuit');
            this.options.onClose?.();
        }
        this.state = 'CLOSED';
        this.failureCount = 0;
    }

    /**
     * Record a failed operation
     */
    recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF_OPEN') {
            console.log('[CircuitBreaker] Failure in HALF_OPEN state, reopening circuit');
            this.state = 'OPEN';
            this.options.onOpen?.();
        } else if (this.failureCount >= this.options.failureThreshold) {
            console.log(`[CircuitBreaker] Threshold reached (${this.failureCount}), opening circuit`);
            this.state = 'OPEN';
            this.options.onOpen?.();
        }
    }

    /**
     * Execute a function through the circuit breaker
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (!this.isAllowed()) {
            const timeUntilReset = this.options.resetTimeoutMs - (Date.now() - this.lastFailureTime);
            throw new Error(
                `Circuit breaker is OPEN. ` +
                `Service unavailable. Retry in ${Math.ceil(timeUntilReset / 1000)}s.`
            );
        }

        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    /**
     * Reset the circuit breaker to initial state
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = 0;
        console.log('[CircuitBreaker] Manual reset to CLOSED state');
    }
}

// ===========================
// Timeout Wrapper
// ===========================

/**
 * Wrap a promise with a timeout
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMessage - Optional custom timeout message
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId!);
    }
}

// ===========================
// Combined Resilient Wrapper
// ===========================

export interface ResilientOptions extends Partial<RetryOptions> {
    /** Timeout for each individual attempt in milliseconds */
    timeoutMs?: number;
    /** Circuit breaker instance (optional, creates new if not provided) */
    circuitBreaker?: CircuitBreaker;
}

/**
 * Wrap an async function with retry, timeout, and circuit breaker
 */
export async function withResilience<T>(
    fn: () => Promise<T>,
    options: ResilientOptions = {}
): Promise<T> {
    const { timeoutMs, circuitBreaker, ...retryOptions } = options;

    const wrappedFn = async () => {
        const baseFn = timeoutMs
            ? () => withTimeout(fn(), timeoutMs)
            : fn;

        return circuitBreaker
            ? circuitBreaker.execute(baseFn)
            : baseFn();
    };

    return withRetry(wrappedFn, retryOptions);
}
