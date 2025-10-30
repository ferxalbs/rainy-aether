import React from "react";
import { cn } from "../../lib/cn";

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onSelect: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, x, y, items, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        className={cn(
          "absolute z-50 rounded-md border border-border bg-secondary text-foreground shadow-xl min-w-[180px] py-1",
        )}
        style={{ left: `${x}px`, top: `${y}px` }}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
            >
              {Icon ? <Icon /> : null}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContextMenu;