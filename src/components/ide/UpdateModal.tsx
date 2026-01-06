import { useState } from "react";
import { useUpdateState, updateActions } from "@/stores/updateStore";
import {
  installUpdate,
  restartApp,
  checkForUpdates,
} from "@/services/updateService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function UpdateModal() {
  const updateState = useUpdateState();
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const { isModalOpen, updateStep, updateInfo, updateProgress } = updateState;

  const handleClose = () => {
    updateActions.closeModal();
  };

  const handleCheckAgain = async () => {
    updateActions.setUpdateStep("checking");
    await checkForUpdates();
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    await installUpdate();
    setIsInstalling(false);
  };

  const handleRestart = async () => {
    await restartApp();
  };

  const renderContent = () => {
    switch (updateStep) {
      case "checking":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Checking for updates...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Connecting to update server
              </p>
            </div>
          </div>
        );

      case "up-to-date":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                You're up to date!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Version {updateInfo?.currentVersion || "unknown"} is the latest
                version
              </p>
              {updateProgress.message &&
                updateProgress.status === "dev-mode" && (
                  <p className="text-xs text-amber-500 mt-3 bg-amber-500/10 px-3 py-2 rounded-md">
                    {updateProgress.message}
                  </p>
                )}
            </div>
          </div>
        );

      case "available":
        return (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  New Update Available
                </p>
                <p className="text-sm text-muted-foreground">
                  A new version is ready to install
                </p>
              </div>
            </div>

            {/* Version comparison */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current version:</span>
                <span className="font-mono text-foreground">
                  {updateInfo?.currentVersion}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New version:</span>
                <span className="font-mono text-accent font-semibold">
                  {updateInfo?.latestVersion}
                </span>
              </div>
              {updateInfo?.releaseDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Release date:</span>
                  <span className="text-foreground">
                    {updateInfo.releaseDate}
                  </span>
                </div>
              )}
            </div>

            {/* Release notes */}
            {updateInfo?.releaseNotes && (
              <div>
                <button
                  onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                  className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  {showReleaseNotes ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {showReleaseNotes ? "Hide" : "Show"} release notes
                </button>
                {showReleaseNotes && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-xs">
                      {updateInfo.releaseNotes}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "downloading":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Download className="w-8 h-8 text-accent animate-bounce" />
            </div>
            <div className="text-center w-full">
              <p className="text-lg font-medium text-foreground">
                Downloading update...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {updateProgress.message || "Please wait..."}
              </p>
              {updateProgress.progress !== undefined && (
                <div className="mt-4 w-full max-w-xs mx-auto">
                  <Progress value={updateProgress.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {updateProgress.progress.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "installing":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Installing update...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
          </div>
        );

      case "ready":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Update installed!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Restart the application to apply the update
              </p>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Update failed
              </p>
              <p className="text-sm text-destructive mt-1 max-w-sm">
                {updateProgress.message || "An error occurred while updating"}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Check for updates
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Click below to check for the latest version
              </p>
            </div>
          </div>
        );
    }
  };

  const renderFooter = () => {
    switch (updateStep) {
      case "checking":
      case "downloading":
      case "installing":
        return null; // No buttons during loading states

      case "up-to-date":
        return (
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={handleCheckAgain}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check Again
            </Button>
          </DialogFooter>
        );

      case "available":
        return (
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose}>
              Later
            </Button>
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="gap-2"
            >
              {isInstalling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Install Update
            </Button>
          </DialogFooter>
        );

      case "ready":
        return (
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose}>
              Later
            </Button>
            <Button onClick={handleRestart} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restart Now
            </Button>
          </DialogFooter>
        );

      case "error":
        return (
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handleCheckAgain} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </DialogFooter>
        );

      default:
        return (
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCheckAgain} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Check for Updates
            </Button>
          </DialogFooter>
        );
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-md bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-border/50"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Software Update
          </DialogTitle>
          <DialogDescription>
            Keep Rainy Aether up to date for the best experience
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}
