import React from 'react';
import { IStatusBarItemProps } from '@/types/statusbar';
import { cn } from '@/lib/cn';

/**
 * Individual status bar item component
 */
export const StatusBarItem: React.FC<IStatusBarItemProps> = ({ entry, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(entry);
    } else if (entry.onClick) {
      entry.onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const isClickable = !!(onClick || entry.onClick || entry.command);

  const className = cn(
    'statusbar-item',
    entry.kind && `${entry.kind}-kind`,
    !isClickable && 'cursor-default'
  );

  const style: React.CSSProperties = {
    ...(entry.backgroundColor && { backgroundColor: entry.backgroundColor }),
    ...(entry.color && { color: entry.color }),
  };

  return (
    <div
      className={className}
      style={style}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      title={typeof entry.tooltip === 'string' ? entry.tooltip : undefined}
      aria-label={entry.ariaLabel || entry.name}
      role={isClickable ? 'button' : 'status'}
      tabIndex={isClickable ? 0 : -1}
    >
      {/* Render text (supports HTML for icons) */}
      <span
        dangerouslySetInnerHTML={{ __html: entry.text }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      />
    </div>
  );
};
