import React, { useMemo, useEffect } from "react";
import { useIDEStore, OpenFile } from "../../stores/ideStore";
import MonacoEditor from "./MonacoEditor";
import Breadcrumbs from "./Breadcrumbs";
import { editorState } from "../../stores/editorStore";
import {
  useEditorGroupState,
  editorGroupActions,
  EditorGroup,
} from "../../stores/editorGroupStore";
import { X, SplitSquareHorizontal, SplitSquareVertical, Columns } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/cn";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
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

// Single editor group panel
interface EditorGroupPanelProps {
  group: EditorGroup;
  openFiles: OpenFile[];
  isActive: boolean;
  showSplitControls: boolean;
  canClose: boolean;
  onFileSelect: (fileId: string) => void;
  onFileClose: (fileId: string) => void;
  onContentChange: (fileId: string, content: string) => void;
  onActivate: () => void;
  onClose: () => void;
}

const EditorGroupPanel: React.FC<EditorGroupPanelProps> = ({
  group,
  openFiles,
  isActive,
  showSplitControls,
  canClose,
  onFileSelect,
  onFileClose,
  onContentChange,
  onActivate,
  onClose,
}) => {
  const groupFiles = useMemo(() => {
    return group.openFileIds
      .map((id) => openFiles.find((f) => f.id === id))
      .filter((f): f is OpenFile => f !== undefined);
  }, [group.openFileIds, openFiles]);

  const activeFile = useMemo(() => {
    return groupFiles.find((f) => f.id === group.activeFileId) ?? null;
  }, [groupFiles, group.activeFileId]);

  return (
    <div
      className={cn(
        "flex flex-col h-full file-viewer-main",
        isActive && "ring-1 ring-primary/50"
      )}
      onClick={onActivate}
    >
      {/* Tab bar with split controls */}
      <div className="flex border-b overflow-x-auto file-viewer-tabs">
        <div className="flex flex-1 overflow-x-auto">
          {groupFiles.map((file) => {
            const isActiveTab = file.id === group.activeFileId;
            return (
              <div
                key={file.id}
                className="flex items-center min-w-0 border-r file-viewer-tab"
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "rounded-none border-0 h-9 px-3 text-sm font-normal file-viewer-tab-button",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    isActiveTab ? "active" : ""
                  )}
                  onClick={() => onFileSelect(file.id)}
                >
                  <span className="truncate max-w-32">{file.name}</span>
                  {file.isDirty && (
                    <span className="ml-1 file-viewer-dirty-indicator">●</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-6 rounded-none file-viewer-close-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFileClose(file.id);
                  }}
                  title="Close tab"
                >
                  <X size={12} className="file-viewer-close-icon" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Split controls */}
        {showSplitControls && groupFiles.length > 0 && (
          <div className="flex items-center px-1 gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      editorGroupActions.split("horizontal");
                    }}
                  >
                    <Columns className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Split Right</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      editorGroupActions.split("vertical");
                    }}
                  >
                    <SplitSquareVertical className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Split Down</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {canClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                title="Close Split"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {groupFiles.length > 0 && <Breadcrumbs editor={editorState.view} />}

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        {activeFile ? (
          <MonacoEditor
            value={activeFile.content}
            language={getLanguageFromFile(activeFile.name)}
            filename={activeFile.path || activeFile.name}
            onChange={(value: string) => onContentChange(activeFile.id, value)}
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

const FileViewer: React.FC = () => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const groupState = useEditorGroupState();

  // Sync editor groups with IDE store
  useEffect(() => {
    const fileIds = snapshot.openFiles.map((f) => f.id);
    editorGroupActions.syncWithOpenFiles(fileIds, snapshot.activeFileId);
  }, [snapshot.openFiles, snapshot.activeFileId]);

  // Handle file selection in a group
  const handleFileSelect = (groupId: string, fileId: string) => {
    editorGroupActions.setActiveFileInGroup(fileId, groupId);
    actions.setActiveFile(fileId);
  };

  // Handle file close in a group
  const handleFileClose = (groupId: string, fileId: string) => {
    editorGroupActions.closeFileInGroup(fileId, groupId);
    actions.closeFile(fileId);
  };

  // Handle content change
  const handleContentChange = (fileId: string, content: string) => {
    actions.updateFileContent(fileId, content);
  };

  // Handle group activation
  const handleGroupActivate = (groupId: string) => {
    editorGroupActions.setActiveGroup(groupId);
    const group = groupState.groups.find((g) => g.id === groupId);
    if (group?.activeFileId) {
      actions.setActiveFile(group.activeFileId);
    }
  };

  // Handle group close
  const handleGroupClose = (groupId: string) => {
    editorGroupActions.closeGroup(groupId);
  };

  // Render single group (no splits)
  if (groupState.groups.length === 1) {
    const group = groupState.groups[0];
    return (
      <EditorGroupPanel
        group={group}
        openFiles={snapshot.openFiles}
        isActive={true}
        showSplitControls={true}
        canClose={false}
        onFileSelect={(fileId) => handleFileSelect(group.id, fileId)}
        onFileClose={(fileId) => handleFileClose(group.id, fileId)}
        onContentChange={handleContentChange}
        onActivate={() => {}}
        onClose={() => {}}
      />
    );
  }

  // Render multiple groups with resizable panels
  return (
    <ResizablePanelGroup
      direction={groupState.splitDirection}
      className="h-full"
    >
      {groupState.groups.map((group, index) => (
        <React.Fragment key={group.id}>
          {index > 0 && <ResizableHandle withHandle />}
          <ResizablePanel
            id={group.id}
            order={index}
            defaultSize={100 / groupState.groups.length}
            minSize={20}
          >
            <EditorGroupPanel
              group={group}
              openFiles={snapshot.openFiles}
              isActive={group.id === groupState.activeGroupId}
              showSplitControls={index === 0}
              canClose={groupState.groups.length > 1}
              onFileSelect={(fileId) => handleFileSelect(group.id, fileId)}
              onFileClose={(fileId) => handleFileClose(group.id, fileId)}
              onContentChange={handleContentChange}
              onActivate={() => handleGroupActivate(group.id)}
              onClose={() => handleGroupClose(group.id)}
            />
          </ResizablePanel>
        </React.Fragment>
      ))}
    </ResizablePanelGroup>
  );
};

export default FileViewer;
