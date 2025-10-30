import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, RefreshCcw, GitCommitVertical } from "lucide-react";

import {
  commit as doCommit,
  refreshHistory,
  refreshStatus,
  selectCommit,
  useGitState,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const GitHistoryPanel: React.FC = () => {
  const [message, setMessage] = useState("");
  const [stageAll, setStageAll] = useState(true);

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
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <GitCommitVertical className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Source Control</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={handleRefresh}
        >
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      </div>

      {repoDetected ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-3 border-b border-border px-3 py-4">
            <Textarea
              placeholder="Commit message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={stageAll} onCheckedChange={setStageAll} />
                Stage all changes
              </label>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessage("")}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>

                <div className="flex rounded-md shadow-sm">
                  <Button
                    size="sm"
                    className="rounded-r-none"
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
                        className="rounded-l-none border-l-0 px-2"
                        aria-label="Commit options"
                        disabled={!message.trim()}
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleCommitConfirm();
                        }}
                      >
                        Commit
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>Commit (amend)</DropdownMenuItem>
                      <DropdownMenuItem disabled>Commit & Push</DropdownMenuItem>
                      <DropdownMenuItem disabled>Commit & Sync</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="overflow-auto px-3 py-4">
              <Accordion
                type="multiple"
                defaultValue={changes.length > 0 ? ["changes"] : []}
                className="space-y-3"
              >
                <AccordionItem
                  value="changes"
                  className="rounded-md border border-border bg-muted/20"
                >
                  <AccordionTrigger className="px-3 py-2 text-sm font-medium">
                    <div className="flex w-full items-center justify-between">
                      <span>Changes</span>
                      {changes.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {changes.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3">
                    {changes.length > 0 ? (
                      <ul className="flex flex-col gap-2 text-sm">
                        {changes.map((entry) => (
                          <li
                            key={`${entry.code}-${entry.path}`}
                            className="flex items-center justify-between rounded-md border border-border bg-background/80 px-3 py-2 text-sm"
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              {entry.code}
                            </span>
                            <span className="truncate text-sm">{entry.path}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        No changes detected.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <Separator />

            <div className="flex-1 overflow-hidden px-3 py-4">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">Graph</span>
                {loadingHistory && <span>Updating…</span>}
              </div>
              <div className="h-full overflow-auto">
                {history.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {loadingHistory ? "Loading history…" : "No commits recorded."}
                  </div>
                ) : (
                  <ul className="relative flex flex-col gap-3 border-l border-border pl-4">
                    {history.map((commit, index) => {
                      const isSelected = selected === commit.hash;
                      const isUnpushed = unpushedHashes.has(commit.hash);

                      return (
                        <li
                          key={commit.hash}
                          className={cn(
                            "relative cursor-pointer rounded-md border border-transparent bg-muted/10 px-3 py-2 transition-colors hover:bg-muted/30",
                            isSelected && "border-ring bg-accent/40"
                          )}
                          onClick={() => selectCommit(commit.hash)}
                        >
                          <span
                            className={cn(
                              "absolute -left-7 top-3 size-3 rounded-full border-2 border-background",
                              isSelected ? "bg-primary" : "bg-muted-foreground"
                            )}
                          />
                          {index !== history.length - 1 && (
                            <span className="absolute -left-[25px] top-3 h-[calc(100%+12px)] w-px bg-border" />
                          )}

                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{commit.message}</span>
                            {isUnpushed && <Badge variant="secondary">Unpushed</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {commit.author}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {commit.date}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          This project is not a Git repository.
        </div>
      )}
    </div>
  );
};

export default GitHistoryPanel;
