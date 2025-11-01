import React, { useState, useCallback } from "react";
import { Archive, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  stashPush,
  stashPop,
  useGitState,
} from "@/stores/gitStore";

interface StashManagerProps {
  trigger?: React.ReactNode;
}

const StashManager: React.FC<StashManagerProps> = ({ trigger }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [isStashing, setIsStashing] = useState(false);
  
  const { stashes, loadingStashes } = useGitState();

  const handleStashPush = useCallback(async () => {
    setIsStashing(true);
    try {
      await stashPush(stashMessage.trim() || undefined);
      setStashMessage("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to stash changes:', error);
    } finally {
      setIsStashing(false);
    }
  }, [stashMessage]);

  const handleStashPop = useCallback(async (stashId: string) => {
    try {
      await stashPop(stashId);
    } catch (error) {
      console.error('Failed to pop stash:', error);
    }
  }, []);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
      <Archive className="size-4" />
      Stash
    </Button>
  );

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || defaultTrigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <div className="px-2 py-1.5">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Stashed Changes
            </div>
            {loadingStashes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : stashes.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {stashes.map((stash) => (
                  <DropdownMenuItem
                    key={stash.stash}
                    onSelect={() => handleStashPop(stash.stash)}
                    className="flex items-center gap-2 py-2 max-w-full"
                  >
                    <Archive className="size-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{stash.message}</div>
                      <div className="text-xs text-muted-foreground">{stash.stash}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                No stashed changes
              </div>
            )}
          </div>
          
          <div className="border-t border-border">
            <DialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsCreateDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="size-3" />
                Stash changes...
              </DropdownMenuItem>
            </DialogTrigger>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stash Changes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stash-message">Stash Message (optional)</Label>
            <Input
              id="stash-message"
              placeholder="WIP: work in progress"
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStashPush();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Stash your current changes to work on them later
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStashPush}
              disabled={isStashing}
            >
              {isStashing ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Stashing...
                </>
              ) : (
                <>
                  <Archive className="size-4 mr-2" />
                  Stash Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StashManager;
