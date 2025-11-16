/**
 * useStreaming Hook
 *
 * React hook for consuming real-time streaming responses from agents.
 * Provides token-by-token updates with support for:
 * - Progressive content rendering
 * - Tool call tracking
 * - Streaming control (start/stop)
 * - Performance metrics
 *
 * @example
 * ```typescript
 * const { content, isStreaming, toolCalls, startStreaming, stopStreaming } = useStreaming('rainy');
 *
 * // Start streaming a message
 * await startStreaming('Explain recursion', { fastMode: false });
 *
 * // Stop streaming mid-execution
 * stopStreaming();
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import { agentRouter } from '@/services/agents/core/AgentRouter';
import type { MessageOptions } from '@/services/agents/core/AgentCore';
import type { ToolCall } from '@/types/rustAgent';

/**
 * Streaming state
 */
export interface StreamingState {
  /** Current accumulated content */
  content: string;

  /** Whether streaming is currently active */
  isStreaming: boolean;

  /** Tool calls made during streaming */
  toolCalls: ToolCall[];

  /** Streaming error if any */
  error: string | null;

  /** Performance metrics */
  metrics: {
    /** Total execution time (ms) */
    executionTimeMs: number;

    /** Average latency between chunks (ms) */
    avgStreamLatencyMs: number;

    /** Total chunks received */
    totalChunks: number;
  };
}

/**
 * Streaming controls
 */
export interface StreamingControls {
  /** Current streaming state */
  state: StreamingState;

  /** Start streaming a message */
  startStreaming: (message: string, options?: MessageOptions) => Promise<void>;

  /** Stop streaming mid-execution */
  stopStreaming: () => void;

  /** Reset state to initial values */
  reset: () => void;
}

/**
 * Hook for streaming agent responses
 *
 * @param agentId - ID of agent to stream from (optional, uses router selection if not provided)
 * @returns Streaming state and controls
 */
export function useStreaming(agentId?: string): StreamingControls {
  const [state, setState] = useState<StreamingState>({
    content: '',
    isStreaming: false,
    toolCalls: [],
    error: null,
    metrics: {
      executionTimeMs: 0,
      avgStreamLatencyMs: 0,
      totalChunks: 0,
    },
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamLatencies = useRef<number[]>([]);

  /**
   * Start streaming a message
   */
  const startStreaming = useCallback(
    async (message: string, options?: MessageOptions) => {
      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Reset state
      setState({
        content: '',
        isStreaming: true,
        toolCalls: [],
        error: null,
        metrics: {
          executionTimeMs: 0,
          avgStreamLatencyMs: 0,
          totalChunks: 0,
        },
      });

      streamLatencies.current = [];
      let chunkCount = 0;

      try {
        // Stream via router
        const stream = agentRouter.streamRoute({
          message,
          agentId,
          options,
        });

        for await (const chunk of stream) {
          // Check if aborted
          if (controller.signal.aborted) {
            console.log('⏹️ Streaming aborted by user');
            break;
          }

          chunkCount++;

          // Track latency
          if (chunk.metadata.streamLatencyMs) {
            streamLatencies.current.push(chunk.metadata.streamLatencyMs);
          }

          // Update state with new chunk
          setState((prev) => ({
            ...prev,
            content: chunk.content,
            toolCalls: [
              ...prev.toolCalls,
              ...chunk.toolCalls.filter(
                (tc) => !prev.toolCalls.some((existing) => existing.id === tc.id)
              ),
            ],
            metrics: {
              executionTimeMs: chunk.metadata.executionTimeMs,
              avgStreamLatencyMs:
                streamLatencies.current.length > 0
                  ? streamLatencies.current.reduce((sum, lat) => sum + lat, 0) /
                    streamLatencies.current.length
                  : 0,
              totalChunks: chunkCount,
            },
          }));

          // If done, stop streaming
          if (chunk.done) {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: chunk.error || null,
            }));
            break;
          }
        }
      } catch (error) {
        console.error('❌ Streaming failed:', error);
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        // Clean up abort controller
        abortControllerRef.current = null;
      }
    },
    [agentId]
  );

  /**
   * Stop streaming mid-execution
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({
        ...prev,
        isStreaming: false,
      }));
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      content: '',
      isStreaming: false,
      toolCalls: [],
      error: null,
      metrics: {
        executionTimeMs: 0,
        avgStreamLatencyMs: 0,
        totalChunks: 0,
      },
    });
    streamLatencies.current = [];
  }, []);

  return {
    state,
    startStreaming,
    stopStreaming,
    reset,
  };
}

/**
 * Convenience exports for destructuring
 */
export type { StreamingState, StreamingControls };
