import React, { useEffect, useState } from 'react';
import { useNotificationStore, notificationActions, Notification } from '@/stores/notificationStore';
import { cn } from '@/lib/cn';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  triggerRef,
  onMouseEnter,
  onMouseLeave,
}: NotificationCenterProps) {
  const { notifications } = useNotificationStore();
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 400, // Show above the statusbar
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      notificationActions.markAsRead(notification.id);
    }
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationActions.dismissNotification(id);
  };

  return (
    <div
      className={cn(
        'fixed z-[9999] w-96 rounded-lg shadow-2xl border',
        'bg-background border-border',
        'overflow-hidden flex flex-col max-h-[400px]'
      )}
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              filter === 'unread'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              onDismiss={(e) => handleDismiss(notification.id, e)}
            />
          ))
        )}
      </div>

      {/* Footer - Actions */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => notificationActions.markAllAsRead()}
              className="flex-1 px-3 py-1.5 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark All as Read
            </button>
            <button
              onClick={() => notificationActions.clearAll()}
              className="flex-1 px-3 py-1.5 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onDismiss }: NotificationItemProps) {
  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-destructive';
      case 'warning':
        return 'text-yellow-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-primary';
    }
  };

  const getSeverityIcon = (severity: Notification['severity']) => {
    const iconProps = {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      className: getSeverityColor(severity),
    };

    switch (severity) {
      case 'error':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        );
      case 'warning':
        return (
          <svg {...iconProps}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        );
      case 'success':
        return (
          <svg {...iconProps}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'border-b border-border last:border-b-0',
        'flex items-start gap-3',
        !notification.read && 'bg-muted/30'
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="flex-shrink-0 mt-2">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
        </div>
      )}

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(notification.severity)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground">{notification.message}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="text-xs text-muted-foreground">
            {formatTimestamp(notification.timestamp)}
          </div>
          {notification.source && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <div className="text-xs text-muted-foreground">{notification.source}</div>
            </>
          )}
        </div>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 mt-2">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.action();
                }}
                className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {notification.dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </button>
  );
}
