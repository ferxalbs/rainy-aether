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
 * Mock agent data for the selector
 */
const mockAgents = [
  {
    id: 'rainy',
    name: 'Rainy Agent',
    description: 'General-purpose AI assistant for coding tasks'
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Specialized agent for code analysis and generation'
  },
  {
    id: 'abby',
    name: 'Abby Agent',
    description: 'Creative assistant for design and prototyping'
  }
];

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
 * Agent Selector Component (Mockup)
 *
 * Mockup version showing agent selection UI without real functionality.
 */
export function AgentSelector({
  selectedAgentId = 'rainy',
  onSelectAgent,
  className,
  compact = false,
}: AgentSelectorProps) {
  const handleSelect = (agentId: string) => {
    onSelectAgent?.(agentId);
  };

  return (
    <div className={cn('space-y-2', compact ? 'p-2' : 'p-4', className)}>
      {!compact && (
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Select Agent (Mockup)
        </h3>
      )}

      <div className="space-y-1.5">
        {mockAgents.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          const isSelected = agent.id === selectedAgentId;

          return (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className={cn(
                'w-full text-left transition-all rounded-lg',
                'hover:bg-accent border border-transparent opacity-50',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                compact ? 'p-2' : 'p-3',
                isSelected && 'bg-primary/10 border-primary shadow-sm opacity-100'
              )}
              aria-pressed={isSelected}
              aria-label={`Select ${agent.name} (Mockup)`}
              disabled
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
                      {agent.description} (Mockup)
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
      {!compact && mockAgents.length > 1 && (
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          {mockAgents.length} agent{mockAgents.length !== 1 ? 's' : ''} available (Mockup)
        </div>
      )}
    </div>
  );
}
