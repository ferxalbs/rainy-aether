import React, { useState, useCallback } from "react";
import { GitBranch, FolderOpen, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cloneRepository, useGitState } from "@/stores/gitStore";
import { open } from "@tauri-apps/plugin-dialog";

interface CloneDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (path: string) => void;
}

const CloneDialog: React.FC<CloneDialogProps> = ({ trigger, isOpen: controlledIsOpen, onClose, onSuccess }) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : uncontrolledIsOpen;
  const setIsOpen = onClose !== undefined
    ? (open: boolean) => { if (!open) onClose(); }
    : setUncontrolledIsOpen;
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [branch, setBranch] = useState("");
  const [depth, setDepth] = useState("");
  const [useDepth, setUseDepth] = useState(false);
  
  const { isCloning, cloneProgress } = useGitState();

  const handleBrowseDestination = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Clone Destination",
      });
      
      if (selected && typeof selected === 'string') {
        setDestination(selected);
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
    }
  }, []);

  const handleClone = useCallback(async () => {
    if (!url.trim() || !destination.trim()) {
      return;
    }

    try {
      const depthNum = useDepth && depth ? parseInt(depth) : undefined;
      await cloneRepository(
        url.trim(),
        destination.trim(),
        branch.trim() || undefined,
        depthNum
      );
      
      // Reset form
      setUrl("");
      setDestination("");
      setBranch("");
      setDepth("");
      setUseDepth(false);
      setIsOpen(false);
      
      if (onSuccess) {
        onSuccess(destination.trim());
      }
    } catch (error) {
      console.error('Failed to clone repository:', error);
    }
  }, [url, destination, branch, depth, useDepth, onSuccess]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Download className="size-4" />
      Clone Repository
    </Button>
  );

  // When controlled (isOpen provided), don't use trigger
  const isControlled = controlledIsOpen !== undefined;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clone Git Repository</DialogTitle>
          <DialogDescription>
            Clone a remote repository to your local machine
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="clone-url">Repository URL *</Label>
            <Input
              id="clone-url"
              placeholder="https://github.com/user/repo.git"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isCloning}
            />
            <p className="text-xs text-muted-foreground">
              HTTPS, SSH, or Git protocol URL
            </p>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="clone-dest">Destination Directory *</Label>
            <div className="flex gap-2">
              <Input
                id="clone-dest"
                placeholder="/path/to/destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={isCloning}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowseDestination}
                disabled={isCloning}
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label htmlFor="clone-branch">Branch (optional)</Label>
            <div className="flex gap-2">
              <GitBranch className="size-4 mt-2 text-muted-foreground" />
              <Input
                id="clone-branch"
                placeholder="main, develop, etc."
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={isCloning}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to clone the default branch
            </p>
          </div>

          {/* Shallow Clone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="use-depth" className="text-sm font-normal">
                Shallow clone (faster, less history)
              </Label>
              <Button
                type="button"
                variant={useDepth ? "default" : "outline"}
                size="sm"
                onClick={() => setUseDepth(!useDepth)}
                disabled={isCloning}
              >
                {useDepth ? "Enabled" : "Disabled"}
              </Button>
            </div>
            
            {useDepth && (
              <div className="space-y-2">
                <Label htmlFor="depth-input">Depth</Label>
                <Input
                  id="depth-input"
                  type="number"
                  placeholder="1"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  disabled={isCloning}
                  min="1"
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Number of commits to fetch (1 = latest only)
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          {isCloning && cloneProgress && (
            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                <span className="font-medium">Cloning repository...</span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                {cloneProgress}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              disabled={!url.trim() || !destination.trim() || isCloning}
            >
              {isCloning ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  Clone Repository
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloneDialog;
