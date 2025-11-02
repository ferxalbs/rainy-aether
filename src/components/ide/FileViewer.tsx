import React, { useMemo } from "react";
import { useIDEStore, OpenFile } from "../../stores/ideStore";
import MonacoEditor from "./MonacoEditor";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/cn";
import "../../css/FileViewer.css";

type SupportedLanguage = "javascript" | "html" | "css" | "markdown" | "rust" | undefined;

const getLanguageFromFile = (fileName: string): SupportedLanguage => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return "javascript";
    case "rs":
      return "rust";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    default:
      return undefined;
  }
};

const FileViewer: React.FC = () => {
  const { state, actions } = useIDEStore();
  const snapshot = state();

  const activeFile = useMemo(() => {
    return snapshot.openFiles.find((file: OpenFile) => file.id === snapshot.activeFileId) ?? null;
  }, [snapshot.activeFileId, snapshot.openFiles]);

  return (
    <div className="flex flex-col h-full file-viewer-main">
      {snapshot.openFiles.length > 0 && (
        <div className="flex border-b overflow-x-auto file-viewer-tabs">
          {snapshot.openFiles.map((file) => {
            const isActive = file.id === snapshot.activeFileId;
            return (
              <div key={file.id} className="flex items-center min-w-0 border-r file-viewer-tab">
                <Button
                  variant="ghost"
                  className={cn(
                    "rounded-none border-0 h-9 px-3 text-sm font-normal file-viewer-tab-button",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    isActive ? "active" : "",
                  )}
                  onClick={() => actions.setActiveFile(file.id)}
                >
                  <span className="truncate max-w-32">{file.name}</span>
                  {file.isDirty && <span className="ml-1 file-viewer-dirty-indicator">●</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-6 rounded-none file-viewer-close-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.closeFile(file.id);
                  }}
                  title="Close tab"
                >
                  <X size={12} className="file-viewer-close-icon" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeFile ? (
          <MonacoEditor
            value={activeFile.content}
            language={getLanguageFromFile(activeFile.name)}
            filename={activeFile.path || activeFile.name}
            onChange={(value: string) => actions.updateFileContent(activeFile.id, value)}
          />
        ) : (
          <div className="flex items-center justify-center h-full file-viewer-fallback">
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              <div>Select a file to start editing</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
