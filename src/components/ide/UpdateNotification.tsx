import { useUpdateState, updateActions } from "@/stores/updateStore";

export function UpdateNotification() {
  const updateState = useUpdateState();
  const { updateInfo, showNotification } = updateState;

  // Don't show anything if notification is dismissed or no update available
  if (!showNotification || !updateInfo?.available) {
    return null;
  }

  const handleViewDetails = () => {
    updateActions.dismissNotification();
    updateActions.openModal();
  };

  const handleDismiss = () => {
    updateActions.dismissNotification();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border border-border/50 rounded-lg px-4 py-3 shadow-lg">
        {/* Pulse indicator */}
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />

        {/* Content */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">
            Update available:{" "}
            <span className="font-semibold text-accent">
              v{updateInfo.latestVersion}
            </span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={handleViewDetails}
            className="text-xs font-medium text-accent hover:text-accent/80 transition-colors px-2 py-1 rounded hover:bg-accent/10"
          >
            View Details
          </button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50"
            aria-label="Dismiss notification"
          >
            <svg
              className="w-4 h-4"
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
      </div>
    </div>
  );
}
