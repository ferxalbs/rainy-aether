import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  RefreshCcw,
  GitCommitVertical,
  Loader2,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const GitHistoryPanel: React.FC = () => {
  const [message, setMessage] = useState("");
  const [stageAll, setStageAll] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(["changes", "graph"]);

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

  const setSectionOpen = useCallback((section: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(section);
      } else {
        next.delete(section);
      }
      return Array.from(next);
    });
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

          <ResizablePanelGroup
            direction="vertical"
            className="flex-1 overflow-hidden px-3 py-4"
          >
            <ResizablePanel
              defaultSize={55}
              minSize={25}
              collapsedSize={32}
              collapsible
            >
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-card-foreground shadow-sm">
                <Accordion
                  type="single"
                  collapsible
                  value={openSections.includes("changes") ? "changes" : undefined}
                  onValueChange={(value) =>
                    setSectionOpen("changes", Boolean(value))
                  }
                  className="flex h-full flex-col"
                >
                  <AccordionItem value="changes" className="border-b">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold">
                      <div className="flex w-full items-center justify-between">
                        <span>Changes</span>
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          {changes.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-border bg-background/80 px-2 py-0 text-[11px] font-medium"
                            >
                              {changes.length}
                            </Badge>
                          ) : (
                            "No changes"
                          )}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="flex-1 overflow-hidden px-4">
                      {changes.length > 0 ? (
                        <div className="custom-scrollbar -mx-1 max-h-[320px] overflow-auto pr-1">
                          <ul className="flex flex-col gap-2 text-sm">
                            {changes.map((entry) => (
                              <li
                                key={`${entry.code}-${entry.path}`}
                                className="flex items-center gap-3 rounded-md border border-border/60 bg-background/90 px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent/30"
                              >
                                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {entry.code}
                                </span>
                                <span className="truncate text-sm text-foreground">
                                  {entry.path}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No changes detected.
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="my-2" />
            <ResizablePanel
              defaultSize={45}
              minSize={20}
              collapsedSize={32}
              collapsible
            >
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-card-foreground shadow-sm">
                <Accordion
                  type="single"
                  collapsible
                  value={openSections.includes("graph") ? "graph" : undefined}
                  onValueChange={(value) => setSectionOpen("graph", Boolean(value))}
                  className="flex h-full flex-col"
                >
                  <AccordionItem value="graph" className="border-b">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold">
                      <div className="flex w-full items-center justify-between">
                        <span>Graph</span>
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          {loadingHistory ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" />
                              Updating…
                            </span>
                          ) : (
                            `${history.length} commits`
                          )}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="flex-1 overflow-hidden px-4">
                      {history.length === 0 ? (
                        <div className="flex h-full items-center justify-center py-10 text-xs text-muted-foreground">
                          {loadingHistory ? "Loading history…" : "No commits recorded."}
                        </div>
                      ) : (
                        <div className="custom-scrollbar -mx-1 max-h-[360px] overflow-auto pr-1">
                          <ul className="relative flex flex-col gap-3 pl-5">
                            {history.map((commit, index) => {
                              const isSelected = selected === commit.hash;
                              const isUnpushed = unpushedHashes.has(commit.hash);

                              return (
                                <li
                                  key={commit.hash}
                                  className={cn(
                                    "group relative cursor-pointer rounded-lg border border-transparent bg-muted/20 px-4 py-3 transition-all hover:bg-muted/40",
                                    isSelected && "border-ring bg-accent/50 shadow-sm"
                                  )}
                                  onClick={() => selectCommit(commit.hash)}
                                >
                                  <span
                                    className={cn(
                                      "absolute -left-[26px] top-4 size-3 rounded-full border-2 border-background transition-colors",
                                      isSelected
                                        ? "bg-primary"
                                        : isUnpushed
                                          ? "bg-amber-500"
                                          : "bg-muted-foreground"
                                    )}
                                  />
                                  {index !== history.length - 1 && (
                                    <span className="absolute -left-[22px] top-4 h-[calc(100%+12px)] w-px bg-border" />
                                  )}

                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <span className="flex-1 truncate text-left text-foreground">
                                      {commit.message}
                                    </span>
                                    {isUnpushed && (
                                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                        Unpushed
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground/80">
                                      {commit.author}
                                    </span>
                                    <span>{commit.date}</span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
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
