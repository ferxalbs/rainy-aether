import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

// Types
export interface SearchMatch {
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

export interface FileSearchResult {
  path: string;
  name: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  case_sensitive: boolean;
  whole_word: boolean;
  use_regex: boolean;
  include_pattern: string | null;
  exclude_pattern: string | null;
  max_results: number | null;
}

export interface SearchState {
  isOpen: boolean;
  query: string;
  replaceText: string;
  results: FileSearchResult[];
  isSearching: boolean;
  totalMatches: number;
  options: SearchOptions;
  expandedFiles: Set<string>;
  error: string | null;
}

const initialState: SearchState = {
  isOpen: false,
  query: "",
  replaceText: "",
  results: [],
  isSearching: false,
  totalMatches: 0,
  options: {
    case_sensitive: false,
    whole_word: false,
    use_regex: false,
    include_pattern: null,
    exclude_pattern: null,
    max_results: 1000,
  },
  expandedFiles: new Set<string>(),
  error: null,
};

let state: SearchState = { ...initialState };
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Search state listener error:", error);
    }
  });
};

const setState = (updater: (prev: SearchState) => SearchState) => {
  state = updater(state);
  notifyListeners();
};

const getState = () => state;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSearchState = () => useSyncExternalStore(subscribe, getState, getState);

// Actions
export const searchActions = {
  open() {
    setState((prev) => ({ ...prev, isOpen: true }));
  },

  close() {
    setState((prev) => ({ ...prev, isOpen: false }));
  },

  toggle() {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  },

  setQuery(query: string) {
    setState((prev) => ({ ...prev, query }));
  },

  setReplaceText(replaceText: string) {
    setState((prev) => ({ ...prev, replaceText }));
  },

  setOption<K extends keyof SearchOptions>(key: K, value: SearchOptions[K]) {
    setState((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  },

  toggleOption(key: keyof Pick<SearchOptions, "case_sensitive" | "whole_word" | "use_regex">) {
    setState((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: !prev.options[key] },
    }));
  },

  toggleFileExpanded(path: string) {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedFiles);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { ...prev, expandedFiles: newExpanded };
    });
  },

  expandAllFiles() {
    setState((prev) => {
      const newExpanded = new Set(prev.results.map((r) => r.path));
      return { ...prev, expandedFiles: newExpanded };
    });
  },

  collapseAllFiles() {
    setState((prev) => ({ ...prev, expandedFiles: new Set() }));
  },

  clearResults() {
    setState((prev) => ({
      ...prev,
      results: [],
      totalMatches: 0,
      error: null,
    }));
  },

  async search(workspacePath: string) {
    const currentQuery = state.query.trim();
    if (!currentQuery) {
      setState((prev) => ({ ...prev, results: [], totalMatches: 0, error: null }));
      return;
    }

    setState((prev) => ({ ...prev, isSearching: true, error: null }));

    try {
      const results = await invoke<FileSearchResult[]>("search_in_workspace", {
        path: workspacePath,
        query: currentQuery,
        options: state.options,
      });

      const totalMatches = results.reduce((sum, file) => sum + file.matches.length, 0);

      // Auto-expand files with few results
      const autoExpand = new Set<string>();
      if (results.length <= 10) {
        results.forEach((r) => autoExpand.add(r.path));
      }

      setState((prev) => ({
        ...prev,
        results,
        totalMatches,
        isSearching: false,
        expandedFiles: autoExpand,
      }));
    } catch (error) {
      console.error("Search failed:", error);
      setState((prev) => ({
        ...prev,
        results: [],
        totalMatches: 0,
        isSearching: false,
        error: String(error),
      }));
    }
  },

  async replaceInFile(filePath: string, workspacePath: string) {
    const currentQuery = state.query.trim();
    const replace = state.replaceText;

    if (!currentQuery) return;

    try {
      const count = await invoke<number>("replace_in_file", {
        path: filePath,
        search: currentQuery,
        replace,
        options: state.options,
      });

      console.log(`Replaced ${count} occurrences in ${filePath}`);

      // Re-search to update results
      await searchActions.search(workspacePath);
    } catch (error) {
      console.error("Replace failed:", error);
      setState((prev) => ({ ...prev, error: String(error) }));
    }
  },

  async replaceAll(workspacePath: string) {
    const currentQuery = state.query.trim();
    const replace = state.replaceText;

    if (!currentQuery) return;

    let totalReplaced = 0;

    for (const result of state.results) {
      try {
        const count = await invoke<number>("replace_in_file", {
          path: result.path,
          search: currentQuery,
          replace,
          options: state.options,
        });
        totalReplaced += count;
      } catch (error) {
        console.error(`Replace failed in ${result.path}:`, error);
      }
    }

    console.log(`Replaced ${totalReplaced} total occurrences`);

    // Re-search to update results
    await searchActions.search(workspacePath);
  },
};

export { getState as getSearchState };
