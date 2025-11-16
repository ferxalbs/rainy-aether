/**
 * SplitViewPage Component
 *
 * Full-page view for comparing multiple AI agents side-by-side.
 * Provides a dedicated interface for multi-agent comparison and analysis.
 *
 * @example
 * ```tsx
 * <SplitViewPage />
 * ```
 */

import { useState } from 'react';
import { SplitView } from '@/components/chat/SplitView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { useAgentNavigationActions } from '@/stores/agentNavigationStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * SplitViewPage component
 */
export function SplitViewPage() {
  const { setView } = useAgentNavigationActions();
  const [panelCount, setPanelCount] = useState<2 | 3>(2);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setView('ask-ai')}
            className="h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Split View</h2>
            <p className="text-xs text-muted-foreground">
              Compare multiple agents side-by-side
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                  <Info className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">
                  Send the same prompt to multiple agents and compare their responses,
                  performance, and reasoning approaches in real-time.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant={panelCount === 2 ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setPanelCount(2)}
            >
              2 Panels
            </Button>
            <Button
              variant={panelCount === 3 ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setPanelCount(3)}
            >
              3 Panels
            </Button>
          </div>
        </div>
      </div>

      {/* Split view content */}
      <div className="flex-1 min-h-0">
        <SplitView
          panelCount={panelCount}
          showMetrics={true}
          initialAgents={
            panelCount === 2
              ? ['rainy', 'claude-code']
              : ['rainy', 'claude-code', 'abby']
          }
        />
      </div>

      {/* Info footer */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <Info className="size-3" />
        <span>
          Tip: Use split view to find the best agent for your task and compare
          reasoning strategies
        </span>
      </div>
    </div>
  );
}
