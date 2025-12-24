import React, { useState, useCallback, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addRemote, listRemotes, removeRemote, Remote, useGitState } from "@/stores/gitStore";
import { Trash2, Plus, ExternalLink } from "lucide-react";

interface RemoteConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const RemoteConfigDialog: React.FC<RemoteConfigDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const [name, setName] = useState("origin");
    const [url, setUrl] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const { remotes } = useGitState();

    useEffect(() => {
        if (open) {
            listRemotes();
        }
    }, [open]);

    const handleAddRemote = useCallback(async () => {
        if (!name.trim() || !url.trim()) return;

        setIsAdding(true);
        try {
            await addRemote(name.trim(), url.trim());
            setName("origin");
            setUrl("");
            onOpenChange(false);
        } catch {
            // Error is already handled by showGitError
        } finally {
            setIsAdding(false);
        }
    }, [name, url, onOpenChange]);

    const handleRemoveRemote = useCallback(async (remoteName: string) => {
        try {
            await removeRemote(remoteName);
        } catch {
            // Error is already handled by showGitError
        }
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configure Git Remote</DialogTitle>
                    <DialogDescription>
                        Add a remote repository URL to push and pull your changes.
                    </DialogDescription>
                </DialogHeader>

                {/* Existing remotes */}
                {remotes.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase">Configured Remotes</Label>
                        <div className="space-y-1">
                            {remotes.map((remote: Remote) => (
                                <div
                                    key={remote.name}
                                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                                >
                                    <div className="min-w-0 flex-1">
                                        <span className="font-medium">{remote.name}</span>
                                        <p className="text-xs text-muted-foreground truncate">{remote.fetch_url}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemoveRemote(remote.name)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add new remote form */}
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="remote-name">Remote Name</Label>
                        <Input
                            id="remote-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="origin"
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="remote-url">Repository URL</Label>
                        <Input
                            id="remote-url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://github.com/user/repo.git"
                            className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                            Supports HTTPS or SSH URLs (e.g., git@github.com:user/repo.git)
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-8"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddRemote}
                        disabled={!name.trim() || !url.trim() || isAdding}
                        className="h-8 gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Remote
                    </Button>
                </DialogFooter>

                <div className="pt-2 border-t">
                    <a
                        href="https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                        Learn more about remote repositories
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RemoteConfigDialog;
