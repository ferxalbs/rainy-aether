import { useSyncExternalStore } from "react";

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

interface ToastState {
  toasts: Toast[];
  maxToasts: number;
}

const initialState: ToastState = {
  toasts: [],
  maxToasts: 5,
};

let toastState: ToastState = initialState;
let cachedSnapshot: ToastState = { ...initialState };

type ToastListener = () => void;

const listeners = new Set<ToastListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Toast state listener error:", error);
    }
  });
};

const setState = (updater: (prev: ToastState) => ToastState) => {
  toastState = updater(toastState);
  cachedSnapshot = toastState;
  notify();
  return toastState;
};

const subscribe = (listener: ToastListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

export const useToastState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const getToastState = () => toastState;

// Auto-dismiss timers
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Actions
export const toastActions = {
  /**
   * Show a new toast notification
   */
  show(options: Omit<Toast, 'id'> & { id?: string }): string {
    const id = options.id || generateId();
    const duration = options.duration ?? 5000; // Default 5 seconds

    const toast: Toast = {
      ...options,
      id,
      duration,
    };

    setState((prev) => {
      // Remove oldest toast if we've reached max
      let toasts = [...prev.toasts, toast];
      if (toasts.length > prev.maxToasts) {
        const removed = toasts.shift();
        if (removed) {
          const timer = dismissTimers.get(removed.id);
          if (timer) {
            clearTimeout(timer);
            dismissTimers.delete(removed.id);
          }
        }
      }
      return { ...prev, toasts };
    });

    // Set auto-dismiss timer
    if (duration > 0) {
      const timer = setTimeout(() => {
        toastActions.dismiss(id);
      }, duration);
      dismissTimers.set(id, timer);
    }

    return id;
  },

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string) {
    // Clear timer
    const timer = dismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.delete(id);
    }

    // Find and call onDismiss callback
    const toast = toastState.toasts.find((t) => t.id === id);
    if (toast?.onDismiss) {
      toast.onDismiss();
    }

    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  },

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    // Clear all timers
    dismissTimers.forEach((timer) => clearTimeout(timer));
    dismissTimers.clear();

    setState((prev) => ({
      ...prev,
      toasts: [],
    }));
  },

  /**
   * Show a success toast
   */
  success(title: string, message?: string, options?: Partial<Toast>) {
    return toastActions.show({
      type: 'success',
      title,
      message,
      ...options,
    });
  },

  /**
   * Show an error toast
   */
  error(title: string, message?: string, options?: Partial<Toast>) {
    return toastActions.show({
      type: 'error',
      title,
      message,
      duration: 0, // Errors persist by default
      ...options,
    });
  },

  /**
   * Show a warning toast
   */
  warning(title: string, message?: string, options?: Partial<Toast>) {
    return toastActions.show({
      type: 'warning',
      title,
      message,
      duration: 7000, // Warnings stay longer
      ...options,
    });
  },

  /**
   * Show an info toast
   */
  info(title: string, message?: string, options?: Partial<Toast>) {
    return toastActions.show({
      type: 'info',
      title,
      message,
      ...options,
    });
  },

  /**
   * Update an existing toast
   */
  update(id: string, updates: Partial<Omit<Toast, 'id'>>) {
    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      ),
    }));
  },

  /**
   * Show a toast with a promise
   */
  async promise<T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((err: Error) => string);
    }
  ): Promise<T> {
    const id = toastActions.show({
      type: 'info',
      title: options.loading,
      duration: 0, // Don't auto-dismiss while loading
    });

    try {
      const result = await promise;
      const successMessage = typeof options.success === 'function'
        ? options.success(result)
        : options.success;

      toastActions.update(id, {
        type: 'success',
        title: successMessage,
        duration: 5000,
      });

      // Set new timer
      const timer = setTimeout(() => {
        toastActions.dismiss(id);
      }, 5000);
      dismissTimers.set(id, timer);

      return result;
    } catch (err) {
      const errorMessage = typeof options.error === 'function'
        ? options.error(err as Error)
        : options.error;

      toastActions.update(id, {
        type: 'error',
        title: errorMessage,
        duration: 0,
      });

      throw err;
    }
  },

  /**
   * Set maximum number of toasts to display
   */
  setMaxToasts(max: number) {
    setState((prev) => ({
      ...prev,
      maxToasts: Math.max(1, max),
    }));
  },
};

// Convenience exports
export const toast = toastActions;
