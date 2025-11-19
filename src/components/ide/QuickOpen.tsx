import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIDEStore, type FileNode } from "../../stores/ideStore";
import { Search, File as FileIcon, Clock, FileCode, FileJson, FileText, Image, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
}

// Get file icon based on extension
function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return <FileCode size={14} className="text-blue-500" />;
    case "json":
      return <FileJson size={14} className="text-yellow-500" />;
    case "md":
    case "txt":
      return <FileText size={14} className="text-gray-500" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <Image size={14} className="text-green-500" />;
    case "toml":
    case "yaml":
    case "yml":
      return <Settings size={14} className="text-orange-500" />;
    case "css":
    case "scss":
    case "less":
      return <FileCode size={14} className="text-purple-500" />;
    case "html":
      return <FileCode size={14} className="text-orange-500" />;
    case "rs":
      return <FileCode size={14} className="text-orange-600" />;
    default:
      return <FileIcon size={14} className="opacity-70" />;
  }
}

// Advanced fuzzy match scoring
function matchScore(query: string, node: FileNode, recentFiles: string[]): number {
  if (!query) {
    // Without query, prioritize recent files
    const recentIndex = recentFiles.indexOf(node.path);
    if (recentIndex !== -1) {
      return 200 - recentIndex; // Recent files get high scores
    }
    return 0;
  }

  const q = query.toLowerCase();
  const name = node.name.toLowerCase();
  const path = node.path.toLowerCase();

  let score = -Infinity;

  // Exact name match
  if (name === q) {
    score = 1000;
  }
  // Name starts with query
  else if (name.startsWith(q)) {
    score = Math.max(score, 500 - name.length);
  }
  // Name contains query
  else if (name.includes(q)) {
    score = Math.max(score, 300 - name.length - name.indexOf(q));
  }
  // Fuzzy match in name (consecutive chars)
  else {
    const fuzzyScore = fuzzyMatch(q, name);
    if (fuzzyScore > 0) {
      score = Math.max(score, 100 + fuzzyScore);
    }
  }

  // Path match (lower priority)
  if (path.includes(q)) {
    score = Math.max(score, 50 - path.length / 10);
  }

  // Boost for recent files
  const recentIndex = recentFiles.indexOf(node.path);
  if (recentIndex !== -1 && score > 0) {
    score += 50 - recentIndex;
  }

  return score === -Infinity ? -1 : score;
}

// Fuzzy match: check if query chars appear in order in target
function fuzzyMatch(query: string, target: string): number {
  let queryIdx = 0;
  let score = 0;
  let consecutive = 0;

  for (let i = 0; i < target.length && queryIdx < query.length; i++) {
    if (target[i] === query[queryIdx]) {
      queryIdx++;
      consecutive++;
      // Bonus for consecutive matches
      score += consecutive * 2;
      // Bonus for matching at word boundaries (after ., -, _, or uppercase)
      if (i === 0 || /[.\-_]/.test(target[i - 1]) || (target[i - 1] !== target[i - 1].toUpperCase() && target[i] === target[i].toUpperCase())) {
        score += 5;
      }
    } else {
      consecutive = 0;
    }
  }

  // Return score only if all query chars were found
  return queryIdx === query.length ? score : 0;
}

// Highlight matched characters
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Try to find exact substring match first
  const exactIndex = t.indexOf(q);
  if (exactIndex !== -1) {
    return (
      <>
        {text.slice(0, exactIndex)}
        <span className="bg-yellow-500/30 font-semibold">
          {text.slice(exactIndex, exactIndex + query.length)}
        </span>
        {text.slice(exactIndex + query.length)}
      </>
    );
  }

  // Fuzzy highlight
  const result: React.ReactNode[] = [];
  let queryIdx = 0;
  let lastMatchEnd = 0;

  for (let i = 0; i < text.length && queryIdx < q.length; i++) {
    if (t[i] === q[queryIdx]) {
      if (i > lastMatchEnd) {
        result.push(text.slice(lastMatchEnd, i));
      }
      result.push(
        <span key={i} className="bg-yellow-500/30 font-semibold">
          {text[i]}
        </span>
      );
      lastMatchEnd = i + 1;
      queryIdx++;
    }
  }

  if (lastMatchEnd < text.length) {
    result.push(text.slice(lastMatchEnd));
  }

  return result.length > 0 ? <>{result}</> : text;
}

function flattenFiles(root: FileNode | null): FileNode[] {
  const out: FileNode[] = [];
  if (!root) return out;
  const stack: FileNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.is_directory) {
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i]);
        }
      }
    } else {
      out.push(node);
    }
  }
  return out;
}

const QuickOpen: React.FC<QuickOpenProps> = ({ isOpen, onClose }) => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const files = useMemo(() => flattenFiles(snapshot.projectTree), [snapshot.projectTree]);

  // Get recently opened files
  const recentFiles = useMemo(() => {
    return snapshot.openFiles.map((f) => f.path);
  }, [snapshot.openFiles]);

  // Get workspace path for relative path display
  const workspacePath = snapshot.workspace?.path || "";

  const results = useMemo(() => {
    const scored = files
      .map((node) => ({ node, score: matchScore(query, node, recentFiles) }))
      .filter((entry) => entry.score >= 0 || query === "")
      .sort((a, b) => b.score - a.score);
    const source = query ? scored : scored.sort((a, b) => b.score - a.score);
    return source.map((entry) => entry.node).slice(0, 100);
  }, [files, query, recentFiles]);

  const close = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const openSelected = useCallback(() => {
    if (results.length === 0) {
      return;
    }
    const index = Math.max(0, Math.min(selectedIndex, results.length - 1));
    const target = results[index];
    actions.openFile(target);
    close();
  }, [actions, close, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        openSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen, openSelected, results.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  // Get relative path
  const getRelativePath = useCallback((fullPath: string) => {
    if (workspacePath && fullPath.startsWith(workspacePath)) {
      return fullPath.slice(workspacePath.length + 1);
    }
    return fullPath;
  }, [workspacePath]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={close}>
      <div className="mx-auto mt-20 max-w-xl px-4" onClick={(event) => event.stopPropagation()}>
        <div className="rounded-lg border border-border bg-popover text-foreground shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-3 border-b">
            <Search size={16} className="text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search files by name..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Esc</kbd>
          </div>

          {/* Results list */}
          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {results.map((item, index) => {
              const isActive = selectedIndex === index;
              const isRecent = recentFiles.includes(item.path);
              const relativePath = getRelativePath(item.path);
              const dirPath = relativePath.split("/").slice(0, -1).join("/");

              return (
                <div
                  key={item.path}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    setSelectedIndex(index);
                    openSelected();
                  }}
                >
                  {getFileIcon(item.name)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {highlightMatch(item.name, query)}
                      </span>
                      {isRecent && !query && (
                        <Clock size={12} className="text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    {dirPath && (
                      <div className="text-xs text-muted-foreground truncate">
                        {dirPath}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {results.length === 0 && (
              <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                {query ? `No files matching "${query}"` : "No files in workspace"}
              </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1 py-0.5 bg-muted rounded border mr-1">↑↓</kbd>
                Navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-muted rounded border mr-1">↵</kbd>
                Open
              </span>
            </div>
            <span>{results.length} files</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickOpen;
