import React, { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Theme } from "../../themes";
import { switchBaseTheme, useThemeState, getAllThemes } from "../../stores/themeStore";
import ThemePreview from "./ThemePreview";

interface ThemeSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ isOpen, onClose }) => {
  const theme = useThemeState();

  const effectiveMode = useMemo<"day" | "night">(() => {
    return theme.userPreference === "system" ? theme.systemTheme : theme.userPreference;
  }, [theme.systemTheme, theme.userPreference]);

  // Get all themes including extension themes
  const availableThemes = useMemo(() => getAllThemes(), [theme.extensionThemeCount]);

  // Separate built-in and extension themes
  const { builtInThemes, extensionThemesList } = useMemo(() => {
    const builtIn: Theme[] = [];
    const extensions: Theme[] = [];

    for (const t of availableThemes) {
      if (t.source === 'extension') {
        extensions.push(t);
      } else {
        builtIn.push(t);
      }
    }

    return { builtInThemes: builtIn, extensionThemesList: extensions };
  }, [availableThemes]);

  // Get base names for built-in themes
  const baseNames = useMemo(() => {
    const set = new Set<string>();
    for (const item of builtInThemes) {
      const base = item.name.split("-")[0];
      set.add(base);
    }
    return Array.from(set);
  }, [builtInThemes]);

  const variantForBase = useCallback(
    (baseName: string): Theme | undefined => {
      return builtInThemes.find((item) => item.name === `${baseName}-${effectiveMode}`);
    },
    [builtInThemes, effectiveMode],
  );

  const handleBaseSelect = useCallback(
    (baseName: string) => {
      switchBaseTheme(baseName, effectiveMode);
      onClose();
    },
    [effectiveMode, onClose],
  );

  const handleExtensionThemeSelect = useCallback(
    async (extensionTheme: Theme) => {
      const { setCurrentTheme } = await import("../../stores/themeStore");
      await setCurrentTheme(extensionTheme);
      onClose();
    },
    [onClose],
  );

  const currentBase = useMemo(() => theme.currentTheme.name.split("-")[0], [theme.currentTheme.name]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-border/30 bg-muted/10 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold tracking-tight">Theme Store</h2>
            <p className="text-sm text-muted-foreground">Select a theme to customize your workspace</p>
          </div>
          <button
            className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close theme switcher"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">

          {/* Built-in Themes */}
          {baseNames.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Built-in Themes</h3>
                <div className="h-px bg-border flex-1 opacity-50"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {baseNames.map((base) => {
                  const baseTheme = variantForBase(base);
                  return baseTheme ? (
                    <ThemePreview
                      key={base}
                      theme={baseTheme}
                      isActive={currentBase === base}
                      showControls
                      onThemeSelect={() => handleBaseSelect(base)}
                    />
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Extension Themes */}
          {extensionThemesList.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Extension Themes</h3>
                <div className="h-px bg-border flex-1 opacity-50"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {extensionThemesList.map((extensionTheme) => (
                  <ThemePreview
                    key={extensionTheme.name}
                    theme={extensionTheme}
                    isActive={theme.currentTheme.name === extensionTheme.name}
                    showControls
                    onThemeSelect={() => handleExtensionThemeSelect(extensionTheme)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border dark:border-border/30 bg-muted/10 flex justify-between items-center text-xs text-muted-foreground shrink-0">
          <p>
            Current base: <span className="font-medium text-foreground">{theme.currentTheme.displayName}</span>
          </p>
          <div className="flex gap-4">
            <span>Press 'Esc' to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
