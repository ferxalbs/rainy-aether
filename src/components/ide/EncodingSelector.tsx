import React from 'react';
import { StatusBarSelect, SelectGroup } from '@/components/ui/statusbar-select';

interface EncodingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentEncoding: string;
  onEncodingChange: (encoding: string) => void;
}

// Common file encodings organized by category
const ENCODING_GROUPS: SelectGroup[] = [
  {
    label: 'Unicode',
    options: [
      { id: 'utf8', name: 'UTF-8', description: 'Universal character encoding (recommended)' },
      { id: 'utf8bom', name: 'UTF-8 with BOM', description: 'UTF-8 with byte order mark' },
      { id: 'utf16le', name: 'UTF-16 LE', description: 'UTF-16 little endian' },
      { id: 'utf16be', name: 'UTF-16 BE', description: 'UTF-16 big endian' },
    ],
  },
  {
    label: 'Western European',
    options: [
      { id: 'windows1252', name: 'Windows 1252', description: 'Western European (Windows)' },
      { id: 'iso88591', name: 'ISO 8859-1', description: 'Western European (ISO Latin-1)' },
      { id: 'iso885915', name: 'ISO 8859-15', description: 'Western European with Euro' },
      { id: 'macroman', name: 'Mac Roman', description: 'Western European (Mac)' },
    ],
  },
  {
    label: 'European',
    options: [
      { id: 'iso88592', name: 'ISO 8859-2', description: 'Central European' },
      { id: 'iso88593', name: 'ISO 8859-3', description: 'South European' },
      { id: 'iso88594', name: 'ISO 8859-4', description: 'North European' },
      { id: 'iso885913', name: 'ISO 8859-13', description: 'Baltic' },
    ],
  },
  {
    label: 'Cyrillic',
    options: [
      { id: 'iso88595', name: 'ISO 8859-5', description: 'Cyrillic (ISO)' },
      { id: 'koi8r', name: 'KOI8-R', description: 'Russian (KOI8-R)' },
      { id: 'koi8u', name: 'KOI8-U', description: 'Ukrainian (KOI8-U)' },
      { id: 'cp866', name: 'CP866', description: 'DOS Cyrillic' },
    ],
  },
  {
    label: 'Middle Eastern',
    options: [
      { id: 'iso88596', name: 'ISO 8859-6', description: 'Arabic' },
      { id: 'iso88597', name: 'ISO 8859-7', description: 'Greek' },
      { id: 'iso88598', name: 'ISO 8859-8', description: 'Hebrew' },
      { id: 'iso88599', name: 'ISO 8859-9', description: 'Turkish' },
    ],
  },
  {
    label: 'Asian',
    options: [
      { id: 'shiftjis', name: 'Shift JIS', description: 'Japanese (Shift-JIS)' },
      { id: 'eucjp', name: 'EUC-JP', description: 'Japanese (EUC-JP)' },
      { id: 'iso2022jp', name: 'ISO-2022-JP', description: 'Japanese (JIS)' },
      { id: 'gbk', name: 'GBK', description: 'Simplified Chinese (GBK)' },
      { id: 'gb18030', name: 'GB18030', description: 'Chinese (GB18030)' },
      { id: 'big5', name: 'Big5', description: 'Traditional Chinese (Big5)' },
      { id: 'euckr', name: 'EUC-KR', description: 'Korean' },
    ],
  },
  {
    label: 'DOS/OEM',
    options: [
      { id: 'cp437', name: 'CP437', description: 'DOS United States' },
      { id: 'cp850', name: 'CP850', description: 'DOS Western European' },
    ],
  },
];

// Find encoding ID by name
const getEncodingIdByName = (name: string): string => {
  for (const group of ENCODING_GROUPS) {
    const encoding = group.options.find((e) => e.name === name);
    if (encoding) return encoding.id;
  }
  return 'utf8';
};

// Find encoding name by ID
const getEncodingNameById = (id: string): string => {
  for (const group of ENCODING_GROUPS) {
    const encoding = group.options.find((e) => e.id === id);
    if (encoding) return encoding.name;
  }
  return 'UTF-8';
};

export function EncodingSelector({
  isOpen,
  onClose,
  triggerRef,
  currentEncoding,
  onEncodingChange,
}: EncodingSelectorProps) {
  const handleSelect = (encodingId: string) => {
    const encodingName = getEncodingNameById(encodingId);
    onEncodingChange(encodingName);
  };

  const selectedId = getEncodingIdByName(currentEncoding);

  return (
    <StatusBarSelect
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      options={ENCODING_GROUPS}
      selectedId={selectedId}
      onSelect={handleSelect}
      title="Select File Encoding"
      placeholder="Search encodings..."
      searchable={true}
      grouped={true}
    />
  );
}
