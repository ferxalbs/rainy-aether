import React, { useMemo } from "react";
import { Zap, GitBranch, AlertCircle, CheckCircle } from "lucide-react";
import { useThemeState } from "../../stores/themeStore";
import { useIDEStore } from "../../stores/ideStore";

const getLanguageFromFile = (fileName?: string) => {
  if (!fileName) return "Plain Text";
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "TypeScript";
    case "js":
    case "jsx":
      return "JavaScript";
    case "rs":
      return "Rust";
    case "json":
      return "JSON";
    case "md":
      return "Markdown";
    case "css":
      return "CSS";
    case "html":
      return "HTML";
    default:
      return "Plain Text";
  }
};

const statusBarStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-status)",
  borderColor: "var(--border-color)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
};

const accentStyle: React.CSSProperties = {
  color: "var(--accent-primary)",
};

const StatusBar: React.FC = () => {
  const { state } = useIDEStore();
  const theme = useThemeState();
  const snapshot = state();

  const activeFile = useMemo(
    () => snapshot.openFiles.find((file) => file.id === snapshot.activeFileId),
    [snapshot.activeFileId, snapshot.openFiles],
  );

  const language = useMemo(() => getLanguageFromFile(activeFile?.name), [activeFile?.name]);

  return (
    <div className="flex items-center justify-between h-6 px-3 text-xs border-t" style={statusBarStyle}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" style={mutedStyle}>
          <GitBranch size={12} />
          <span>main</span>
        </div>

        <div className="flex items-center gap-1" style={accentStyle}>
          <CheckCircle size={12} />
          <span>No problems</span>
        </div>

        <div className="flex items-center gap-1" style={mutedStyle}>
          <AlertCircle size={12} />
          <span>0 errors, 0 warnings</span>
        </div>
      </div>

      <div className="flex items-center gap-4" style={mutedStyle}>
        <span>UTF-8</span>
        <span>{language}</span>
        <span>Ln 1, Col 1</span>
        <span>{theme.currentTheme.displayName}</span>
        <div className="flex items-center gap-1">
          <Zap size={12} />
          <span>Rainy Coder</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
