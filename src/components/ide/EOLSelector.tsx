import React from 'react';
import { StatusBarSelect, SelectOption } from '@/components/ui/statusbar-select';

interface EOLSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentEOL: string;
  onEOLChange: (eol: string) => void;
}

// End of Line options
const EOL_OPTIONS: SelectOption[] = [
  {
    id: 'lf',
    name: 'LF',
    description: 'Unix/Linux/macOS (\\n)',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3h18v18H3z"></path>
        <path d="M8 8v8"></path>
        <path d="M16 8l-4 4 4 4"></path>
      </svg>
    ),
  },
  {
    id: 'crlf',
    name: 'CRLF',
    description: 'Windows (\\r\\n)',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <path d="M8 8v8"></path>
        <path d="M16 8l-4 4 4 4"></path>
      </svg>
    ),
  },
  {
    id: 'cr',
    name: 'CR',
    description: 'Classic Mac (\\r)',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M16 8l-4 4 4 4"></path>
      </svg>
    ),
  },
];

// Normalize EOL for comparison
const normalizeEOL = (eol: string): string => {
  return eol.toUpperCase().replace(/[^A-Z]/g, '');
};

// Find EOL ID by name
const getEOLIdByName = (name: string): string => {
  const normalized = normalizeEOL(name);
  return EOL_OPTIONS.find((e) => normalizeEOL(e.name) === normalized)?.id || 'lf';
};

// Find EOL name by ID
const getEOLNameById = (id: string): string => {
  return EOL_OPTIONS.find((e) => e.id === id)?.name || 'LF';
};

export function EOLSelector({
  isOpen,
  onClose,
  triggerRef,
  currentEOL,
  onEOLChange,
}: EOLSelectorProps) {
  const handleSelect = (id: string) => {
    const eolName = getEOLNameById(id);
    onEOLChange(eolName);
  };

  const selectedId = getEOLIdByName(currentEOL);

  return (
    <StatusBarSelect
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      options={EOL_OPTIONS}
      selectedId={selectedId}
      onSelect={handleSelect}
      title="End of Line Sequence"
      placeholder="Select EOL..."
      searchable={false}
      grouped={false}
    />
  );
}
