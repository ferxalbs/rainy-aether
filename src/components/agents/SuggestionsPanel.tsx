/**
 * Suggestions Panel Component
 *
 * Displays proactive suggestions from Abby Mode agent.
 * Shows suggestion cards with action buttons for apply/reject.
 *
 * Features:
 * - Grouped suggestions by type
 * - Priority sorting (high impact + low effort first)
 * - Apply/Reject actions
 * - Impact and effort indicators
 * - Confidence scores
 * - Expandable details
 *
 * @example
 * ```tsx
 * import { SuggestionsPanel } from '@/components/agents/SuggestionsPanel';
 *
 * function MyComponent() {
 *   const [suggestions, setSuggestions] = useState([]);
 *
 *   return (
 *     <SuggestionsPanel
 *       suggestions={suggestions}
 *       onApply={(id) => handleApply(id)}
 *       onReject={(id) => handleReject(id)}
 *     />
 *   );
 * }
 * ```
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  Code,
  TestTube,
  FileText,
  Wrench,
  Package,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Zap,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AbbySuggestion } from '@/services/agents/abby/AbbyAgent';

/**
 * Suggestions Panel Props
 */
export interface SuggestionsPanelProps {
  /** Active suggestions */
  suggestions: AbbySuggestion[];

  /** Callback when suggestion is applied */
  onApply?: (suggestionId: string) => void;

  /** Callback when suggestion is rejected */
  onReject?: (suggestionId: string, remember?: boolean) => void;

  /** Additional CSS class */
  className?: string;

  /** Loading state */
  isLoading?: boolean;
}

/**
 * Get icon for suggestion type
 */
function getSuggestionIcon(type: AbbySuggestion['type']) {
  switch (type) {
    case 'automation':
      return Wrench;
    case 'refactoring':
      return Code;
    case 'fix':
      return AlertCircle;
    case 'tool':
      return Zap;
    case 'library':
      return Package;
    case 'test':
      return TestTube;
    case 'doc':
      return FileText;
    default:
      return Lightbulb;
  }
}

/**
 * Get color for impact level
 */
function getImpactColor(impact: AbbySuggestion['impact']) {
  switch (impact) {
    case 'high':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
}

/**
 * Get color for effort level
 */
function getEffortColor(effort: AbbySuggestion['effort']) {
  switch (effort) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
  }
}

/**
 * Single Suggestion Card
 */
function SuggestionCard({
  suggestion,
  onApply,
  onReject,
}: {
  suggestion: AbbySuggestion;
  onApply?: (id: string) => void;
  onReject?: (id: string, remember?: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRejectOptions, setShowRejectOptions] = useState(false);

  const Icon = getSuggestionIcon(suggestion.type);
  const impactColor = getImpactColor(suggestion.impact);
  const effortColor = getEffortColor(suggestion.effort);

  const handleApply = () => {
    onApply?.(suggestion.id);
  };

  const handleReject = (remember: boolean = false) => {
    onReject?.(suggestion.id, remember);
    setShowRejectOptions(false);
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-all',
        'hover:border-primary/50 hover:shadow-md',
        impactColor
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 p-2 rounded-lg bg-background/50">
          <Icon className="size-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-foreground">
              {suggestion.title}
            </h4>

            {/* Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Impact */}
              <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border">
                <TrendingUp className="size-3" />
                <span className="capitalize">{suggestion.impact}</span>
              </div>

              {/* Effort */}
              <div className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', effortColor)}>
                <Clock className="size-3" />
                <span className="capitalize">{suggestion.effort}</span>
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="text-xs text-muted-foreground mt-1 capitalize">
            {suggestion.type}
          </div>

          {/* Description (collapsible) */}
          {!isExpanded ? (
            <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
              {suggestion.description}
            </p>
          ) : (
            <div className="text-sm text-foreground/80 mt-2">
              <p>{suggestion.description}</p>

              {/* Additional details */}
              {suggestion.files && suggestion.files.length > 0 && (
                <div className="mt-3 p-2 bg-background rounded border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Affected Files:
                  </div>
                  <ul className="text-xs space-y-0.5">
                    {suggestion.files.map((file, i) => (
                      <li key={i} className="font-mono">
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence */}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Confidence:</span>
                <div className="flex-1 max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${suggestion.confidence * 100}%` }}
                  />
                </div>
                <span>{Math.round(suggestion.confidence * 100)}%</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={handleApply}
              className="h-7 text-xs"
            >
              <CheckCircle className="size-3 mr-1" />
              Apply
            </Button>

            {!showRejectOptions ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectOptions(true)}
                className="h-7 text-xs"
              >
                <XCircle className="size-3 mr-1" />
                Reject
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReject(false)}
                  className="h-7 text-xs"
                >
                  Just Once
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReject(true)}
                  className="h-7 text-xs text-destructive"
                >
                  Always
                </Button>
              </div>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto p-1 hover:bg-background/50 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Suggestions Panel Component
 *
 * Displays Abby Mode's proactive suggestions with apply/reject actions.
 */
export function SuggestionsPanel({
  suggestions,
  onApply,
  onReject,
  className,
  isLoading = false,
}: SuggestionsPanelProps) {
  // Group suggestions by type
  const groupedSuggestions = suggestions.reduce(
    (acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    },
    {} as Record<string, AbbySuggestion[]>
  );

  if (isLoading) {
    return (
      <div className={cn('p-4 space-y-3', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="size-4 animate-pulse" />
          <span className="text-sm">Abby is analyzing your workspace...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-center py-8">
          <Sparkles className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <h4 className="text-sm font-medium text-muted-foreground">
            No suggestions yet
          </h4>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Abby is observing your workspace and will suggest improvements when opportunities arise
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="font-semibold text-sm">Abby's Suggestions</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => (
          <div key={type}>
            {/* Type Header */}
            <div className="text-xs font-medium text-muted-foreground mb-2 capitalize">
              {type} ({typeSuggestions.length})
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              {typeSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={onApply}
                  onReject={onReject}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
