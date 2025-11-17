import React from 'react';
import { StatusBarSelect, SelectOption } from '@/components/ui/statusbar-select';

interface EOLSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentEOL: string;
  onEOLChange: (eol: string) => void;
}

// End of Line options with enhanced icons
const EOL_OPTIONS: SelectOption[] = [
  {
    id: 'lf',
    name: 'LF',
    description: 'Unix/Linux/macOS (\\n) - Recommended',
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
        className="text-green-500"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 8v8" />
        <path d="M8 12l4 4 4-4" />
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
        className="text-blue-500"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 12h6" />
        <path d="M12 9l3 3-3 3" />
      </svg>
    ),
  },
  {
    id: 'cr',
    name: 'CR',
    description: 'Classic Mac (\\r) - Legacy',
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
        className="text-orange-500"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M16 12H8" />
        <path d="M12 8l-4 4 4 4" />
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
      title="Select End of Line Sequence"
      placeholder="Select EOL..."
      searchable={false}
      grouped={false}
    />
  );
}
