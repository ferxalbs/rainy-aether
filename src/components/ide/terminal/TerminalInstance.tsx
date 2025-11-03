/**
 * TerminalInstance Component
 *
 * Manages a single xterm.js terminal instance with:
 * - Monaco editor theme integration
 * - Proper lifecycle management
 * - Search addon support
 * - Web links support
 * - FitAddon for responsive sizing
 */

import React, { useEffect, useRef } from "react";
import { Terminal, ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { getTerminalService } from "@/services/terminalService";
import { useThemeState } from "@/stores/themeStore";
import { getTerminalState } from "@/stores/terminalStore";

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
  onResize?: (cols: number, rows: number) => void;
  searchQuery?: string;
}

// Convert theme to xterm theme
function convertToXtermTheme(themeMode: 'night' | 'day', vars: Record<string, string>): ITheme {
  return {
    background: vars['--bg-editor'] || vars['--bg-secondary'] || '#1e1e1e',
    foreground: vars['--text-editor'] || vars['--text-primary'] || '#f8f8f2',
    cursor: vars['--accent-primary'] || '#3b82f6',
    cursorAccent: vars['--bg-editor'] || vars['--bg-secondary'] || '#1e1e1e',
    selectionBackground: vars['--accent-primary'] ? `${vars['--accent-primary']}40` : '#3b82f640',
    black: themeMode === 'night' ? '#1e1e1e' : '#000000',
    red: '#f87171',
    green: '#22c55e',
    yellow: '#fbbf24',
    blue: vars['--accent-primary'] || '#3b82f6',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: themeMode === 'night' ? '#f8f8f2' : '#e5e5e5',
    brightBlack: '#6b7280',
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fde047',
    brightBlue: vars['--accent-secondary'] || '#60a5fa',
    brightMagenta: '#e9d5ff',
    brightCyan: '#67e8f9',
    brightWhite: '#ffffff',
  };
}

const TerminalInstance: React.FC<TerminalInstanceProps> = ({
  sessionId,
  isActive,
  onResize,
  searchQuery,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const themeSnapshot = useThemeState();
  const dataUnsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const state = getTerminalState();
    const config = state.config;
    const xtermTheme = convertToXtermTheme(themeSnapshot.currentTheme.mode, themeSnapshot.currentTheme.variables);

    const term = new Terminal({
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      cursorBlink: config.cursorBlink,
      cursorStyle: config.cursorStyle,
      scrollback: config.scrollback,
      convertEol: true,
      allowProposedApi: true,
      theme: xtermTheme,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(new WebLinksAddon());

    // Handle user input
    term.onData((data) => {
      const service = getTerminalService();
      service.write(sessionId, data);
    });

    // Open terminal in container
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Set up data listener
    const service = getTerminalService();
    const unsubscribe = service.onData((id, data) => {
      if (id === sessionId && terminalRef.current) {
        terminalRef.current.write(data);
      }
    });
    dataUnsubscribeRef.current = unsubscribe;

    // Initial resize
    if (onResize) {
      const { cols, rows } = term;
      onResize(cols, rows);
      service.resize(sessionId, cols, rows);
    }

    return () => {
      dataUnsubscribeRef.current?.();
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme
  useEffect(() => {
    if (!terminalRef.current) return;

    const xtermTheme = convertToXtermTheme(
      themeSnapshot.currentTheme.mode,
      themeSnapshot.currentTheme.variables
    );

    try {
      terminalRef.current.options.theme = xtermTheme;
    } catch (error) {
      console.warn('Failed to update terminal theme:', error);
    }
  }, [themeSnapshot.currentTheme]);

  // Handle search
  useEffect(() => {
    if (!searchAddonRef.current || !searchQuery) return;

    try {
      searchAddonRef.current.findNext(searchQuery, {
        decorations: {
          matchBackground: '#ffeb3b',
          matchOverviewRuler: '#ffeb3b',
          activeMatchBackground: '#ff9800',
          activeMatchColorOverviewRuler: '#ff9800',
        },
      });
    } catch (error) {
      console.warn('Terminal search error:', error);
    }
  }, [searchQuery]);

  // Focus when active
  useEffect(() => {
    if (isActive && terminalRef.current) {
      try {
        terminalRef.current.focus();
      } catch (error) {
        console.warn('Failed to focus terminal:', error);
      }
    }
  }, [isActive]);

  // Handle resize
  useEffect(() => {
    if (!fitAddonRef.current || !terminalRef.current) return;

    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current) return;

      try {
        fitAddonRef.current.fit();
        const { cols, rows } = terminalRef.current;
        if (onResize) {
          onResize(cols, rows);
        }
        const service = getTerminalService();
        service.resize(sessionId, cols, rows);
      } catch (error) {
        console.warn('Terminal resize error:', error);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleResize);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [sessionId, onResize]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ visibility: isActive ? 'visible' : 'hidden' }}
    />
  );
};

export default TerminalInstance;
