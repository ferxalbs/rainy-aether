/**
 * SplitView Component
 *
 * Side-by-side comparison of multiple AI agents with:
 * - Send same prompt to 2-3 agents simultaneously
 * - Real-time streaming from all agents
 * - Independent scrolling per panel
 * - Performance comparison (speed, tokens)
 * - Agent selection per panel
 *
 * @example
 * ```tsx
 * <SplitView
 *   agents={['rainy', 'claude-code']}
 *   onAgentChange={(panelIndex, agentId) => console.log('Agent changed')}
 * />
 * ```
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';
import { useStreaming } from '@/hooks/useStreaming';
import { useAgents } from '@/hooks/useAgents';
import { MarkdownMessage } from './MarkdownMessage';
import { TypingIndicator } from './StreamingMessage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Square,
  Zap,
  Clock,
  BarChart2,
  Loader2,
} from 'lucide-react';

/**
 * Props for SplitView component
 */
export interface SplitViewProps {
  /** Initial agents to compare (defaults to ['rainy', 'claude-code']) */
  initialAgents?: string[];

  /** Number of panels (2 or 3) */
  panelCount?: 2 | 3;

  /** Whether to show performance metrics */
  showMetrics?: boolean;

  /** Callback when agents change */
  onAgentChange?: (panelIndex: number, agentId: string) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Panel state for each agent
 */
interface PanelState {
  agentId: string;
  content: string;
  isStreaming: boolean;
  metrics: {
    executionTimeMs: number;
    totalChunks: number;
    avgStreamLatencyMs: number;
  };
  error: string | null;
}

/**
 * SplitView component
 */
export function SplitView({
  initialAgents = ['rainy', 'claude-code'],
  panelCount = 2,
  showMetrics = true,
  onAgentChange,
  className,
}: SplitViewProps) {
  const { agents } = useAgents();
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [panels, setPanels] = useState<PanelState[]>(
    initialAgents.slice(0, panelCount).map((agentId) => ({
      agentId,
      content: '',
      isStreaming: false,
      metrics: {
        executionTimeMs: 0,
        totalChunks: 0,
        avgStreamLatencyMs: 0,
      },
      error: null,
    }))
  );

  // Streaming hooks for each panel
  const panel1Streaming = useStreaming(panels[0]?.agentId);
  const panel2Streaming = useStreaming(panels[1]?.agentId);
  const panel3Streaming = panelCount === 3 ? useStreaming(panels[2]?.agentId) : null;

  const streamingHooks = [panel1Streaming, panel2Streaming, panel3Streaming].filter(
    Boolean
  );

  /**
   * Send prompt to all agents
   */
  const sendToAll = useCallback(async () => {
    if (!sharedPrompt.trim()) return;

    // Start streaming for all panels
    const promises = panels.map(async (panel, index) => {
      const hook = streamingHooks[index];
      if (!hook) return;

      await hook.startStreaming(sharedPrompt, { fastMode: false });

      // Update panel state with results
      setPanels((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          content: hook.state.content,
          isStreaming: hook.state.isStreaming,
          metrics: hook.state.metrics,
          error: hook.state.error,
        };
        return updated;
      });
    });

    await Promise.all(promises);
  }, [sharedPrompt, panels, streamingHooks]);

  /**
   * Stop all streaming
   */
  const stopAll = useCallback(() => {
    streamingHooks.forEach((hook) => hook?.stopStreaming());
  }, [streamingHooks]);

  /**
   * Change agent for a panel
   */
  const changeAgent = useCallback(
    (panelIndex: number, agentId: string) => {
      setPanels((prev) => {
        const updated = [...prev];
        updated[panelIndex] = {
          agentId,
          content: '',
          isStreaming: false,
          metrics: { executionTimeMs: 0, totalChunks: 0, avgStreamLatencyMs: 0 },
          error: null,
        };
        return updated;
      });
      onAgentChange?.(panelIndex, agentId);
    },
    [onAgentChange]
  );

  /**
   * Get fastest agent
   */
  const fastestAgent = panels.reduce((fastest, panel) =>
    panel.metrics.executionTimeMs > 0 &&
    panel.metrics.executionTimeMs < fastest.metrics.executionTimeMs
      ? panel
      : fastest
  );

  const anyStreaming = panels.some((p) => p.isStreaming);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Shared prompt bar */}
      <div className="flex flex-col gap-3 p-4 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <Input
            value={sharedPrompt}
            onChange={(e) => setSharedPrompt(e.target.value)}
            placeholder="Send to all agents..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendToAll();
              }
            }}
            disabled={anyStreaming}
          />
          {anyStreaming ? (
            <Button onClick={stopAll} variant="destructive" size="sm" className="gap-2">
              <Square className="size-4" />
              Stop All
            </Button>
          ) : (
            <Button
              onClick={sendToAll}
              disabled={!sharedPrompt.trim()}
              size="sm"
              className="gap-2"
            >
              <Send className="size-4" />
              Send
            </Button>
          )}
        </div>

        {showMetrics && panels.some((p) => p.content) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="size-3" />
              <span>
                Fastest: {agents.find((a) => a.id === fastestAgent.agentId)?.name} (
                {Math.round(fastestAgent.metrics.executionTimeMs)}ms)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Split panels */}
      <div
        className={cn(
          'flex flex-1 divide-x divide-border min-h-0',
          panelCount === 3 && 'grid grid-cols-3'
        )}
      >
        {panels.map((panel, index) => {
          const hook = streamingHooks[index];
          const agent = agents.find((a) => a.id === panel.agentId);

          return (
            <div key={index} className="flex flex-col min-w-0 min-h-0">
              {/* Panel header */}
              <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <Select
                  value={panel.agentId}
                  onValueChange={(value) => changeAgent(index, value)}
                  disabled={panel.isStreaming}
                >
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {showMetrics && panel.content && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {Math.round(panel.metrics.executionTimeMs)}ms
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart2 className="size-3" />
                      {panel.metrics.totalChunks} chunks
                    </div>
                  </div>
                )}
              </div>

              {/* Panel content */}
              <ScrollArea className="flex-1 p-4">
                {hook?.state.isStreaming && !hook.state.content && (
                  <div className="flex items-center justify-center h-full">
                    <TypingIndicator />
                  </div>
                )}

                {hook?.state.content && (
                  <MarkdownMessage
                    content={hook.state.content}
                    showCopyButtons={true}
                    enableCodeInsertion={false}
                  />
                )}

                {hook?.state.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">Error</p>
                    <p className="text-xs text-destructive/80 mt-1">{hook.state.error}</p>
                  </div>
                )}

                {!hook?.state.content && !hook?.state.isStreaming && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      {agent?.name[0] || '?'}
                    </div>
                    <p className="text-sm font-medium">{agent?.name}</p>
                    <p className="text-xs mt-1">
                      Send a prompt to compare responses
                    </p>
                  </div>
                )}

                {hook?.state.isStreaming && (
                  <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-xs">
                      {hook.state.content ? 'Streaming...' : 'Waiting for response...'}
                    </span>
                  </div>
                )}
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
