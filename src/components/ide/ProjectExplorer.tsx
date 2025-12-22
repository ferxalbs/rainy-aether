import React, { useCallback, useMemo, useState, memo } from "react";
import { useIDEStore, FileNode } from "../../stores/ideStore";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FilePlus, FolderPlus } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { iconThemeActions, useActiveIconTheme, type IconDefinition } from "@/stores/iconThemeStore";
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

/**
 * Render an icon from IconDefinition - Memoized to prevent unnecessary re-renders
 */
const RenderIcon = memo<{ icon: IconDefinition; size?: number; className?: string; style?: React.CSSProperties }>(({ icon, size = 16, className, style }) => {
  // React component (Rainy Aether built-in themes)
  if (icon.iconComponent) {
    const IconComponent = icon.iconComponent;
    return <IconComponent size={size} className={className} style={style} />;
  }

  // Icon path (extension-provided icons)
  if (icon.iconPath) {
    // Check if it's an SVG string
    if (icon.iconPath.startsWith('<svg')) {
      return <div dangerouslySetInnerHTML={{ __html: icon.iconPath }} style={{ width: size, height: size, ...style }} className={className} />;
    }
    // Otherwise it's a path/data URL to an image
    return <img src={icon.iconPath} alt="" style={{ width: size, height: size, ...style }} className={className} />;
  }

  // Font-based icon (future support)
  if (icon.fontCharacter) {
    return (
      <span
        style={{
          fontFamily: icon.fontId,
          color: icon.fontColor,
          fontSize: size,
          ...style,
        }}
        className={className}
      >
        {icon.fontCharacter}
      </span>
    );
  }

  // Fallback to generic file icon
  return <File size={size} className={className} style={style} />;
});

const FileNodeComponentInternal: React.FC<FileNodeProps> = ({
  node,
  level,
  selectedPath,
  setSelectedPath,
  onStartRename,
  onContextMenuOpen,
}) => {
  const { actions } = useIDEStore();
  const [isOpen, setIsOpen] = useState(false);
  const activeTheme = useActiveIconTheme();

  const handleToggle = useCallback(async () => {
    setSelectedPath(node.path);
    if (node.is_directory) {
      const willOpen = !isOpen;
      setIsOpen(willOpen);

      // Lazy load children if opening and not loaded yet
      // Check both children_loaded flag AND if children array is empty/undefined
      if (willOpen && !node.children_loaded && (!node.children || node.children.length === 0)) {
        try {
          await actions.loadDirectoryChildren(node.path);
        } catch (error) {
          console.error('Failed to load directory children:', error);
        }
      }
    } else {
      actions.openFile(node);
    }
  }, [actions, node.path, node.is_directory, node.children_loaded, node.children, setSelectedPath, isOpen]);

  // Get icon from theme - memoized with proper dependencies
  const icon = useMemo(() => {
    if (node.is_directory) {
      const folderIcon = iconThemeActions.getFolderIcon(node.name, isOpen, false);
      if (folderIcon) return folderIcon;
      // Fallback to Lucide icon
      return { iconComponent: isOpen ? FolderOpen : Folder };
    } else {
      const fileIcon = iconThemeActions.getFileIcon(node.name);
      if (fileIcon) return fileIcon;
      // Fallback to Lucide icon
      return { iconComponent: File };
    }
  }, [node.is_directory, node.name, isOpen, activeTheme]);

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
          "w-full h-7 px-1.5 flex items-center text-left font-normal cursor-pointer rounded-sm transition-colors duration-100",
          isSelected
            ? "bg-accent/50 text-accent-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
      >
        {showChevron && (
          <>
            {isOpen ? (
              <ChevronDown size={14} className="mr-1 opacity-60 shrink-0" />
            ) : (
              <ChevronRight size={14} className="mr-1 opacity-60 shrink-0" />
            )}
          </>
        )}
        {!showChevron && <div className="w-3.5 mr-1 shrink-0" />}
        <div className="mr-1.5 shrink-0">
          <RenderIcon icon={icon} size={16} />
        </div>
        <span className="flex-1 truncate text-sm">{node.name}</span>
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

// Memoize FileNodeComponent to prevent unnecessary re-renders of tree nodes
const FileNodeComponent = memo(FileNodeComponentInternal, (prevProps, nextProps) => {
  return (
    prevProps.node.path === nextProps.node.path &&
    prevProps.node.name === nextProps.node.name &&
    prevProps.node.is_directory === nextProps.node.is_directory &&
    prevProps.node.children_loaded === nextProps.node.children_loaded &&
    prevProps.selectedPath === nextProps.selectedPath &&
    prevProps.level === nextProps.level &&
    prevProps.node.children?.length === nextProps.node.children?.length
  );
});

const ProjectExplorerInternal: React.FC = () => {
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
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Explorer</span>
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-6 w-6" title="New File" onClick={handleNewFile}>
              <FilePlus size={14} className="text-muted-foreground" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" title="New Folder" onClick={handleNewFolder}>
              <FolderPlus size={14} className="text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {projectRoot ? (
          <>
            {/* Show folder name as header */}
            <div
              className={cn(
                "w-full h-7 px-1.5 flex items-center text-left font-medium cursor-pointer rounded-sm mb-0.5 transition-colors duration-100",
                selectedPath === projectRoot.path
                  ? "bg-accent/50 text-accent-foreground"
                  : "text-foreground hover:bg-muted/50",
              )}
              onClick={() => setSelectedPath(projectRoot.path)}
              onContextMenu={(event) => handleContextMenuOpen(event, projectRoot)}
            >
              <FolderOpen size={16} className="mr-1.5 shrink-0" style={{ color: "var(--accent-primary)" }} />
              <span className="text-sm truncate">{projectRoot.name}</span>
            </div>
            {/* Show children directly without nesting the root folder */}
            {projectRoot.children && projectRoot.children.length > 0 && (
              <div>
                {projectRoot.children.map((child) => (
                  <FileNodeComponent
                    key={child.path}
                    node={child}
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
                ))}
              </div>
            )}
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

// Memoize ProjectExplorer to prevent unnecessary re-renders
const ProjectExplorer = memo(ProjectExplorerInternal);

export default ProjectExplorer;
