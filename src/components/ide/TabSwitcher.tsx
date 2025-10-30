import React from "react";
import type { OpenFile } from "../../stores/ideStore";
import "../../css/TabSwitcher.css";

interface TabSwitcherProps {
  isOpen: boolean;
  files: OpenFile[];
  highlightId: string | null;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({ isOpen, files, highlightId }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <div className="mx-auto mt-24 max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="rounded-md border border-border bg-secondary text-foreground shadow-xl px-3 py-2">
          <div className="text-xs text-muted-foreground mb-2">Switch Tabs (Ctrl+Tab / Ctrl+Shift+Tab)</div>
          <div className="max-h-60 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={`tab-switcher-item ${highlightId === file.id ? "active" : ""}`}
              >
                <div className="truncate font-medium text-sm">{file.name}</div>
                <div className="truncate text-xs text-muted-foreground">{file.path}</div>
              </div>
            ))}

            {files.length === 0 && (
              <div className="text-sm text-muted-foreground px-1 py-2">No open files</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabSwitcher;