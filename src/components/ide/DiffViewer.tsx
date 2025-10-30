import React, { useMemo } from "react";

interface DiffViewerProps {
  diff: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  const parsedLines = useMemo(() => {
    if (!diff) {
      return [] as { text: string; color: string }[];
    }

    return diff.split("\n").map((line) => {
      let color = "var(--text-primary)";
      if (line.startsWith("+")) color = "var(--diff-added)";
      if (line.startsWith("-")) color = "var(--diff-removed)";
      if (line.startsWith("@@")) color = "var(--diff-hunk)";
      if (line.startsWith("diff --git")) color = "var(--text-secondary)";
      if (line.startsWith("index")) color = "var(--text-secondary)";

      return { text: line, color };
    });
  }, [diff]);

  return (
    <pre className="p-4 text-xs overflow-auto font-mono" style={{ background: "var(--bg-primary)" }}>
      {parsedLines.map((line, index) => (
        <div key={`${index}-${line.text}`} style={{ color: line.color }}>
          {line.text || " "}
        </div>
      ))}
    </pre>
  );
};

export default DiffViewer;
