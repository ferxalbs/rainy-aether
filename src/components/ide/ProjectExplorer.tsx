import React, { useCallback, useMemo, useState, memo } from "react";
import { useIDEStore, useIDEState, FileNode } from "../../stores/ideStore";
import { File as FileIconLucide, Folder as FolderIconLucide, FolderOpen, FilePlus, FolderPlus } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { iconThemeActions, useActiveIconTheme, type IconDefinition } from "@/stores/iconThemeStore";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import FileDialog from "./file-dialog";
import { Tree, Folder, File } from "../ui/file-tree";

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
  return <FileIconLucide size={size} className={className} style={style} />;
});

RenderIcon.displayName = "RenderIcon";

interface FileTreeItemProps {
  node: FileNode;
  selectedPath: string | null;
  expandedSet: Set<string>;
  onSelect: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onExpand: (path: string, node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
}

/**
 * Recursive component that renders files and folders using file-tree.tsx
 */
const FileTreeItemInternal: React.FC<FileTreeItemProps> = ({
  node,
  selectedPath,
  expandedSet,
  onSelect,
  onContextMenu,
  onExpand,
  onOpenFile,
}) => {
  const activeTheme = useActiveIconTheme();
  const isSelected = selectedPath === node.path;

  // Get icons from theme
  const { fileIcon, folderOpenIcon, folderCloseIcon } = useMemo(() => {
    if (node.is_directory) {
      // Get both open and closed folder icons
      const openIcon = iconThemeActions.getFolderIcon(node.name, true, false);
      const closeIcon = iconThemeActions.getFolderIcon(node.name, false, false);
      return {
        fileIcon: null,
        folderOpenIcon: openIcon ?? { iconComponent: FolderOpen },
        folderCloseIcon: closeIcon ?? { iconComponent: FolderIconLucide },
      };
    } else {
      const icon = iconThemeActions.getFileIcon(node.name);
      return {
        fileIcon: icon ?? { iconComponent: FileIconLucide },
        folderOpenIcon: null,
        folderCloseIcon: null,
      };
    }
  }, [node.is_directory, node.name, activeTheme]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(node.path);
    onContextMenu(event, node);
  }, [node, onContextMenu, onSelect]);

  const handleFolderClick = useCallback(() => {
    onSelect(node.path);
    onExpand(node.path, node);
  }, [node, onSelect, onExpand]);

  const handleFileClick = useCallback(() => {
    onSelect(node.path);
    onOpenFile(node);
  }, [node, onSelect, onOpenFile]);

  // File node
  if (!node.is_directory) {
    return (
      <File
        value={node.path}
        isSelect={isSelected}
        fileIcon={fileIcon ? <RenderIcon icon={fileIcon} size={16} /> : undefined}
        onClick={handleFileClick}
        onContextMenu={handleContextMenu}
      >
        <span className="truncate text-sm">{node.name}</span>
      </File>
    );
  }

  // Folder node - pass themed icons
  return (
    <Folder
      element={node.name}
      value={node.path}
      isSelect={isSelected}
      openIcon={folderOpenIcon ? <RenderIcon icon={folderOpenIcon} size={16} /> : undefined}
      closeIcon={folderCloseIcon ? <RenderIcon icon={folderCloseIcon} size={16} /> : undefined}
      onClick={handleFolderClick}
      onContextMenu={handleContextMenu}
    >
      {node.children && node.children.map((child) => (
        <FileTreeItem
          key={child.path}
          node={child}
          selectedPath={selectedPath}
          expandedSet={expandedSet}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onExpand={onExpand}
          onOpenFile={onOpenFile}
        />
      ))}
    </Folder>
  );
};

// Optimized memo - only re-render when necessary
const FileTreeItem = memo(FileTreeItemInternal, (prev, next) => {
  if (prev.node !== next.node) return false;
  if (prev.selectedPath !== next.selectedPath) {
    // Only re-render if this node's selection status changed
    const wasSelected = prev.selectedPath === prev.node.path;
    const isSelected = next.selectedPath === next.node.path;
    if (wasSelected !== isSelected) return false;
  }
  // Check if this node's expansion state changed
  const wasExpanded = prev.expandedSet.has(prev.node.path);
  const isExpanded = next.expandedSet.has(next.node.path);
  if (wasExpanded !== isExpanded) return false;
  // For folders, if children might be affected by expansion changes
  if (next.node.is_directory && prev.expandedSet !== next.expandedSet && isExpanded) {
    return false;
  }
  return true;
});

FileTreeItem.displayName = "FileTreeItem";

const ProjectExplorerInternal: React.FC = () => {
  const snapshot = useIDEState();
  const { actions } = useIDEStore();
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

  // Use Set for O(1) lookup
  const [expandedSet, setExpandedSet] = useState<Set<string>>(() => new Set());

  const handleExpand = useCallback(async (path: string, node: FileNode) => {
    const willExpand = !expandedSet.has(path);

    // Lazy load children if needed
    if (willExpand && node.is_directory && !node.children_loaded && (!node.children || node.children.length === 0)) {
      try {
        await actions.loadDirectoryChildren(path);
      } catch (error) {
        console.error('Failed to load directory children:', error);
      }
    }

    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, [expandedSet, actions]);

  const handleOpenFile = useCallback((node: FileNode) => {
    actions.openFile(node);
  }, [actions]);

  const handleContextMenuOpen = useCallback(
    (event: React.MouseEvent, node: FileNode) => {
      setMenuX(event.clientX);
      setMenuY(event.clientY);

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
      <div className="flex-1 overflow-hidden">
        {projectRoot ? (
          <>
            {/* Project root header */}
            <div
              className={cn(
                "w-full h-7 px-3 flex items-center text-left font-medium cursor-pointer transition-colors duration-100",
                selectedPath === projectRoot.path
                  ? "bg-accent/50 text-accent-foreground"
                  : "text-foreground hover:bg-muted/50",
              )}
              onClick={() => setSelectedPath(projectRoot.path)}
              onContextMenu={(event) => {
                event.preventDefault();
                setSelectedPath(projectRoot.path);
                handleContextMenuOpen(event, projectRoot);
              }}
            >
              <FolderOpen size={16} className="mr-1.5 shrink-0" style={{ color: "var(--accent-primary)" }} />
              <span className="text-sm truncate">{projectRoot.name}</span>
            </div>

            {/* File tree using optimized file-tree.tsx components */}
            {projectRoot.children && projectRoot.children.length > 0 && (
              <Tree
                indicator={true}
                className="pt-1"
              >
                {projectRoot.children.map((child) => (
                  <FileTreeItem
                    key={child.path}
                    node={child}
                    selectedPath={selectedPath}
                    expandedSet={expandedSet}
                    onSelect={setSelectedPath}
                    onContextMenu={handleContextMenuOpen}
                    onExpand={handleExpand}
                    onOpenFile={handleOpenFile}
                  />
                ))}
              </Tree>
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
            <FolderIconLucide size={32} className="mx-auto mb-2 opacity-50" />
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
