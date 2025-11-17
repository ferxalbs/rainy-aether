import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckIcon } from '@radix-ui/react-icons';

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
  const [search, setSearch] = useState('');

  // Reset search when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  // Prepare data for rendering
  const renderOptions = () => {
    if (grouped) {
      const groups = options as SelectGroup[];
      return groups.map((group) => (
        <CommandGroup key={group.label} heading={group.label}>
          {group.options.map((option) => (
            <CommandItem
              key={option.id}
              value={option.id}
              onSelect={() => handleSelect(option.id)}
              className="gap-2"
            >
              {option.icon && (
                <div className="shrink-0 flex items-center justify-center w-4 h-4">
                  {option.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{option.name}</div>
                {option.description && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {option.description}
                  </div>
                )}
              </div>
              {selectedId === option.id && (
                <CheckIcon className="h-4 w-4 text-primary shrink-0" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      ));
    } else {
      const flatOptions = options as SelectOption[];
      return (
        <CommandGroup>
          {flatOptions.map((option) => (
            <CommandItem
              key={option.id}
              value={option.id}
              keywords={[option.name, option.description || '']}
              onSelect={() => handleSelect(option.id)}
              className="gap-2"
            >
              {option.icon && (
                <div className="shrink-0 flex items-center justify-center w-4 h-4">
                  {option.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{option.name}</div>
                {option.description && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {option.description}
                  </div>
                )}
              </div>
              {selectedId === option.id && (
                <CheckIcon className="h-4 w-4 text-primary shrink-0" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      {/* Invisible trigger positioned at the status bar item */}
      <PopoverTrigger asChild>
        <div
          className="absolute"
          style={{
            left: triggerRef.current?.getBoundingClientRect().left || 0,
            top: triggerRef.current?.getBoundingClientRect().top || 0,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className={cn(
          "w-[320px] p-0",
          "shadow-xl border-border/50"
        )}
        onOpenAutoFocus={(e: Event) => {
          e.preventDefault();
        }}
      >
        <Command shouldFilter={!grouped} className="rounded-lg">
          {/* Header with title */}
          {title && (
            <div className="px-3 py-2.5 border-b border-border bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground tracking-tight">
                {title}
              </h3>
            </div>
          )}

          {/* Search input */}
          {searchable && (
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
          )}

          {/* Options list */}
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {renderOptions()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
