/**
 * Agent Selector Component
 *
 * UI component for selecting which AI agent to use.
 * Displays available agents with their capabilities and allows switching between them.
 *
 * Features:
 * - Lists all available agents
 * - Shows agent descriptions and capabilities
 * - Visual selection state
 * - Smooth transitions
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * import { AgentSelector } from '@/components/agents/AgentSelector';
 *
 * function MyComponent() {
 *   const [agentId, setAgentId] = useState('rainy');
 *
 *   return (
 *     <AgentSelector
 *       selectedAgentId={agentId}
 *       onSelectAgent={setAgentId}
 *     />
 *   );
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { agentRegistry } from '@/services/agents/core/AgentRegistry';
import type { AgentCore } from '@/services/agents/core/AgentCore';
import { cn } from '@/lib/cn';
import { Bot, Sparkles, Cpu } from 'lucide-react';

/**
 * Agent Selector Props
 */
export interface AgentSelectorProps {
  /** Currently selected agent ID */
  selectedAgentId?: string;

  /** Callback when agent is selected */
  onSelectAgent?: (agentId: string) => void;

  /** Additional CSS class */
  className?: string;

  /** Compact mode (smaller UI) */
  compact?: boolean;
}

/**
 * Get icon for agent
 */
function getAgentIcon(agentId: string) {
  switch (agentId) {
    case 'rainy':
      return Bot;
    case 'claude-code':
      return Cpu;
    case 'abby':
      return Sparkles;
    default:
      return Bot;
  }
}

/**
 * Agent Selector Component
 *
 * Allows users to choose which AI agent to interact with.
 */
export function AgentSelector({
  selectedAgentId = 'rainy',
  onSelectAgent,
  className,
  compact = false,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<AgentCore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load agents from registry
  useEffect(() => {
    const loadAgents = async () => {
      try {
        // Ensure registry is initialized
        if (!agentRegistry.isInitialized()) {
          await agentRegistry.initialize();
        }

        // Get all agents
        const allAgents = agentRegistry.getAll();
        setAgents(allAgents);
      } catch (error) {
        console.error('Failed to load agents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
  }, []);

  const handleSelect = (agentId: string) => {
    onSelectAgent?.(agentId);
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2 p-4', className)}>
        <div className="text-sm text-muted-foreground">Loading agents...</div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className={cn('space-y-2 p-4', className)}>
        <div className="text-sm text-muted-foreground">No agents available</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', compact ? 'p-2' : 'p-4', className)}>
      {!compact && (
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Select Agent
        </h3>
      )}

      <div className="space-y-1.5">
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          const isSelected = agent.id === selectedAgentId;

          return (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className={cn(
                'w-full text-left transition-all rounded-lg',
                'hover:bg-accent border border-transparent',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                compact ? 'p-2' : 'p-3',
                isSelected && 'bg-primary/10 border-primary shadow-sm'
              )}
              aria-pressed={isSelected}
              aria-label={`Select ${agent.name}`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    'shrink-0 rounded-md p-1.5',
                    isSelected
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className={cn(compact ? 'size-4' : 'size-5')} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'font-medium',
                      compact ? 'text-sm' : 'text-base',
                      isSelected && 'text-primary'
                    )}
                  >
                    {agent.name}
                  </div>

                  {!compact && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {agent.description}
                    </div>
                  )}
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="shrink-0 mt-1">
                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Agent Count */}
      {!compact && agents.length > 1 && (
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
}
