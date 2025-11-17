import { useSyncExternalStore } from 'react';

/**
 * Notification severity levels
 */
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: number;
  read: boolean;
  source?: string;
  actions?: NotificationAction[];
  dismissible?: boolean;
}

/**
 * Notification action interface
 */
export interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  total: number;
  unread: number;
  errors: number;
  warnings: number;
  infos: number;
  success: number;
}

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

let state: NotificationState = {
  notifications: [],
  maxNotifications: 100,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Notification actions
 */
export const notificationActions = {
  /**
   * Add a new notification
   */
  addNotification(
    message: string,
    severity: NotificationSeverity = 'info',
    options?: {
      source?: string;
      actions?: NotificationAction[];
      dismissible?: boolean;
      autoHide?: boolean;
      autoHideDelay?: number;
    }
  ): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification: Notification = {
      id,
      message,
      severity,
      timestamp: Date.now(),
      read: false,
      source: options?.source,
      actions: options?.actions,
      dismissible: options?.dismissible ?? true,
    };

    state = {
      ...state,
      notifications: [notification, ...state.notifications].slice(0, state.maxNotifications),
    };

    notifyListeners();

    // Auto-hide if requested
    if (options?.autoHide) {
      const delay = options?.autoHideDelay ?? 5000;
      setTimeout(() => {
        notificationActions.dismissNotification(id);
      }, delay);
    }

    return id;
  },

  /**
   * Add an info notification
   */
  info(message: string, options?: Parameters<typeof notificationActions.addNotification>[2]): string {
    return notificationActions.addNotification(message, 'info', options);
  },

  /**
   * Add a warning notification
   */
  warning(message: string, options?: Parameters<typeof notificationActions.addNotification>[2]): string {
    return notificationActions.addNotification(message, 'warning', options);
  },

  /**
   * Add an error notification
   */
  error(message: string, options?: Parameters<typeof notificationActions.addNotification>[2]): string {
    return notificationActions.addNotification(message, 'error', options);
  },

  /**
   * Add a success notification
   */
  success(message: string, options?: Parameters<typeof notificationActions.addNotification>[2]): string {
    return notificationActions.addNotification(message, 'success', options);
  },

  /**
   * Mark notification as read
   */
  markAsRead(id: string) {
    state = {
      ...state,
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    };
    notifyListeners();
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    state = {
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    };
    notifyListeners();
  },

  /**
   * Dismiss a notification
   */
  dismissNotification(id: string) {
    state = {
      ...state,
      notifications: state.notifications.filter((n) => n.id !== id),
    };
    notifyListeners();
  },

  /**
   * Clear all notifications
   */
  clearAll() {
    state = {
      ...state,
      notifications: [],
    };
    notifyListeners();
  },

  /**
   * Clear read notifications
   */
  clearRead() {
    state = {
      ...state,
      notifications: state.notifications.filter((n) => !n.read),
    };
    notifyListeners();
  },

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return state.notifications.find((n) => n.id === id);
  },

  /**
   * Get all notifications
   */
  getAllNotifications(): Notification[] {
    return state.notifications;
  },

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return state.notifications.filter((n) => !n.read);
  },

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    const unread = state.notifications.filter((n) => !n.read);
    return {
      total: state.notifications.length,
      unread: unread.length,
      errors: state.notifications.filter((n) => n.severity === 'error').length,
      warnings: state.notifications.filter((n) => n.severity === 'warning').length,
      infos: state.notifications.filter((n) => n.severity === 'info').length,
      success: state.notifications.filter((n) => n.severity === 'success').length,
    };
  },

  /**
   * Set maximum number of notifications to keep
   */
  setMaxNotifications(max: number) {
    state = {
      ...state,
      maxNotifications: max,
      notifications: state.notifications.slice(0, max),
    };
    notifyListeners();
  },
};

/**
 * React hook to use notification store
 */
export function useNotificationStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}

/**
 * React hook to get notification statistics
 */
export function useNotificationStats(): NotificationStats {
  const storeState = useNotificationStore();
  return notificationActions.getStats();
}
