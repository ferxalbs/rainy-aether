import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIDEStore, type FileNode } from "../../stores/ideStore";
import { Search, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simple fuzzy match scoring: prioritize name hits over path hits, shorter paths rank higher
function matchScore(query: string, node: FileNode): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const name = node.name.toLowerCase();
  const path = node.path.toLowerCase();
  let score = -Infinity;
  if (name.includes(q)) score = Math.max(score, 100 - name.length);
  if (path.includes(q)) score = Math.max(score, 60 - path.length);
  return score === -Infinity ? -1 : score;
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

  const files = useMemo(() => flattenFiles(snapshot.projectTree), [snapshot.projectTree]);

  const results = useMemo(() => {
    const scored = files
      .map((node) => ({ node, score: matchScore(query, node) }))
      .filter((entry) => entry.score >= 0 || query === "")
      .sort((a, b) => b.score - a.score);
    const source = query ? scored : files.map((node) => ({ node, score: 0 }));
    return source.map((entry) => entry.node).slice(0, 50);
  }, [files, query]);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={close}>
      <div className="mx-auto mt-24 max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="rounded-md border border-border bg-secondary text-foreground shadow-xl">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search size={16} className="opacity-70" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Quick Open: type a file name…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <button className="text-xs text-muted-foreground" title="Close" onClick={close}>
              Esc
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {results.map((item, index) => {
              const isActive = selectedIndex === index;
              return (
                <div
                  key={item.path}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer flex items-center gap-2",
                    isActive ? "bg-muted" : "hover:bg-muted",
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    setSelectedIndex(index);
                    openSelected();
                  }}
                >
                  <FileIcon size={14} className="opacity-70" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.path}</div>
                  </div>
                </div>
              );
            })}

            {results.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">No matching files</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickOpen;