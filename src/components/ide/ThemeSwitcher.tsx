import React, { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { allThemes, Theme } from "../../themes";
import { switchBaseTheme, useThemeState } from "../../stores/themeStore";
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

  const baseNames = useMemo(() => {
    const set = new Set<string>();
    for (const item of allThemes) {
      const base = item.name.split("-")[0];
      set.add(base);
    }
    return Array.from(set);
  }, []);

  const variantForBase = useCallback(
    (baseName: string): Theme | undefined => {
      return allThemes.find((item) => item.name === `${baseName}-${effectiveMode}`);
    },
    [effectiveMode],
  );

  const handleBaseSelect = useCallback(
    (baseName: string) => {
      switchBaseTheme(baseName, effectiveMode);
      onClose();
    },
    [effectiveMode, onClose],
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

        <div className="theme-switcher-footer">
          <p className="theme-current">Current: {theme.currentTheme.displayName}</p>
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
