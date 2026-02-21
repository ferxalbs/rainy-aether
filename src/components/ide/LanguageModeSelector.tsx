import React, { useMemo } from 'react';
import { StatusBarSelect, SelectGroup } from '@/components/ui/statusbar-select';

interface LanguageModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentLanguage: string;
  isAutoMode: boolean;
  onLanguageChange: (languageId: string) => void;
}

const AutoDetectIcon = () => (
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
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

export function LanguageModeSelector({
  isOpen,
  onClose,
  triggerRef,
  currentLanguage,
  isAutoMode,
  onLanguageChange,
}: LanguageModeSelectorProps) {
  const languageGroups = useMemo<SelectGroup[]>(() => {
    return [
      {
        label: 'Auto Detection',
        options: [
          {
            id: 'auto',
            name: 'Auto Detect',
            description: 'Always enabled. Language is detected from file name and content.',
            icon: <AutoDetectIcon />,
          },
        ],
      },
    ];
  }, []);

  return (
    <StatusBarSelect
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      options={languageGroups}
      selectedId={isAutoMode ? 'auto' : currentLanguage}
      onSelect={onLanguageChange}
      title="Select Language Mode"
      placeholder="Search languages..."
      searchable={true}
      grouped={true}
    />
  );
}
