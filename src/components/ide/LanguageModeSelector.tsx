import React, { useMemo } from 'react';
import * as monaco from 'monaco-editor';
import { StatusBarSelect, SelectGroup } from '@/components/ui/statusbar-select';
import { getLanguageDisplayName } from '@/utils/languageMap';

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
    const monacoLanguages = monaco.languages
      .getLanguages()
      .filter((lang) => lang.id && lang.id !== 'vs.editor.nullLanguage')
      .map((lang) => ({
        id: lang.id,
        name: getLanguageDisplayName(lang.id),
        description: lang.extensions?.slice(0, 4).join(', ') || lang.aliases?.[0] || lang.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      {
        label: 'Auto Detection',
        options: [
          {
            id: 'auto',
            name: 'Auto Detect',
            description: 'Detect language from file extension',
            icon: <AutoDetectIcon />,
          },
        ],
      },
      {
        label: 'Available Languages',
        options: monacoLanguages,
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
