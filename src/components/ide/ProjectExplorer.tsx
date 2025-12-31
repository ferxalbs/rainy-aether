import React, { useCallback, useMemo, useState, memo } from "react";
import { useIDEStore, useIDEState, FileNode } from "../../stores/ideStore";
import { File as FileIconLucide, Folder, FolderOpen, FilePlus, FolderPlus, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { iconThemeActions, useActiveIconTheme, type IconDefinition } from "@/stores/iconThemeStore";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import FileDialog from "./file-dialog";
import { ScrollArea } from "../ui/scroll-area";

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

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onToggleExpand: (path: string, node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
  expandedSet: Set<string>;
}

/**
 * High-performance file tree node - uses pure props to avoid hooks overhead
 */
const FileTreeNodeInternal: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  isSelected,
  isExpanded,
  onSelect,
  onContextMenu,
  onToggleExpand,
  onOpenFile,
  expandedSet,
}) => {
  const activeTheme = useActiveIconTheme();
  const paddingLeft = depth * 12 + 8;

  // Get icon from theme - memoized
  const icon = useMemo(() => {
    if (node.is_directory) {
      const folderIcon = iconThemeActions.getFolderIcon(node.name, isExpanded, false);
      if (folderIcon) return folderIcon;
      return { iconComponent: isExpanded ? FolderOpen : Folder };
    } else {
      const fileIcon = iconThemeActions.getFileIcon(node.name);
      if (fileIcon) return fileIcon;
      return { iconComponent: FileIconLucide };
    }
  }, [node.is_directory, node.name, isExpanded, activeTheme]);

  const handleClick = useCallback(() => {
    if (node.is_directory) {
      onSelect(node.path);
      onToggleExpand(node.path, node);
    } else {
      onSelect(node.path);
      onOpenFile(node);
    }
  }, [node, onSelect, onToggleExpand, onOpenFile]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(node.path);
    onContextMenu(event, node);
  }, [node, onContextMenu, onSelect]);

  // Inline style for padding (faster than template strings in className)
  const style = useMemo(() => ({ paddingLeft }), [paddingLeft]);

  // File node - simple button
  if (!node.is_directory) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1.5 rounded-sm h-7 text-sm",
          isSelected
            ? "bg-accent/50 text-accent-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        style={style}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <RenderIcon icon={icon} size={16} className="shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  // Folder node
  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1 rounded-sm h-7 text-sm",
          isSelected
            ? "bg-accent/50 text-accent-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        style={style}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isExpanded ? (
          <ChevronDown size={14} className="shrink-0 opacity-60" />
        ) : (
          <ChevronRight size={14} className="shrink-0 opacity-60" />
        )}
        <RenderIcon icon={icon} size={16} className="shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>

      {/* Children - only render when expanded */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="relative">
          {/* Tree line indicator */}
          <div
            className="absolute w-px bg-border/30"
            style={{
              left: paddingLeft + 6,
              top: 0,
              bottom: 0,
            }}
            aria-hidden="true"
          />
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              isSelected={false} // Will be set by parent via prop drilling
              isExpanded={expandedSet.has(child.path)}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onToggleExpand={onToggleExpand}
              onOpenFile={onOpenFile}
              expandedSet={expandedSet}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Optimized memo comparison - only re-render when necessary
const FileTreeNode = memo(FileTreeNodeInternal, (prev, next) => {
  // Quick reference check first
  if (prev.node !== next.node) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isExpanded !== next.isExpanded) return false;
  if (prev.depth !== next.depth) return false;
  // expandedSet only matters for child rendering which is controlled by isExpanded
  if (prev.expandedSet !== next.expandedSet && next.isExpanded) return false;
  return true;
});

FileTreeNode.displayName = "FileTreeNode";

/**
 * Virtualized file tree wrapper for root children
 */
const FileTreeList = memo<{
  children: FileNode[];
  selectedPath: string | null;
  expandedSet: Set<string>;
  onSelect: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onToggleExpand: (path: string, node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
}>(({ children, selectedPath, expandedSet, onSelect, onContextMenu, onToggleExpand, onOpenFile }) => {
  return (
    <>
      {children.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={0}
          isSelected={selectedPath === child.path}
          isExpanded={expandedSet.has(child.path)}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onToggleExpand={onToggleExpand}
          onOpenFile={onOpenFile}
          expandedSet={expandedSet}
        />
      ))}
    </>
  );
});

FileTreeList.displayName = "FileTreeList";

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

  // Use Set for O(1) lookup instead of array includes
  const [expandedSet, setExpandedSet] = useState<Set<string>>(() => new Set());

  // Stable callback refs to prevent child re-renders
  const handleToggleExpand = useCallback(async (path: string, node: FileNode) => {
    const willExpand = !expandedSet.has(path);

    // Lazy load children if needed
    if (willExpand && node.is_directory && !node.children_loaded && (!node.children || node.children.length === 0)) {
      try {
        await actions.loadDirectoryChildren(path);
      } catch (error) {
        console.error('Failed to load directory children:', error);
      }
    }

    setExpandedSet(prev => {
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

  const handleRootClick = useCallback(() => {
    if (projectRoot) setSelectedPath(projectRoot.path);
  }, [projectRoot]);

  const handleRootContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (projectRoot) {
      setSelectedPath(projectRoot.path);
      handleContextMenuOpen(event, projectRoot);
    }
  }, [projectRoot, handleContextMenuOpen]);

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
      <ScrollArea className="flex-1">
        <div className="px-1 py-1">
          {projectRoot ? (
            <>
              {/* Project root header */}
              <button
                type="button"
                className={cn(
                  "w-full h-7 px-2 flex items-center text-left font-medium rounded-sm mb-0.5",
                  selectedPath === projectRoot.path
                    ? "bg-accent/50 text-accent-foreground"
                    : "text-foreground hover:bg-muted/50",
                )}
                onClick={handleRootClick}
                onContextMenu={handleRootContextMenu}
              >
                <FolderOpen size={16} className="mr-1.5 shrink-0" style={{ color: "var(--accent-primary)" }} />
                <span className="text-sm truncate">{projectRoot.name}</span>
              </button>

              {/* File tree */}
              {projectRoot.children && projectRoot.children.length > 0 && (
                <FileTreeList
                  children={projectRoot.children}
                  selectedPath={selectedPath}
                  expandedSet={expandedSet}
                  onSelect={setSelectedPath}
                  onContextMenu={handleContextMenuOpen}
                  onToggleExpand={handleToggleExpand}
                  onOpenFile={handleOpenFile}
                />
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
      </ScrollArea>
    </div>
  );
};

// Memoize ProjectExplorer to prevent unnecessary re-renders
const ProjectExplorer = memo(ProjectExplorerInternal);

export default ProjectExplorer;
