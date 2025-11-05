import { useState } from 'react';
import { useUpdateState, updateActions } from '@/stores/updateStore';
import { installUpdate, restartApp, checkForUpdates } from '@/services/updateService';
import { cn } from '@/lib/cn';

export function UpdateNotification() {
  const updateState = useUpdateState();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { updateInfo, updateProgress, showNotification } = updateState;

  // Don't show anything if notification is dismissed or no update available
  if (!showNotification || !updateInfo?.available) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installUpdate();
    if (success) {
      // Installation successful, update will be applied on restart
      console.log('Update installed successfully');
    }
    setIsInstalling(false);
  };

  const handleRestart = async () => {
    await restartApp();
  };

  const handleDismiss = () => {
    updateActions.dismissNotification();
  };

  const handleCheckAgain = async () => {
    await checkForUpdates();
  };

  const isDownloading = updateProgress.status === 'downloading';
  const isReady = updateProgress.status === 'ready';
  const hasError = updateProgress.status === 'error';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h3 className="font-semibold text-foreground">
              {isReady ? 'Update Ready' : 'Update Available'}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss notification"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Version info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current version:</span>
              <span className="font-mono text-foreground">
                {updateInfo.currentVersion}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Latest version:</span>
              <span className="font-mono text-accent font-semibold">
                {updateInfo.latestVersion}
              </span>
            </div>

            {/* Release notes toggle */}
            {updateInfo.releaseNotes && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                <span>{showDetails ? 'Hide' : 'Show'} release notes</span>
                <svg
                  className={cn(
                    'w-4 h-4 transition-transform',
                    showDetails && 'rotate-180'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}

            {/* Release notes */}
            {showDetails && updateInfo.releaseNotes && (
              <div className="mt-2 p-3 bg-muted rounded border border-border text-sm text-foreground max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">
                  {updateInfo.releaseNotes}
                </pre>
              </div>
            )}

            {/* Progress bar */}
            {isDownloading && updateProgress.progress !== undefined && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {updateProgress.message}
                </p>
              </div>
            )}

            {/* Status message */}
            {updateProgress.message && !isDownloading && (
              <p
                className={cn(
                  'text-sm text-center',
                  hasError ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {updateProgress.message}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {isReady ? (
                <>
                  <button
                    onClick={handleRestart}
                    className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors font-medium"
                  >
                    Restart Now
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
                  >
                    Later
                  </button>
                </>
              ) : hasError ? (
                <>
                  <button
                    onClick={handleCheckAgain}
                    className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors font-medium"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling || isDownloading}
                    className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInstalling || isDownloading
                      ? 'Installing...'
                      : 'Install Update'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    disabled={isInstalling || isDownloading}
                    className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    Later
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
