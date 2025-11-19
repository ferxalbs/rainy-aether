import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useSearchState,
  searchActions,
  FileSearchResult,
  SearchMatch,
} from "@/stores/searchStore";
import { useIDEState, ideActions } from "@/stores/ideStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import {
  Search,
  ChevronDown,
  ChevronRight,
  File,
  Replace,
  CaseSensitive,
  WholeWord,
  Regex,
  RefreshCw,
  FolderOpen,
  FolderClosed,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const searchState = useSearchState();
  const ideState = useIDEState();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showReplace, setShowReplace] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const workspacePath = ideState.workspace?.path;

  // Focus search input when opened
  useEffect(() => {
    if (searchState.isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchState.isOpen]);

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      searchActions.setQuery(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim() && workspacePath) {
        searchTimeoutRef.current = window.setTimeout(() => {
          searchActions.search(workspacePath);
        }, 300);
      } else {
        searchActions.clearResults();
      }
    },
    [workspacePath]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && workspacePath) {
        e.preventDefault();
        searchActions.search(workspacePath);
      } else if (e.key === "Escape") {
        searchActions.close();
      }
    },
    [workspacePath]
  );

  const handleResultClick = useCallback(
    async (result: FileSearchResult, match: SearchMatch) => {
      // Open the file
      await ideActions.openFile({
        name: result.name,
        path: result.path,
        is_directory: false,
      });

      // Navigate to line after a small delay to ensure editor is ready
      setTimeout(() => {
        try {
          const { editorActions } = require("@/stores/editorStore");
          editorActions.goToLine(match.line_number);
        } catch (error) {
          console.error("Failed to navigate to line:", error);
        }
      }, 100);
    },
    []
  );

  const getRelativePath = useCallback(
    (fullPath: string) => {
      if (workspacePath && fullPath.startsWith(workspacePath)) {
        return fullPath.slice(workspacePath.length + 1);
      }
      return fullPath;
    },
    [workspacePath]
  );

  const highlightMatch = useCallback(
    (line: string, matchStart: number, matchEnd: number) => {
      const before = line.slice(0, matchStart);
      const match = line.slice(matchStart, matchEnd);
      const after = line.slice(matchEnd);

      return (
        <>
          <span className="text-muted-foreground">{before}</span>
          <span className="bg-yellow-500/30 text-foreground font-medium">
            {match}
          </span>
          <span className="text-muted-foreground">{after}</span>
        </>
      );
    },
    []
  );

  if (!workspacePath) {
    return (
      <div className={cn("flex flex-col h-full p-4", className)}>
        <div className="text-sm text-muted-foreground text-center">
          Open a workspace to search files
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search Header */}
      <div className="p-2 border-b border-border space-y-2">
        {/* Search Input Row */}
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchState.query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search"
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Search Options */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={searchState.options.case_sensitive ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => searchActions.toggleOption("case_sensitive")}
                >
                  <CaseSensitive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Match Case</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={searchState.options.whole_word ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => searchActions.toggleOption("whole_word")}
                >
                  <WholeWord className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Match Whole Word</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={searchState.options.use_regex ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => searchActions.toggleOption("use_regex")}
                >
                  <Regex className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Use Regular Expression</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Replace Input Row */}
        {showReplace && (
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Replace className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchState.replaceText}
                onChange={(e) => searchActions.setReplaceText(e.target.value)}
                placeholder="Replace"
                className="pl-8 h-8 text-sm"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => searchActions.replaceAll(workspacePath)}
                    disabled={!searchState.query || searchState.results.length === 0}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Replace All</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Filter Options */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                {showFilters ? (
                  <ChevronDown className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronRight className="h-3 w-3 mr-1" />
                )}
                Filters
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setShowReplace(!showReplace)}
            >
              <Replace className="h-3 w-3 mr-1" />
              {showReplace ? "Hide Replace" : "Show Replace"}
            </Button>
          </div>
          <CollapsibleContent className="space-y-2 mt-2">
            <Input
              value={searchState.options.include_pattern || ""}
              onChange={(e) =>
                searchActions.setOption("include_pattern", e.target.value || null)
              }
              placeholder="Files to include (e.g., *.ts, *.tsx)"
              className="h-7 text-xs"
            />
            <Input
              value={searchState.options.exclude_pattern || ""}
              onChange={(e) =>
                searchActions.setOption("exclude_pattern", e.target.value || null)
              }
              placeholder="Files to exclude (e.g., *.test.ts)"
              className="h-7 text-xs"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Results Summary */}
        {searchState.query && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {searchState.isSearching
                ? "Searching..."
                : `${searchState.totalMatches} results in ${searchState.results.length} files`}
            </span>
            {searchState.results.length > 0 && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-1"
                  onClick={() => searchActions.expandAllFiles()}
                >
                  <FolderOpen className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-1"
                  onClick={() => searchActions.collapseAllFiles()}
                >
                  <FolderClosed className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {searchState.error && (
            <div className="p-2 text-sm text-destructive">{searchState.error}</div>
          )}

          {searchState.results.map((result) => (
            <FileResultItem
              key={result.path}
              result={result}
              isExpanded={searchState.expandedFiles.has(result.path)}
              onToggle={() => searchActions.toggleFileExpanded(result.path)}
              onMatchClick={(match) => handleResultClick(result, match)}
              relativePath={getRelativePath(result.path)}
              highlightMatch={highlightMatch}
              showReplace={showReplace}
              workspacePath={workspacePath}
            />
          ))}

          {!searchState.isSearching &&
            searchState.query &&
            searchState.results.length === 0 &&
            !searchState.error && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No results found
              </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FileResultItemProps {
  result: FileSearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onMatchClick: (match: SearchMatch) => void;
  relativePath: string;
  highlightMatch: (
    line: string,
    matchStart: number,
    matchEnd: number
  ) => React.ReactNode;
  showReplace: boolean;
  workspacePath: string;
}

function FileResultItem({
  result,
  isExpanded,
  onToggle,
  onMatchClick,
  relativePath,
  highlightMatch,
  showReplace,
  workspacePath,
}: FileResultItemProps) {
  return (
    <div className="mb-1">
      {/* File Header */}
      <button
        className="flex items-center gap-1 w-full px-1 py-0.5 hover:bg-accent/50 rounded text-left"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        <File className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        <span className="text-xs truncate flex-1" title={result.path}>
          {relativePath}
        </span>
        <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
          {result.matches.length}
        </span>
        {showReplace && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              searchActions.replaceInFile(result.path, workspacePath);
            }}
          >
            <Replace className="h-3 w-3" />
          </Button>
        )}
      </button>

      {/* Matches */}
      {isExpanded && (
        <div className="ml-4 border-l border-border">
          {result.matches.map((match, index) => (
            <button
              key={`${match.line_number}-${index}`}
              className="flex items-start gap-2 w-full px-2 py-0.5 hover:bg-accent/50 text-left"
              onClick={() => onMatchClick(match)}
            >
              <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">
                {match.line_number}
              </span>
              <span className="text-xs truncate flex-1 font-mono">
                {highlightMatch(
                  match.line_content.trim(),
                  match.match_start -
                    (match.line_content.length - match.line_content.trimStart().length),
                  match.match_end -
                    (match.line_content.length - match.line_content.trimStart().length)
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
