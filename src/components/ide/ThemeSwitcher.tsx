import React, { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Theme } from "../../themes";
import { switchBaseTheme, useThemeState, getAllThemes } from "../../stores/themeStore";
import ThemePreview from "./ThemePreview";
import "../../css/ThemePreview.css";

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
  // Re-compute when extension themes are added/removed
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

  // Get base names for built-in themes (navy, dark, light, etc.)
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

  return (
    <div className={`theme-switcher-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="theme-switcher-modal" onClick={(event) => event.stopPropagation()}>
        <div className="theme-switcher-header">
          <h2 className="theme-switcher-title">Theme Store</h2>
          <button className="theme-switcher-close" onClick={onClose} title="Close theme switcher">
            <X size={20} />
          </button>
        </div>

        {/* Mode selection removed for unified behavior: themes adapt to current preference (System/Day/Night). */}

        {/* Built-in Themes */}
        {baseNames.length > 0 && (
          <>
            <div className="theme-section-header">
              <h3>Built-in Themes</h3>
            </div>
            <div className="theme-grid">
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
          </>
        )}

        {/* Extension Themes */}
        {extensionThemesList.length > 0 && (
          <>
            <div className="theme-section-header">
              <h3>Extension Themes</h3>
            </div>
            <div className="theme-grid">
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
          </>
        )}

        <div className="theme-switcher-footer">
          <p className="theme-current">Current: {theme.currentTheme.displayName}</p>
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
