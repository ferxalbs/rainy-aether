import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  RefreshCcw,
  GitCommitVertical,
  Loader2,
  Plus,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
} from "lucide-react";

import {
  commit as doCommit,
  refreshHistory,
  refreshStatus,
  refreshBranches,
  refreshStashes,
  selectCommit,
  stageFile,
  unstageFile,
  discardChanges,
  getFileDiff,
  push,
  pull,
  useGitState,
  Commit,
} from "@/stores/gitStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";
// Removed resizable imports - using CSS flexbox
import DiffViewer from "./DiffViewer";
import CommitDiffViewer from "./CommitDiffViewer";
import BranchManager from "./BranchManager";
import StashManager from "./StashManager";

const GitHistoryPanel: React.FC = () => {
  const [message, setMessage] = useState("");
  const [stageAll, setStageAll] = useState(true);

  const [diffViewer, setDiffViewer] = useState<{ filePath: string; diff: string; staged: boolean } | null>(null);
  const [commitDiffViewer, setCommitDiffViewer] = useState<Commit | null>(null);

  const {
    commits: history,
    status: changes,
    selectedCommit: selected,
    unpushedHashes,
    isRepo: repoDetected,
    loadingHistory,
  } = useGitState();

  useEffect(() => {
    refreshHistory(100);
    refreshStatus();
    refreshBranches();
    refreshStashes();
  }, []);

  const handleCommitConfirm = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    await doCommit(trimmed, stageAll);
    setMessage("");
  }, [message, stageAll]);

  const handleRefresh = useCallback(() => {
    refreshHistory(100);
    refreshStatus();
    refreshBranches();
    refreshStashes();
  }, []);

  const handleStageFile = useCallback(async (filePath: string) => {
    await stageFile(filePath);
  }, []);

  const handleUnstageFile = useCallback(async (filePath: string) => {
    await unstageFile(filePath);
  }, []);

  const handleDiscardChanges = useCallback(async (filePath: string) => {
    if (confirm(`Are you sure you want to discard all changes to ${filePath}?`)) {
      await discardChanges(filePath);
    }
  }, []);

  const handleViewDiff = useCallback(async (filePath: string, staged: boolean) => {
    try {
      const diff = await getFileDiff(filePath, staged);
      setDiffViewer({ filePath, diff, staged });
    } catch (error) {
      console.error('Failed to get diff:', error);
    }
  }, []);

  const handleViewCommitDiff = useCallback((commit: Commit) => {
    setCommitDiffViewer(commit);
  }, []);

  const handlePush = useCallback(async () => {
    try {
      await push();
    } catch (error) {
      console.error('Failed to push:', error);
    }
  }, []);

  const handlePull = useCallback(async () => {
    try {
      await pull();
    } catch (error) {
      console.error('Failed to pull:', error);
    }
  }, []);

  const isStaged = (code: string) => {
    return code[0] !== ' ' && code[0] !== '?';
  };

  const isUntracked = (code: string) => {
    return code[0] === '?' && code[1] === '?';
  };

  const getStatusIcon = (code: string) => {
    if (isStaged(code)) return <Check className="size-3 text-green-600" />;
    if (isUntracked(code)) return <Plus className="size-3 text-blue-600" />;
    return <Eye className="size-3 text-muted-foreground" />;
  };



  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-background text-sm">
        {/* Minimal Header */}
        <div className="flex items-center justify-between border-b border-border p-2 gap-2 h-10 shrink-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <BranchManager />
            <StashManager />
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handlePull}
              title="Pull"
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handlePush}
              title="Push"
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCcw className="size-3.5" />
            </Button>
          </div>
        </div>

        {repoDetected ? (
          <>
            {/* Commit Area */}
            <div className="p-3 border-b border-border bg-muted/5 shrink-0">
              <Textarea
                placeholder="Message..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[70px] text-xs resize-none bg-background mb-2 focus-visible:ring-1"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Switch checked={stageAll} onCheckedChange={setStageAll} className="scale-75 origin-left" />
                  <span>Stage all</span>
                </label>

                <div className="flex items-center gap-1">
                  <div className="flex rounded-md shadow-sm">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs rounded-r-none"
                      onClick={handleCommitConfirm}
                      disabled={!message.trim()}
                    >
                      Commit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-1.5 rounded-l-none border-l-0"
                          aria-label="Commit options"
                          disabled={!message.trim()}
                        >
                          <ChevronDown className="size-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[140px]">
                        <DropdownMenuItem onSelect={handleCommitConfirm}>
                          Commit
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Commit & Push</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Lists */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">

              {/* Changes Section */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Changes</span>
                {changes.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-mono">
                    {changes.length}
                  </Badge>
                )}
              </div>

              <div className="px-2 py-2">
                {changes.length > 0 ? (
                  <ul className="flex flex-col gap-0.5">
                    {changes.map((entry) => {
                      const staged = isStaged(entry.code);
                      const untracked = isUntracked(entry.code);
                      return (
                        <li key={`${entry.code}-${entry.path}`} className="group relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                          <div className="flex shrink-0 items-center justify-center w-4">
                            {getStatusIcon(entry.code)}
                          </div>
                          <span className="truncate text-xs text-foreground flex-1 cursor-pointer" onClick={() => handleViewDiff(entry.path, staged)}>
                            {entry.path}
                          </span>

                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 bg-background/80 shadow-sm rounded-sm backdrop-blur-[2px]">
                            {staged ? (
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-green-600" onClick={() => handleUnstageFile(entry.path)} title="Unstage">
                                <EyeOff className="size-3" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-blue-600" onClick={() => handleStageFile(entry.path)} title="Stage">
                                <Check className="size-3" />
                              </Button>
                            )}
                            {!untracked && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => handleDiscardChanges(entry.path)} title="Discard">
                                <RotateCcw className="size-3" />
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground italic">
                    No changes detected
                  </div>
                )}
              </div>

              {/* History Section */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-y border-border px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                <span>History</span>
                <span className="text-[10px] font-normal normal-case opacity-70">
                  {loadingHistory ? "Updating..." : `${history.length} commits`}
                </span>
              </div>

              <div className="px-2 py-2 pb-4">
                {loadingHistory && history.length === 0 ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length > 0 ? (
                  <ul className="relative flex flex-col gap-0 border-l border-border/50 ml-3 pl-3">
                    {history.map((commit) => {
                      const isSelected = selected === commit.hash;
                      const isUnpushed = unpushedHashes.has(commit.hash);
                      return (
                        <li
                          key={commit.hash}
                          className={cn(
                            "relative py-3 cursor-pointer group transition-all",
                            isSelected && ""
                          )}
                          onClick={() => {
                            selectCommit(commit.hash);
                            handleViewCommitDiff(commit);
                          }}
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute -left-[16.5px] top-4 size-2 rounded-full border border-background ring-1 ring-border/50 transition-colors bg-muted",
                            isSelected ? "bg-primary ring-primary" :
                              isUnpushed ? "bg-amber-500 ring-amber-500" : "bg-muted-foreground/40"
                          )} />

                          <div className={cn("rounded-md p-2 -my-2 transition-colors", isSelected ? "bg-accent/40" : "hover:bg-muted/30")}>
                            <div className="flex items-start justify-between gap-2">
                              <span className={cn("text-xs font-medium leading-tight line-clamp-2", isSelected ? "text-primary" : "text-foreground")}>
                                {commit.message}
                              </span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{commit.date}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground">{commit.author}</span>
                              {isUnpushed && (
                                <Badge variant="outline" className="h-3.5 px-1 py-0 text-[9px] border-amber-500/30 text-amber-600 bg-amber-500/5">
                                  Unpushed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground italic">
                    No history found
                  </div>
                )}
              </div>

            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col gap-2 p-6 text-center text-muted-foreground">
            <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
              <GitCommitVertical className="size-6 opacity-50" />
            </div>
            <p className="text-sm">No repository open</p>
            <p className="text-xs opacity-70">Open a folder with a Git repository to see source control.</p>
          </div>
        )}

        {/* Modals */}
        {diffViewer && (
          <DiffViewer
            filePath={diffViewer.filePath}
            diff={diffViewer.diff}
            staged={diffViewer.staged}
            isModal={true}
            onClose={() => setDiffViewer(null)}
          />
        )}
        {commitDiffViewer && (
          <CommitDiffViewer
            commit={commitDiffViewer}
            isModal={true}
            onClose={() => setCommitDiffViewer(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default GitHistoryPanel;
