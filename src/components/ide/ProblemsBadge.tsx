import React, { useEffect, useState } from 'react';
import { getMarkerService, MarkerStatistics } from '@/services/markerService';
import { cn } from '@/lib/cn';

/**
 * Activity badge for Problems panel icon
 * Shows total problem count in sidebar
 * Matches VS Code's activity badge behavior
 */
export const ProblemsBadge: React.FC = () => {
  const [stats, setStats] = useState<MarkerStatistics>({
    errors: 0,
    warnings: 0,
    infos: 0,
    hints: 0,
    unknowns: 0,
    total: 0,
  });

  useEffect(() => {
    const markerService = getMarkerService();

    const unsubscribe = markerService.onMarkerChanged(() => {
      setStats(markerService.getStatistics());
    });

    // Initial load
    setStats(markerService.getStatistics());

    return unsubscribe;
  }, []);

  // Calculate visible problem count (errors + warnings + infos, excluding hints)
  const visibleCount = stats.errors + stats.warnings + stats.infos;

  // Don't show badge if no visible problems
  if (visibleCount === 0) {
    return null;
  }

  const title = `${visibleCount} Problem${visibleCount > 1 ? 's' : ''}: ${stats.errors} error${stats.errors !== 1 ? 's' : ''}, ${stats.warnings} warning${stats.warnings !== 1 ? 's' : ''}, ${stats.infos} info`;

  // Display format: 99+ for counts over 99
  const displayCount = visibleCount > 99 ? '99+' : visibleCount.toString();

  return (
    <div
      className={cn(
        'activity-badge',
        'absolute top-0 right-0 -mt-1 -mr-1',
        'min-w-[16px] h-4 px-1',
        'flex items-center justify-center',
        'text-[10px] font-semibold leading-none',
        'rounded-full',
        'pointer-events-none', // Don't interfere with icon clicks
        'z-10',
        // Color based on highest severity
        stats.errors > 0
          ? 'bg-red-500 text-white'
          : stats.warnings > 0
          ? 'bg-yellow-500 text-black'
          : 'bg-blue-500 text-white'
      )}
      style={{
        backgroundColor: stats.errors > 0
          ? 'var(--activityBarBadge-errorBackground, #dc2626)'
          : stats.warnings > 0
          ? 'var(--activityBarBadge-warningBackground, #eab308)'
          : 'var(--activityBarBadge-background, #3b82f6)',
        color: stats.errors > 0 || stats.warnings > 0
          ? 'var(--activityBarBadge-foreground, #ffffff)'
          : 'var(--activityBarBadge-foreground, #ffffff)',
      }}
      title={title}
      aria-label={title}
      role="status"
    >
      {displayCount}
    </div>
  );
};

/**
 * Hook to get problems badge count
 * Useful for showing badge in other contexts
 */
export function useProblemsBadgeCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const markerService = getMarkerService();

    const updateCount = () => {
      const stats = markerService.getStatistics();
      setCount(stats.errors + stats.warnings + stats.infos);
    };

    const unsubscribe = markerService.onMarkerChanged(updateCount);

    // Initial load
    updateCount();

    return unsubscribe;
  }, []);

  return count;
}

export default ProblemsBadge;
