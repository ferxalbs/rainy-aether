import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { updateActions, UpdateInfo, UpdateProgress } from '@/stores/updateStore';

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Initialize update service and set up event listeners
 */
export async function initializeUpdateService(): Promise<void> {
  if (!isTauri) {
    console.warn('Update service is only available in Tauri mode');
    return;
  }

  // Listen for update status events from backend
  await listen<UpdateProgress>('update-status', (event) => {
    updateActions.setUpdateProgress(event.payload);

    // Show notification when update is available
    if (event.payload.status === 'available') {
      updateActions.setShowNotification(true);
    }
  });

  console.log('Update service initialized');
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  if (!isTauri) {
    console.warn('Update checking is only available in Tauri mode');
    return null;
  }

  try {
    updateActions.setUpdateProgress({
      status: 'checking',
      message: 'Checking for updates...',
    });

    const updateInfo = await invoke<UpdateInfo>('check_for_updates');
    updateActions.setUpdateInfo(updateInfo);

    if (updateInfo.available) {
      updateActions.setShowNotification(true);
    }

    return updateInfo;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    updateActions.setUpdateProgress({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to check for updates',
    });
    return null;
  }
}

/**
 * Download and install an available update
 */
export async function installUpdate(): Promise<boolean> {
  if (!isTauri) {
    console.warn('Update installation is only available in Tauri mode');
    return false;
  }

  try {
    updateActions.setUpdateProgress({
      status: 'downloading',
      progress: 0,
      message: 'Starting download...',
    });

    await invoke('install_update');
    return true;
  } catch (error) {
    console.error('Failed to install update:', error);
    updateActions.setUpdateProgress({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to install update',
    });
    return false;
  }
}

/**
 * Get the current application version
 */
export async function getAppVersion(): Promise<string | null> {
  if (!isTauri) {
    return 'dev';
  }

  try {
    return await invoke<string>('get_app_version');
  } catch (error) {
    console.error('Failed to get app version:', error);
    return null;
  }
}

/**
 * Start automatic update checking
 */
let autoCheckInterval: number | null = null;

export function startAutoUpdateCheck(intervalHours: number = 24): void {
  if (!isTauri) {
    console.warn('Auto update checking is only available in Tauri mode');
    return;
  }

  // Clear existing interval if any
  stopAutoUpdateCheck();

  // Check immediately if needed
  if (updateActions.shouldAutoCheck()) {
    checkForUpdates();
  }

  // Set up interval
  const intervalMs = intervalHours * 60 * 60 * 1000;
  autoCheckInterval = window.setInterval(() => {
    if (updateActions.shouldAutoCheck()) {
      checkForUpdates();
    }
  }, intervalMs);

  console.log(`Auto update check started (every ${intervalHours} hours)`);
}

export function stopAutoUpdateCheck(): void {
  if (autoCheckInterval !== null) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
    console.log('Auto update check stopped');
  }
}

/**
 * Restart the application (typically after an update)
 */
export async function restartApp(): Promise<void> {
  if (!isTauri) {
    console.warn('App restart is only available in Tauri mode');
    return;
  }

  try {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (error) {
    console.error('Failed to restart app:', error);
  }
}
