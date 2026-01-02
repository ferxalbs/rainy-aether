import React, { useState } from "react";
import {
    GitBranch,
    Github,
    Download,
    ExternalLink,
    Loader2,
    FolderGit2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { initRepository } from "@/stores/gitStore";
import CloneDialog from "./CloneDialog";

/**
 * GitWelcome - VS Code-style welcome screen when no repository is detected.
 * Provides options to initialize a repo, clone an existing one, or learn more.
 */
const GitWelcome: React.FC = () => {
    const [isInitializing, setIsInitializing] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

    const handleInitialize = async () => {
        setIsInitializing(true);
        try {
            await initRepository();
        } finally {
            setIsInitializing(false);
        }
    };

    const handleOpenDocs = () => {
        // Open Git documentation in external browser
        window.open("https://git-scm.com/doc", "_blank");
    };

    const handlePublishToGitHub = () => {
        // Phase 1: Open GitHub docs for creating a new repo
        window.open("https://docs.github.com/en/get-started/quickstart/create-a-repo", "_blank");
    };

    return (
        <div className="flex flex-1 flex-col p-4 text-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <FolderGit2 className="size-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Source Control</h2>
            </div>

            {/* Info Section */}
            <div className="space-y-4 mb-6">
                <p className="text-muted-foreground leading-relaxed">
                    The folder currently open doesn't have a Git repository. You can initialize a
                    repository which will enable source control features powered by Git.
                </p>
            </div>

            {/* Primary Action - Initialize */}
            <div className="space-y-3">
                <Button
                    className="w-full justify-center gap-2 h-9"
                    onClick={handleInitialize}
                    disabled={isInitializing}
                >
                    {isInitializing ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        <>
                            <GitBranch className="size-4" />
                            Initialize Repository
                        </>
                    )}
                </Button>
            </div>

            {/* Documentation Link */}
            <p className="text-xs text-muted-foreground mt-4 mb-4">
                To learn more about how to use Git and source control in the IDE{" "}
                <button
                    onClick={handleOpenDocs}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                >
                    read our docs
                    <ExternalLink className="size-3" />
                </button>
                .
            </p>

            {/* Secondary Section - Publish to GitHub */}
            <div className="pt-4 border-t border-border space-y-3">
                <p className="text-muted-foreground text-xs">
                    You can directly publish this folder to a GitHub repository. Once published,
                    you'll have access to source control features powered by Git and GitHub.
                </p>

                <Button
                    variant="outline"
                    className="w-full justify-center gap-2 h-9 bg-background/10 backdrop-blur-3xl border-border hover:bg-muted/50"
                    onClick={handlePublishToGitHub}
                >
                    <Github className="size-4" />
                    Publish to GitHub
                </Button>
            </div>

            {/* Clone Repository Section */}
            <div className="pt-4 mt-4 border-t border-border">
                <p className="text-muted-foreground text-xs mb-3">
                    Or clone an existing repository from a remote URL.
                </p>

                <Button
                    variant="outline"
                    className="w-full justify-center gap-2 h-9 bg-background/10 backdrop-blur-3xl border-border hover:bg-muted/50"
                    onClick={() => setCloneDialogOpen(true)}
                >
                    <Download className="size-4" />
                    Clone Repository
                </Button>
            </div>

            {/* Clone Dialog */}
            <CloneDialog
                isOpen={cloneDialogOpen}
                onClose={() => setCloneDialogOpen(false)}
            />
        </div>
    );
};

export default GitWelcome;
