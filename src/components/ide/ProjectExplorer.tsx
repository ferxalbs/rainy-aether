import React, { useCallback, useMemo, useState } from "react";
import { useIDEStore, FileNode } from "../../stores/ideStore";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FilePlus, FolderPlus } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import "../../css/ProjectExplorer.css";
import { fileIconColorForExt } from "../../stores/settingsStore";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import FileDialog from "./file-dialog";

interface FileNodeProps {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  setSelectedPath: (path: string) => void;
  onStartRename: (node: FileNode) => void;
  onContextMenuOpen: (event: React.MouseEvent | KeyboardEvent, node: FileNode) => void;
}

const FileNodeComponent: React.FC<FileNodeProps> = ({
  node,
  level,
  selectedPath,
  setSelectedPath,
  onStartRename,
  onContextMenuOpen,
}) => {
  const { actions } = useIDEStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setSelectedPath(node.path);
    if (node.is_directory) {
      setIsOpen((prev) => !prev);
    } else {
      actions.openFile(node);
    }
  }, [actions, node, setSelectedPath]);

  const fileIcon = useMemo(() => {
    if (node.is_directory) {
      return null;
    }
    const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
    const color = fileIconColorForExt(ext);
    return <File size={16} style={{ color }} />;
  }, [node]);

  const isSelected = selectedPath === node.path;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isSelected) {
        return;
      }
      if (event.key === "F2" || event.key === "Delete") {
        event.preventDefault();
        onContextMenuOpen(event.nativeEvent as KeyboardEvent, node);
        if (event.key === "F2") {
          onStartRename(node);
        }
      }
    },
    [isSelected, node, onContextMenuOpen, onStartRename],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setSelectedPath(node.path);
      onContextMenuOpen(event, node);
    },
    [node, onContextMenuOpen, setSelectedPath],
  );

  const showChevron = node.is_directory;

  return (
    <div>
      <div
        className={cn(
          "w-full h-7 px-2 flex items-center text-left font-normal cursor-pointer",
          isSelected ? "bg-muted" : "hover:bg-muted",
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
      >
        {showChevron ? (
          <>
            {isOpen ? (
              <ChevronDown size={14} className="mr-1 opacity-80" />
            ) : (
              <ChevronRight size={14} className="mr-1 opacity-80" />
            )}
            {isOpen ? (
              <FolderOpen size={16} className="mr-2" style={{ color: "var(--accent-primary)" }} />
            ) : (
              <Folder size={16} className="mr-2" style={{ color: "var(--accent-primary)" }} />
            )}
          </>
        ) : (
          <>
            <div className="w-4 mr-1" />
            <div className="mr-2">{fileIcon}</div>
          </>
        )}
        <div className="flex-1 truncate text-sm file-node-name">
          <span>{node.name}</span>
        </div>
      </div>
      {node.is_directory && isOpen && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FileNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              setSelectedPath={setSelectedPath}
              onStartRename={onStartRename}
              onContextMenuOpen={onContextMenuOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectExplorer: React.FC = () => {
  const { state, actions } = useIDEStore();
  const snapshot = state();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const [deleteNode, setDeleteNode] = useState<FileNode | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileDialogMode, setFileDialogMode] = useState<"create" | "rename">("create");
  const [fileDialogNode, setFileDialogNode] = useState<FileNode | null>(null);
  const [fileDialogParentPath, setFileDialogParentPath] = useState<string>("");
  const [fileDialogIsDirectory, setFileDialogIsDirectory] = useState(false);

  const handleContextMenuOpen = useCallback(
    (event: React.MouseEvent | KeyboardEvent, node: FileNode) => {
      const coords = "clientX" in event ? { x: event.clientX, y: event.clientY } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      setMenuX(coords.x);
      setMenuY(coords.y);

      const items: ContextMenuItem[] = [];
      if (node.is_directory) {
        items.push({
          key: "new-file",
          label: "New File",
          icon: FilePlus,
          onSelect: () => {
            setFileDialogMode("create");
            setFileDialogParentPath(node.path);
            setFileDialogIsDirectory(false);
            setFileDialogOpen(true);
          },
        });
        items.push({
          key: "new-folder",
          label: "New Folder",
          icon: FolderPlus,
          onSelect: () => {
            setFileDialogMode("create");
            setFileDialogParentPath(node.path);
            setFileDialogIsDirectory(true);
            setFileDialogOpen(true);
          },
        });
      }
      items.push({
        key: "rename",
        label: "Rename",
        onSelect: () => {
          setFileDialogMode("rename");
          setFileDialogNode(node);
          setFileDialogIsDirectory(node.is_directory);
          setFileDialogOpen(true);
        },
      });
      items.push({
        key: "delete",
        label: "Delete",
        onSelect: () => setDeleteNode(node),
      });

      setMenuItems(items);
      setMenuOpen(true);
    },
    [],
  );

  const projectRoot = snapshot.projectTree;

  const handleNewFile = useCallback(() => {
    const root = projectRoot?.path;
    if (!root) return;
    setFileDialogMode("create");
    setFileDialogParentPath(root);
    setFileDialogIsDirectory(false);
    setFileDialogOpen(true);
  }, [projectRoot]);

  const handleNewFolder = useCallback(() => {
    const root = projectRoot?.path;
    if (!root) return;
    setFileDialogMode("create");
    setFileDialogParentPath(root);
    setFileDialogIsDirectory(true);
    setFileDialogOpen(true);
  }, [projectRoot]);

  return (
    <div className="flex flex-col h-full project-explorer">
      <div className="p-3 border-b project-explorer-header">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide project-explorer-title">Project</h3>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" title="New File" onClick={handleNewFile}>
              <FilePlus size={16} />
            </Button>
            <Button size="icon" variant="ghost" title="New Folder" onClick={handleNewFolder}>
              <FolderPlus size={16} />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {projectRoot ? (
          <>
            <FileNodeComponent
              node={projectRoot}
              level={0}
              selectedPath={selectedPath}
              setSelectedPath={setSelectedPath}
              onStartRename={(node) => {
                setFileDialogMode("rename");
                setFileDialogNode(node);
                setFileDialogIsDirectory(node.is_directory);
                setFileDialogOpen(true);
              }}
              onContextMenuOpen={handleContextMenuOpen}
            />
            <ContextMenu
              isOpen={menuOpen}
              x={menuX}
              y={menuY}
              items={menuItems}
              onClose={() => setMenuOpen(false)}
            />
            <Dialog open={Boolean(deleteNode)} onOpenChange={(open) => !open && setDeleteNode(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete</DialogTitle>
                  <DialogDescription>
                    {deleteNode
                      ? `Delete ${deleteNode.name}${deleteNode.is_directory ? " and its contents" : ""}?`
                      : ""}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="ghost" onClick={() => setDeleteNode(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (deleteNode) {
                        await actions.deleteNode(deleteNode);
                        setDeleteNode(null);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <FileDialog
              open={fileDialogOpen}
              onOpenChange={(open) => setFileDialogOpen(open)}
              title={
                fileDialogMode === "create"
                  ? fileDialogIsDirectory
                    ? "Create New Folder"
                    : "Create New File"
                  : "Rename"
              }
              description={
                fileDialogMode === "create"
                  ? fileDialogIsDirectory
                    ? "Enter the name for the new folder."
                    : "Enter the name and extension for the new file."
                  : "Enter the new name."
              }
              initialName={
                fileDialogMode === "create"
                  ? fileDialogIsDirectory
                    ? "New Folder"
                    : "Untitled"
                  : fileDialogNode?.name ?? ""
              }
              onConfirm={(name) => {
                if (fileDialogMode === "create") {
                  if (fileDialogIsDirectory) {
                    actions.createFolderAt(fileDialogParentPath, name);
                  } else {
                    actions.createFileAt(fileDialogParentPath, name);
                    const newPath = `${fileDialogParentPath}/${name}`;
                    setSelectedPath(newPath);
                  }
                } else if (fileDialogNode) {
                  actions.renameNode(fileDialogNode, name);
                }
              }}
              confirmLabel={fileDialogMode === "create" ? "Create" : "Rename"}
              isDirectory={fileDialogIsDirectory}
            />
          </>
        ) : (
          <div className="text-center text-sm py-8 no-project-text">
            <Folder size={32} className="mx-auto mb-2 opacity-50" />
            No project open
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectExplorer;
