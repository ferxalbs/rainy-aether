/**
 * Interactive theme preview component for Rainy Aether IDE
 * Provides real-time theme visualization and testing
 */

import React, { useEffect, useMemo, useState } from "react";
import { Theme } from "../../themes";
import { validateThemeAccessibility } from "../../themes/themeValidator";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

interface ThemePreviewProps {
  theme: Theme;
  isActive?: boolean;
  showControls?: boolean;
  onThemeSelect?: (theme: Theme) => void;
}

const initialPreview = 'function hello() {\n  console.log("Hello, World!");\n  return true;\n}';

const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  isActive = false,
  showControls = false,
  onThemeSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewText, setPreviewText] = useState(initialPreview);
  const [showAccessibility, setShowAccessibility] = useState(false);

  useEffect(() => {
    if (!showControls) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPreviewText((current) => {
        if (!current) {
          return current;
        }

        if (current.includes("|")) {
          return current.replace("|", "");
        }

        const insertPos = Math.floor(Math.random() * current.length);
        return `${current.slice(0, insertPos)}|${current.slice(insertPos)}`;
      });
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [showControls]);

  const accessibility = useMemo(
    () => validateThemeAccessibility(theme.variables),
    [theme],
  );

  const handleClick = () => {
    onThemeSelect?.(theme);
  };

  const toggleAccessibility = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowAccessibility((prev) => !prev);
  };

  const cssVars = useMemo<React.CSSProperties>(
    () =>
    ({
      "--preview-bg-primary": theme.variables["--bg-primary"],
      "--preview-bg-secondary": theme.variables["--bg-secondary"],
      "--preview-bg-tertiary": theme.variables["--bg-tertiary"],
      "--preview-bg-editor": theme.variables["--bg-editor"] || theme.variables["--bg-secondary"],
      "--preview-bg-status": theme.variables["--bg-status"] || theme.variables["--bg-secondary"],
      "--preview-text-primary": theme.variables["--text-primary"],
      "--preview-text-secondary": theme.variables["--text-secondary"],
      "--preview-text-editor": theme.variables["--text-editor"] || theme.variables["--text-primary"],
      "--preview-accent-primary": theme.variables["--accent-primary"],
      "--preview-accent-secondary": theme.variables["--accent-secondary"],
      "--preview-border-color": theme.variables["--border-color"],
    } as React.CSSProperties),
    [theme],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-auto min-h-[200px] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-0.5 hover:shadow-xl box-border group border-2",
        isActive ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border/50",
        !accessibility.isWCAGAACompliant && "opacity-80 border-destructive/50"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={cssVars}
    >
      {/* Background container that uses the theme variables */}
      <div className="absolute inset-0 flex flex-col bg-[var(--preview-bg-primary)] text-[var(--preview-text-primary)]">

        {/* Window Chrome */}
        <div className="h-8 bg-[var(--preview-bg-secondary)] border-b border-[var(--preview-border-color)] flex items-center px-2 relative z-10 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-black/10"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black/10"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#28ca42] border border-black/10"></div>
          </div>
          <div className="flex-1 text-center text-[10px] font-medium opacity-80 flex items-center justify-center gap-2">
            {theme.displayName}
            {showControls && (
              <button
                className={cn(
                  "p-0.5 rounded text-[8px] transition-colors",
                  accessibility.isWCAGAACompliant ? "text-green-500 hover:bg-green-500/10" : "text-yellow-500 hover:bg-yellow-500/10"
                )}
                onClick={toggleAccessibility}
                title="Toggle accessibility info"
              >
                {accessibility.isWCAGAACompliant ? "✓" : "⚠"}
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-7 bg-[var(--preview-bg-tertiary)] border-b border-[var(--preview-border-color)] flex items-center px-2 gap-3 z-10 shrink-0">
          <div className="text-[10px] opacity-60 px-1.5 py-0.5 rounded bg-[var(--preview-bg-primary)]">main.rs</div>
          <div className="text-[10px] opacity-40">Search</div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-[var(--preview-bg-editor)] text-[var(--preview-text-editor)] font-mono text-[10px] leading-relaxed p-2 overflow-hidden z-10">
          <div className="flex gap-2">
            <span className="text-[var(--preview-text-secondary)] select-none w-3 text-right">1</span>
            <span className="whitespace-pre">
              <span className="text-[var(--preview-accent-primary)] font-bold">fn</span> <span className="text-[#795e26] dark:text-[#dcdcaa]">main</span>() {"{"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--preview-text-secondary)] select-none w-3 text-right">2</span>
            <span className="whitespace-pre">
              {"  "}<span className="text-[#795e26] dark:text-[#dcdcaa]">println!</span>(<span className="text-[#a31515] dark:text-[#ce9178]">"Hello!"</span>);
            </span>
          </div>
          <div className="flex gap-2 bg-black/5 dark:bg-white/5 -mx-2 px-2">
            <span className="text-[var(--preview-text-secondary)] select-none w-3 text-right">3</span>
            <span className="whitespace-pre flex">
              {"  "}<span className="text-[#008000] dark:text-[#6a9955] italic">// {theme.mode} theme</span>
              {previewText.includes("|") && <span className="w-0.5 h-3 bg-[var(--preview-accent-primary)] animate-pulse ml-0.5 mt-0.5 block"></span>}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--preview-text-secondary)] select-none w-3 text-right">4</span>
            <span className="whitespace-pre">{"}"}</span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-5 bg-[var(--preview-bg-status)] border-t border-[var(--preview-border-color)] flex items-center justify-between px-2 text-[9px] opacity-70 z-10 shrink-0">
          <div className="flex gap-2">
            <span>Rust</span>
            <span>UTF-8</span>
          </div>
          <div className="font-medium text-[var(--preview-accent-primary)]">{theme.displayName}</div>
        </div>
      </div>

      {/* Hover Overlay */}
      {isHovered && showControls && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-20 animate-in fade-in duration-200">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold shadow-lg scale-95 hover:scale-100 transition-transform">
            Apply Theme
          </div>
        </div>
      )}

      {/* Accessibility details overlay */}
      {showAccessibility && (
        <div className="absolute inset-0 bg-black/95 z-30 flex items-center justify-center p-4 text-white animate-in zoom-in-95 duration-200">
          <div className="w-full h-full overflow-y-auto p-2 scrollbar-hide text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <h4 className="font-bold text-sm">Accessibility Check</h4>
              <button
                onClick={toggleAccessibility}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between"><span>Primary:</span> <span className="font-mono">{accessibility.contrastRatios.primaryText.toFixed(1)}:1</span></div>
              <div className="flex justify-between"><span>Secondary:</span> <span className="font-mono">{accessibility.contrastRatios.secondaryText.toFixed(1)}:1</span></div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/10">
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", accessibility.isWCAGAACompliant ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                AA {accessibility.isWCAGAACompliant ? "PASS" : "FAIL"}
              </span>
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", accessibility.isWCAGAAACompliant ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                AAA {accessibility.isWCAGAAACompliant ? "PASS" : "FAIL"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemePreview;