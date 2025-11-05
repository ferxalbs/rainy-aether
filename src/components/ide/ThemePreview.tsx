/**
 * Interactive theme preview component for Rainy Aether IDE
 * Provides real-time theme visualization and testing
 */

import React, { useEffect, useMemo, useState } from "react";
import { Theme } from "../../themes";
import { validateThemeAccessibility } from "../../themes/themeValidator";

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

  const cardStyle = useMemo<React.CSSProperties>(
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

  const containerClassName = [
    "theme-preview-card",
    isActive ? "active" : "",
    !accessibility.isWCAGAACompliant ? "inaccessible" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClassName}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={cardStyle}
    >
      {/* Window Chrome */}
      <div className="preview-window">
        <div className="window-controls">
          <div className="control-btn close"></div>
          <div className="control-btn minimize"></div>
          <div className="control-btn maximize"></div>
        </div>
        <div className="window-title">
          {theme.displayName}
          {showControls && (
            <button
              className="accessibility-toggle"
              onClick={toggleAccessibility}
              title="Toggle accessibility info"
            >
              {accessibility.isWCAGAACompliant ? "✓" : "⚠"}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-item file">📄 main.rs</div>
        <div className="toolbar-item search">🔍</div>
        <div className="toolbar-item run active">▶</div>
        <div className="toolbar-item settings">⚙</div>
      </div>

      {/* Editor Area */}
      <div className="preview-editor">
        <div className="editor-content">
          <div className="code-line">
            <span className="line-number">1</span>
            <span className="code-text">
              <span className="keyword">fn</span>
              <span className="function">main</span>
              <span className="punctuation">()</span>
              <span className="punctuation">{' {'}</span>
            </span>
          </div>
          <div className="code-line">
            <span className="line-number">2</span>
            <span className="code-text">
              <span className="indent">    </span>
              <span className="function">println!</span>
              <span className="punctuation">(</span>
              <span className="string">"Hello, {theme.displayName}!"</span>
              <span className="punctuation">)</span>
              <span className="punctuation">;</span>
            </span>
          </div>
          <div className="code-line active">
            <span className="line-number">3</span>
            <span className="code-text">
              <span className="indent">    </span>
              <span className="comment">// This is a {theme.mode} theme</span>
              {previewText.includes("|") && <span className="cursor">|</span>}
            </span>
          </div>
          <div className="code-line">
            <span className="line-number">4</span>
            <span className="code-text">
              <span className="indent">    </span>
              <span className="keyword">Ok</span>
              <span className="punctuation">(()</span>
              <span className="punctuation">)</span>
            </span>
          </div>
          <div className="code-line">
            <span className="line-number">5</span>
            <span className="code-text">
              <span className="punctuation">{'}'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="preview-status">
        <div className="status-item">Rust</div>
        <div className="status-item">UTF-8</div>
        <div className="status-item">Ln 3, Col 8</div>
        <div className="status-item theme-name">{theme.displayName}</div>
      </div>

      {/* Accessibility Overlay */}
      {showAccessibility && (
        <div className="accessibility-overlay">
          <div className="accessibility-info">
            <h4>Accessibility</h4>
            <div className="contrast-info">
              <div>Primary Text: {accessibility.contrastRatios.primaryText.toFixed(1)}:1</div>
              <div>Secondary Text: {accessibility.contrastRatios.secondaryText.toFixed(1)}:1</div>
              <div>Editor Text: {accessibility.contrastRatios.editorText.toFixed(1)}:1</div>
            </div>
            <div className="compliance-status">
              <span className={accessibility.isWCAGAACompliant ? "compliant" : "non-compliant"}>
                WCAG AA: {accessibility.isWCAGAACompliant ? "✓" : "✗"}
              </span>
              <span className={accessibility.isWCAGAAACompliant ? "compliant" : "non-compliant"}>
                WCAG AAA: {accessibility.isWCAGAAACompliant ? "✓" : "✗"}
              </span>
            </div>
            {accessibility.issues.length > 0 && (
              <div className="issues-list">
                <h5>Issues:</h5>
                <ul>
                  {accessibility.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hover Effects */}
      {isHovered && showControls && (
        <div className="preview-hover-overlay">
          <button className="preview-select-btn" onClick={handleClick}>
            Apply Theme
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemePreview;