import React, { useState, useCallback } from "react";
import { GitBranch, Plus, Check, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  checkoutBranch,
  createBranch,
  useGitState,
} from "@/stores/gitStore";

interface BranchManagerProps {
  trigger?: React.ReactNode;
}

const BranchManager: React.FC<BranchManagerProps> = ({ trigger }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const { branches, currentBranch, loadingBranches } = useGitState();

  const handleCreateBranch = useCallback(async () => {
    if (!newBranchName.trim()) return;
    
    setIsCreating(true);
    try {
      await createBranch(newBranchName.trim());
      setNewBranchName("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create branch:', error);
    } finally {
      setIsCreating(false);
    }
  }, [newBranchName]);

  const handleCheckoutBranch = useCallback(async (branchName: string) => {
    try {
      await checkoutBranch(branchName);
    } catch (error) {
      console.error('Failed to checkout branch:', error);
    }
  }, []);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
      <GitBranch className="size-4" />
      {currentBranch || "No branch"}
    </Button>
  );

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || defaultTrigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Branches
            </div>
            {loadingBranches ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : branches.length > 0 ? (
              <div className="max-h-48 overflow-y-auto">
                {branches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onSelect={() => handleCheckoutBranch(branch.name)}
                    className={cn(
                      "flex items-center gap-2 py-2",
                      branch.current && "bg-accent/50"
                    )}
                  >
                    {branch.current ? (
                      <Check className="size-3 text-green-600" />
                    ) : (
                      <GitBranch className="size-3 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{branch.name}</span>
                    {branch.current && (
                      <Badge variant="secondary" className="text-xs">
                        current
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                No branches found
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
                Create new branch...
              </DropdownMenuItem>
            </DialogTrigger>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              placeholder="feature/new-branch"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateBranch();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  Create Branch
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BranchManager;
