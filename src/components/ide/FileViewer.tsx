import React, { useMemo, useEffect, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { useIDEStore, OpenFile } from "../../stores/ideStore";
import MonacoEditor from "./MonacoEditor";
import Breadcrumbs from "./Breadcrumbs";
import EditorErrorBoundary from "./EditorErrorBoundary";
import InlineDiffWidget from "./InlineDiffWidget";
import {
  useEditorGroupState,
  editorGroupActions,
  EditorGroup,
} from "../../stores/editorGroupStore";
import {
  useInlineDiffState,
  inlineDiffActions,
} from "../../stores/inlineDiffStore";
import { X, Columns, SplitSquareVertical, GripVertical } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import "../../css/FileViewer.css";
import "../../css/inline-diff.css";

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

// Draggable tab component
interface DraggableTabProps {
  file: OpenFile;
  isActive: boolean;
  groupId: string;
  onSelect: () => void;
  onClose: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onMoveToGroup: (targetGroupId: string) => void;
  otherGroups: EditorGroup[];
}

const DraggableTab: React.FC<DraggableTabProps> = ({
  file,
  isActive,
  groupId,
  onSelect,
  onClose,
  onSplitRight,
  onSplitDown,
  onMoveToGroup,
  otherGroups,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", JSON.stringify({
      fileId: file.id,
      sourceGroupId: groupId,
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "flex items-center min-w-0 border-r file-viewer-tab",
            isDragging && "opacity-50"
          )}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Button
            variant="ghost"
            className={cn(
              "rounded-none border-0 h-9 px-3 text-sm font-normal file-viewer-tab-button",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              isActive ? "active" : ""
            )}
            onClick={onSelect}
            aria-label={`Select tab ${file.name}`}
          >
            <GripVertical size={12} className="mr-1 opacity-50 cursor-grab" />
            <span className="truncate max-w-32">{file.name}</span>
            {file.isDirty && (
              <span className="ml-1 file-viewer-dirty-indicator">●</span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-6 rounded-none file-viewer-close-button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close tab"
            aria-label="Close tab"
          >
            <X size={12} className="file-viewer-close-icon" />
          </Button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onSplitRight}>
          <Columns className="mr-2 h-4 w-4" />
          Split Right
        </ContextMenuItem>
        <ContextMenuItem onClick={onSplitDown}>
          <SplitSquareVertical className="mr-2 h-4 w-4" />
          Split Down
        </ContextMenuItem>
        {otherGroups.length > 0 && (
          <>
            <ContextMenuSeparator />
            {otherGroups.map((group) => (
              <ContextMenuItem
                key={group.id}
                onClick={() => onMoveToGroup(group.id)}
              >
                Move to Split {group.id.replace("group-", "")}
              </ContextMenuItem>
            ))}
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Close
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

// Single editor group panel
interface EditorGroupPanelProps {
  group: EditorGroup;
  openFiles: OpenFile[];
  isActive: boolean;
  canClose: boolean;
  allGroups: EditorGroup[];
  onFileSelect: (fileId: string) => void;
  onFileClose: (fileId: string) => void;
  onContentChange: (fileId: string, content: string) => void;
  onActivate: () => void;
  onClose: () => void;
  onSplitWithFile: (fileId: string, direction: "horizontal" | "vertical") => void;
  onMoveFile: (fileId: string, targetGroupId: string) => void;
}

const EditorGroupPanel: React.FC<EditorGroupPanelProps> = ({
  group,
  openFiles,
  isActive,
  canClose,
  allGroups,
  onFileSelect,
  onFileClose,
  onContentChange,
  onActivate,
  onClose,
  onSplitWithFile,
  onMoveFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [groupEditor, setGroupEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const dragCounterRef = React.useRef(0);

  const groupFiles = useMemo(() => {
    return group.openFileIds
      .map((id) => openFiles.find((f) => f.id === id))
      .filter((f): f is OpenFile => f !== undefined);
  }, [group.openFileIds, openFiles]);

  const activeFile = useMemo(() => {
    return groupFiles.find((f) => f.id === group.activeFileId) ?? null;
  }, [groupFiles, group.activeFileId]);

  // Get inline diff state for this group's active file
  const inlineDiffState = useInlineDiffState();
  const showInlineDiff = activeFile &&
    inlineDiffState.activeSession?.fileUri === activeFile.path;

  // Handle inline diff keyboard shortcuts
  useEffect(() => {
    if (!showInlineDiff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Accept: Cmd/Ctrl+Enter
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        inlineDiffActions.acceptAllChanges();
      }
      // Reject: Escape
      else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        inlineDiffActions.rejectAllChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showInlineDiff]);

  const otherGroups = useMemo(() => {
    return allGroups.filter((g) => g.id !== group.id);
  }, [allGroups, group.id]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.fileId && data.sourceGroupId !== group.id) {
        onMoveFile(data.fileId, group.id);
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full file-viewer-main",
        isActive && "ring-2 ring-primary/50",
        isDragOver && "bg-accent/30 ring-2 ring-primary"
      )}
      onClick={onActivate}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tab bar */}
      <div className="flex border-b overflow-x-auto file-viewer-tabs">
        <div className="flex flex-1 overflow-x-auto">
          {groupFiles.map((file) => (
            <DraggableTab
              key={file.id}
              file={file}
              isActive={file.id === group.activeFileId}
              groupId={group.id}
              onSelect={() => onFileSelect(file.id)}
              onClose={() => onFileClose(file.id)}
              onSplitRight={() => onSplitWithFile(file.id, "horizontal")}
              onSplitDown={() => onSplitWithFile(file.id, "vertical")}
              onMoveToGroup={(targetGroupId) => onMoveFile(file.id, targetGroupId)}
              otherGroups={otherGroups}
            />
          ))}
        </div>

        {/* Close split button */}
        {canClose && (
          <div className="flex items-center px-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    aria-label="Close split"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close Split</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Breadcrumbs - wrapped in error boundary for crash protection */}
      {groupFiles.length > 0 && (
        <EditorErrorBoundary>
          <Breadcrumbs editor={groupEditor} />
        </EditorErrorBoundary>
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-hidden relative">
        {activeFile ? (
          <>
            <MonacoEditor
              value={activeFile.content}
              language={getLanguageFromFile(activeFile.name)}
              filename={activeFile.path || activeFile.name}
              onChange={(value: string) => onContentChange(activeFile.id, value)}
              onEditorReady={setGroupEditor}
            />
            {/* Inline Diff Widget */}
            {showInlineDiff && (
              <InlineDiffWidget
                isVisible={true}
                isStreaming={inlineDiffState.isStreaming}
                additions={inlineDiffState.stats.additions}
                deletions={inlineDiffState.stats.deletions}
                agentName={inlineDiffState.activeSession?.agentName || 'AI Agent'}
                description={inlineDiffState.activeSession?.description}
                onAccept={() => inlineDiffActions.acceptAllChanges()}
                onReject={() => inlineDiffActions.rejectAllChanges()}
              />
            )}
          </>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center h-full file-viewer-fallback cursor-pointer",
              isDragOver && "bg-accent/20"
            )}
            onClick={onActivate}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-sm text-muted-foreground">
                {isDragOver
                  ? "Drop file here"
                  : canClose
                    ? "Drag a tab here or open a file"
                    : "Select a file to start editing"}
              </div>
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
  const handleFileSelect = useCallback((groupId: string, fileId: string) => {
    editorGroupActions.setActiveFileInGroup(fileId, groupId);
    actions.setActiveFile(fileId);
  }, [actions]);

  // Handle file close in a group
  const handleFileClose = useCallback((groupId: string, fileId: string) => {
    editorGroupActions.closeFileInGroup(fileId, groupId);
    actions.closeFile(fileId);
  }, [actions]);

  // Handle content change
  const handleContentChange = useCallback((fileId: string, content: string) => {
    actions.updateFileContent(fileId, content);
  }, [actions]);

  // Handle group activation
  const handleGroupActivate = useCallback((groupId: string) => {
    editorGroupActions.setActiveGroup(groupId);
    const group = groupState.groups.find((g) => g.id === groupId);
    if (group?.activeFileId) {
      actions.setActiveFile(group.activeFileId);
    }
  }, [groupState.groups, actions]);

  // Handle group close
  const handleGroupClose = useCallback((groupId: string) => {
    editorGroupActions.closeGroup(groupId);
  }, []);

  // Handle split with specific file
  const handleSplitWithFile = useCallback((fileId: string, direction: "horizontal" | "vertical") => {
    // Use the dedicated splitWithFile function for atomic operation
    editorGroupActions.splitWithFile(fileId, direction);
  }, []);

  // Handle move file between groups
  const handleMoveFile = useCallback((fileId: string, targetGroupId: string) => {
    // Find source group
    const sourceGroup = groupState.groups.find(g => g.openFileIds.includes(fileId));
    if (sourceGroup && sourceGroup.id !== targetGroupId) {
      editorGroupActions.moveFileToGroup(fileId, sourceGroup.id, targetGroupId);
    }
  }, [groupState.groups]);

  // Render single group (no splits)
  if (groupState.groups.length === 1) {
    const group = groupState.groups[0];
    return (
      <EditorGroupPanel
        group={group}
        openFiles={snapshot.openFiles}
        isActive={true}
        canClose={false}
        allGroups={groupState.groups}
        onFileSelect={(fileId) => handleFileSelect(group.id, fileId)}
        onFileClose={(fileId) => handleFileClose(group.id, fileId)}
        onContentChange={handleContentChange}
        onActivate={() => { }}
        onClose={() => { }}
        onSplitWithFile={handleSplitWithFile}
        onMoveFile={handleMoveFile}
      />
    );
  }

  // Render multiple groups with flex layout
  return (
    <div
      className={cn(
        "h-full flex",
        groupState.splitDirection === "vertical" ? "flex-col" : "flex-row"
      )}
    >
      {groupState.groups.map((group, index) => (
        <React.Fragment key={group.id}>
          {index > 0 && (
            <div
              className={cn(
                "shrink-0 bg-border",
                groupState.splitDirection === "vertical" ? "h-px" : "w-px"
              )}
            />
          )}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <EditorGroupPanel
              group={group}
              openFiles={snapshot.openFiles}
              isActive={group.id === groupState.activeGroupId}
              canClose={groupState.groups.length > 1}
              allGroups={groupState.groups}
              onFileSelect={(fileId) => handleFileSelect(group.id, fileId)}
              onFileClose={(fileId) => handleFileClose(group.id, fileId)}
              onContentChange={handleContentChange}
              onActivate={() => handleGroupActivate(group.id)}
              onClose={() => handleGroupClose(group.id)}
              onSplitWithFile={handleSplitWithFile}
              onMoveFile={handleMoveFile}
            />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default FileViewer;
