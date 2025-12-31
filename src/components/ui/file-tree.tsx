import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronRight, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

type TreeViewElement = {
  id: string
  name: string
  isSelectable?: boolean
  children?: TreeViewElement[]
}

type TreeContextProps = {
  selectedId: string | undefined
  expandedSet: Set<string>
  indicator: boolean
  handleExpand: (id: string) => void
  selectItem: (id: string) => void
  openIcon?: React.ReactNode
  closeIcon?: React.ReactNode
  direction: "rtl" | "ltr"
}

const TreeContext = createContext<TreeContextProps | null>(null)

const useTree = () => {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error("useTree must be used within a TreeProvider")
  }
  return context
}

type Direction = "rtl" | "ltr" | undefined

type TreeViewProps = {
  initialSelectedId?: string
  indicator?: boolean
  elements?: TreeViewElement[]
  initialExpandedItems?: string[]
  openIcon?: React.ReactNode
  closeIcon?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

const Tree = forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      initialSelectedId,
      initialExpandedItems,
      children,
      indicator = true,
      openIcon,
      closeIcon,
      dir,
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(
      initialSelectedId
    )
    // Use Set for O(1) lookups instead of array includes()
    const [expandedSet, setExpandedSet] = useState<Set<string>>(
      () => new Set(initialExpandedItems ?? [])
    )

    const selectItem = useCallback((id: string) => {
      setSelectedId(id)
    }, [])

    const handleExpand = useCallback((id: string) => {
      setExpandedSet((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }, [])

    const direction: "rtl" | "ltr" = dir === "rtl" ? "rtl" : "ltr"

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
      selectedId,
      expandedSet,
      handleExpand,
      selectItem,
      indicator,
      openIcon,
      closeIcon,
      direction,
    }), [selectedId, expandedSet, handleExpand, selectItem, indicator, openIcon, closeIcon, direction])

    return (
      <TreeContext.Provider value={contextValue}>
        <div className={cn("size-full", className)} {...props}>
          <ScrollArea
            ref={ref}
            className="relative h-full px-2"
            dir={dir as Direction}
          >
            <div className="flex flex-col gap-0.5 py-1">
              {children}
            </div>
          </ScrollArea>
        </div>
      </TreeContext.Provider>
    )
  }
)

Tree.displayName = "Tree"

const TreeIndicator = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { direction } = useTree()

  return (
    <div
      dir={direction}
      ref={ref}
      className={cn(
        "absolute left-1.5 top-0 bottom-0 w-px bg-border/40 rtl:right-1.5 rtl:left-auto",
        className
      )}
      {...props}
    />
  )
})

TreeIndicator.displayName = "TreeIndicator"

type FolderProps = {
  expandedItems?: string[]
  element: string
  value: string
  isSelectable?: boolean
  isSelect?: boolean
} & React.HTMLAttributes<HTMLDivElement>

const Folder = forwardRef<HTMLDivElement, FolderProps>(
  (
    {
      className,
      element,
      value,
      isSelectable = true,
      isSelect,
      children,
      ...props
    },
    ref
  ) => {
    const {
      direction,
      handleExpand,
      expandedSet,
      indicator,
      openIcon,
      closeIcon,
    } = useTree()

    // O(1) lookup with Set
    const isExpanded = expandedSet.has(value as string)

    const handleClick = useCallback(() => {
      if (isSelectable) {
        handleExpand(value as string)
      }
    }, [handleExpand, value, isSelectable])

    return (
      <div ref={ref} className="relative" {...props}>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1 rounded-md px-1 py-1 text-sm",
            {
              "bg-muted rounded-md": isSelect && isSelectable,
              "cursor-pointer hover:bg-muted/50": isSelectable,
              "cursor-not-allowed opacity-50": !isSelectable,
            },
            className
          )}
          disabled={!isSelectable}
          onClick={handleClick}
        >
          {/* Chevron indicator */}
          {isExpanded ? (
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 opacity-60" />
          )}
          {/* Folder icon */}
          {isExpanded
            ? (openIcon ?? <FolderOpenIcon className="size-4 shrink-0" />)
            : (closeIcon ?? <FolderIcon className="size-4 shrink-0" />)}
          <span className="truncate">{element}</span>
        </button>

        {/* Children - simple conditional render, no animation for performance */}
        {isExpanded && children && (
          <div
            className={cn(
              "relative ml-4 flex flex-col gap-0.5 py-0.5",
              direction === "rtl" && "mr-4 ml-0"
            )}
          >
            {indicator && <TreeIndicator aria-hidden="true" />}
            {children}
          </div>
        )}
      </div>
    )
  }
)

Folder.displayName = "Folder"

const File = forwardRef<
  HTMLButtonElement,
  {
    value: string
    handleSelect?: (id: string) => void
    isSelectable?: boolean
    isSelect?: boolean
    fileIcon?: React.ReactNode
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    {
      value,
      className,
      handleSelect,
      isSelectable = true,
      isSelect,
      fileIcon,
      children,
      ...props
    },
    ref
  ) => {
    const { direction, selectedId, selectItem } = useTree()
    const isSelected = isSelect ?? selectedId === value

    const handleClick = useCallback(() => {
      selectItem(value)
      handleSelect?.(value)
    }, [selectItem, handleSelect, value])

    return (
      <button
        ref={ref}
        type="button"
        disabled={!isSelectable}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-1 py-1 text-sm",
          {
            "bg-muted": isSelected && isSelectable,
          },
          isSelectable ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed opacity-50",
          direction === "rtl" ? "rtl" : "ltr",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {/* Spacer for alignment with folders */}
        <span className="size-3.5 shrink-0" />
        {fileIcon ?? <FileIcon className="size-4 shrink-0" />}
        {children}
      </button>
    )
  }
)

File.displayName = "File"

const CollapseButton = forwardRef<
  HTMLButtonElement,
  {
    elements: TreeViewElement[]
    expandAll?: boolean
  } & React.HTMLAttributes<HTMLButtonElement>
>(({ className, elements, expandAll = false, children, ...props }, ref) => {
  // CollapseButton is rarely used, keeping simple implementation
  return (
    <button
      className={cn("absolute right-2 bottom-1 h-8 w-fit p-1", className)}
      ref={ref}
      {...props}
    >
      {children}
      <span className="sr-only">Toggle</span>
    </button>
  )
})

CollapseButton.displayName = "CollapseButton"

export { CollapseButton, File, Folder, Tree, type TreeViewElement }
