import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SelectOption {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface StatusBarSelectProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  options: SelectOption[] | SelectGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  searchable?: boolean;
  title?: string;
  grouped?: boolean;
}

export function StatusBarSelect({
  isOpen,
  onClose,
  triggerRef,
  options,
  selectedId,
  onSelect,
  placeholder = 'Search...',
  searchable = true,
  title,
  grouped = false,
}: StatusBarSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position relative to trigger
  useEffect(() => {
    const current = triggerRef.current;
    if (isOpen && current) {
      const rect = current.getBoundingClientRect();
      setPosition({
        top: rect.top - 240,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, triggerRef]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-selector="popover"]') &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  // Filter options based on search query
  const filterOptions = (opts: SelectOption[]) => {
    if (!searchQuery) return opts;

    return opts.filter(
      (opt) =>
        opt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Prepare filtered data
  let filteredOptions: SelectOption[] = [];
  let groupedData: Array<{ label: string; options: SelectOption[] }> = [];

  if (grouped) {
    groupedData = (options as SelectGroup[])
      .map((group) => ({
        label: group.label,
        options: filterOptions(group.options),
      }))
      .filter((group) => group.options.length > 0);
  } else {
    filteredOptions = filterOptions(options as SelectOption[]);
  }

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
    setSearchQuery('');
  };

  return (
    <div
      data-selector="popover"
      className={cn(
        'fixed z-50 rounded-md shadow-lg border',
        'bg-background border-border',
        'overflow-hidden'
      )}
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        width: '280px',
        maxHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      {title && (
        <div className="px-3 py-2 border-b border-border shrink-0 bg-muted/30">
          <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        </div>
      )}

      {/* Search Input */}
      {searchable && (
        <div className="px-2 py-2 border-b border-border shrink-0">
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <Input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 h-6 text-xs bg-input"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Options List */}
      <ScrollArea className="flex-1 overflow-hidden">
        {!grouped && filteredOptions.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground text-xs">
            No options found
          </div>
        )}

        {!grouped && filteredOptions.length > 0 && (
          <div className="py-1">
            {filteredOptions.map((option) => (
              <SelectOptionItem
                key={option.id}
                option={option}
                isSelected={option.id === selectedId}
                onClick={() => handleSelect(option.id)}
              />
            ))}
          </div>
        )}

        {grouped && groupedData.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground text-xs">
            No options found
          </div>
        )}

        {grouped && groupedData.length > 0 && (
          <div className="py-1">
            {groupedData.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </div>
                {group.options.map((option) => (
                  <SelectOptionItem
                    key={option.id}
                    option={option}
                    isSelected={option.id === selectedId}
                    onClick={() => handleSelect(option.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface SelectOptionItemProps {
  option: SelectOption;
  isSelected: boolean;
  onClick: () => void;
}

function SelectOptionItem({ option, isSelected, onClick }: SelectOptionItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-1.5 text-left transition-colors text-xs',
        'hover:bg-accent/50 hover:text-accent-foreground',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
        'flex items-center gap-2 group',
        isSelected && 'bg-primary/10 text-primary'
      )}
    >
      {/* Icon */}
      {option.icon && (
        <div className="shrink-0 flex items-center justify-center w-4 h-4">
          {option.icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs truncate">{option.name}</div>
        {option.description && (
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
            {option.description}
          </div>
        )}
      </div>

      {/* Checkmark */}
      {isSelected && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary shrink-0"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      )}
    </button>
  );
}
