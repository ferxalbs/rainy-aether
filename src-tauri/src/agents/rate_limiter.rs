//! Rate limiting for API requests
//!
//! This module provides a token bucket-based rate limiter to control
//! the rate of API requests to prevent exceeding provider limits.

use parking_lot::Mutex;
use std::sync::Arc;
use std::time::{Duration, Instant};
use thiserror::Error;

/// Rate limiter errors
#[derive(Error, Debug)]
pub enum RateLimitError {
    #[error("Rate limit exceeded, retry after {0:?}")]
    Exceeded(Duration),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

/// Token bucket rate limiter
///
/// Uses the token bucket algorithm to allow bursts while maintaining
/// average rate limits over time.
pub struct RateLimiter {
    state: Arc<Mutex<RateLimiterState>>,
    max_tokens: u32,
    refill_rate: u32,
    refill_interval: Duration,
}

struct RateLimiterState {
    tokens: u32,
    last_refill: Instant,
}

impl RateLimiter {
    /// Create a new rate limiter
    ///
    /// # Arguments
    ///
    /// * `max_tokens` - Maximum number of tokens in the bucket
    /// * `refill_rate` - Number of tokens to add per refill interval
    /// * `refill_interval` - How often to refill tokens
    ///
    /// # Example
    ///
    /// ```ignore
    /// // Allow 100 requests per minute
    /// let limiter = RateLimiter::new(100, 100, Duration::from_secs(60));
    /// ```
    pub fn new(max_tokens: u32, refill_rate: u32, refill_interval: Duration) -> Self {
        Self {
            state: Arc::new(Mutex::new(RateLimiterState {
                tokens: max_tokens,
                last_refill: Instant::now(),
            })),
            max_tokens,
            refill_rate,
            refill_interval,
        }
    }

    /// Create a rate limiter for a specific provider
    pub fn for_provider(provider: &str) -> Self {
        match provider {
            "google" => {
                // Google Gemini: 60 requests per minute
                Self::new(60, 60, Duration::from_secs(60))
            }
            "groq" => {
                // Groq: 30 requests per minute for free tier
                Self::new(30, 30, Duration::from_secs(60))
            }
            _ => {
                // Default: Conservative rate limit
                Self::new(20, 20, Duration::from_secs(60))
            }
        }
    }

    /// Attempt to acquire a token (non-blocking)
    ///
    /// Returns `Ok(())` if a token was acquired, or an error with retry duration
    pub fn try_acquire(&self) -> Result<(), RateLimitError> {
        let mut state = self.state.lock();

        // Refill tokens based on time elapsed
        self.refill_tokens(&mut state);

        if state.tokens > 0 {
            state.tokens -= 1;
            Ok(())
        } else {
            // Calculate time until next token is available
            let time_since_refill = state.last_refill.elapsed();
            let time_until_refill = self.refill_interval.saturating_sub(time_since_refill);
            Err(RateLimitError::Exceeded(time_until_refill))
        }
    }

    /// Acquire a token (blocking with timeout)
    ///
    /// Waits until a token is available or timeout is reached
    pub async fn acquire(&self) -> Result<(), RateLimitError> {
        const MAX_RETRIES: u32 = 10;
        let mut retries = 0;

        loop {
            match self.try_acquire() {
                Ok(()) => return Ok(()),
                Err(RateLimitError::Exceeded(wait_time)) => {
                    if retries >= MAX_RETRIES {
                        return Err(RateLimitError::Exceeded(wait_time));
                    }

                    // Wait for the suggested duration
                    tokio::time::sleep(wait_time).await;
                    retries += 1;
                }
                Err(e) => return Err(e),
            }
        }
    }

    /// Refill tokens based on elapsed time
    fn refill_tokens(&self, state: &mut RateLimiterState) {
        let now = Instant::now();
        let elapsed = now.duration_since(state.last_refill);

        // Calculate number of refill intervals that have passed
        let intervals = elapsed.as_secs_f64() / self.refill_interval.as_secs_f64();

        if intervals >= 1.0 {
            let tokens_to_add = (intervals * self.refill_rate as f64) as u32;
            state.tokens = (state.tokens + tokens_to_add).min(self.max_tokens);
            state.last_refill = now;
        }
    }

    /// Get current number of available tokens
    pub fn available_tokens(&self) -> u32 {
        let mut state = self.state.lock();
        self.refill_tokens(&mut state);
        state.tokens
    }

    /// Get rate limiter statistics
    pub fn stats(&self) -> RateLimiterStats {
        let state = self.state.lock();
        RateLimiterStats {
            available_tokens: state.tokens,
            max_tokens: self.max_tokens,
            utilization: 1.0 - (state.tokens as f64 / self.max_tokens as f64),
            time_since_refill: state.last_refill.elapsed(),
        }
    }
}

/// Rate limiter statistics
#[derive(Debug, Clone)]
pub struct RateLimiterStats {
    /// Current number of available tokens
    pub available_tokens: u32,

    /// Maximum number of tokens
    pub max_tokens: u32,

    /// Utilization percentage (0.0 - 1.0)
    pub utilization: f64,

    /// Time since last refill
    pub time_since_refill: Duration,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiter_basic() {
        let limiter = RateLimiter::new(10, 10, Duration::from_secs(1));

        // Should be able to acquire tokens
        for _ in 0..10 {
            assert!(limiter.try_acquire().is_ok());
        }

        // Should fail after exhausting tokens
        assert!(limiter.try_acquire().is_err());
    }

    #[test]
    fn test_rate_limiter_stats() {
        let limiter = RateLimiter::new(100, 100, Duration::from_secs(60));
        let stats = limiter.stats();

        assert_eq!(stats.available_tokens, 100);
        assert_eq!(stats.max_tokens, 100);
        assert_eq!(stats.utilization, 0.0);
    }

    #[tokio::test]
    async fn test_rate_limiter_async() {
        let limiter = RateLimiter::new(5, 5, Duration::from_millis(100));

        // Exhaust tokens
        for _ in 0..5 {
            assert!(limiter.try_acquire().is_ok());
        }

        // Wait and try again
        tokio::time::sleep(Duration::from_millis(150)).await;
        assert!(limiter.try_acquire().is_ok());
    }
}
