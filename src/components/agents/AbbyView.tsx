/**
 * Abby Mode View Component
 *
 * Dedicated view for Abby Mode's proactive suggestions.
 * Shows monitoring status, active suggestions, and controls.
 *
 * @example
 * ```tsx
 * import { AbbyView } from '@/components/agents/AbbyView';
 *
 * function MyComponent() {
 *   return <AbbyView />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { SuggestionsPanel } from './SuggestionsPanel';
import { useAbbyMode } from '@/hooks/useAgents';
import { Button } from '@/components/ui/button';
import { Sparkles, Play, Square, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Abby Mode View
 *
 * Full-screen view for interacting with Abby Mode.
 */
export function AbbyView() {
  const {
    suggestions,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    applySuggestion,
    rejectSuggestion,
  } = useAbbyMode();

  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (suggestions.length > 0) {
      setShowWelcome(false);
    }
  }, [suggestions]);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
    } else {
      await startMonitoring();
      setShowWelcome(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Abby Mode</h1>
            <p className="text-sm text-muted-foreground">
              Autonomous development assistant
            </p>
          </div>
        </div>

        {/* Monitoring Controls */}
        <div className="flex items-center gap-2">
          {isMonitoring && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Monitoring Active
              </span>
            </div>
          )}

          <Button
            variant={isMonitoring ? 'outline' : 'default'}
            size="sm"
            onClick={handleToggleMonitoring}
            className="gap-2"
          >
            {isMonitoring ? (
              <>
                <Square className="size-4" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome && suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="max-w-md space-y-4">
              <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto">
                <Sparkles className="size-16 text-primary" />
              </div>

              <h2 className="text-2xl font-bold">Welcome to Abby Mode</h2>

              <p className="text-muted-foreground leading-relaxed">
                Abby is your autonomous development assistant that proactively monitors
                your workspace and suggests improvements. Start monitoring to let Abby
                observe your code patterns, detect opportunities, and recommend
                high-impact changes.
              </p>

              <div className="pt-4">
                <Button
                  size="lg"
                  onClick={handleToggleMonitoring}
                  className="gap-2"
                >
                  <Play className="size-5" />
                  Start Monitoring
                </Button>
              </div>

              <div className="pt-8 space-y-2 text-sm">
                <h3 className="font-semibold text-foreground">
                  What Abby Can Do:
                </h3>
                <ul className="space-y-1 text-muted-foreground text-left max-w-sm mx-auto">
                  <li className="flex items-start gap-2">
                    <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>Detect code duplication and suggest refactoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>Identify missing tests and generate test cases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>Recommend development tools and libraries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>Find potential bugs and security issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>Automate repetitive coding patterns</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-4">
            <SuggestionsPanel
              suggestions={suggestions}
              onApply={applySuggestion}
              onReject={rejectSuggestion}
              isLoading={isMonitoring && suggestions.length === 0}
            />

            {isMonitoring && suggestions.length === 0 && (
              <div className="text-center py-12">
                <RefreshCw className="size-8 text-muted-foreground/50 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Abby is analyzing your workspace...
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Suggestions will appear here as patterns are detected
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
