import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EncodingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentEncoding: string;
  onEncodingChange: (encoding: string) => void;
}

// Common file encodings
const ENCODINGS = [
  { id: 'utf8', name: 'UTF-8', description: 'Universal character encoding' },
  { id: 'utf8bom', name: 'UTF-8 with BOM', description: 'UTF-8 with byte order mark' },
  { id: 'utf16le', name: 'UTF-16 LE', description: 'UTF-16 little endian' },
  { id: 'utf16be', name: 'UTF-16 BE', description: 'UTF-16 big endian' },
  { id: 'windows1252', name: 'Windows 1252', description: 'Western European (Windows)' },
  { id: 'iso88591', name: 'ISO 8859-1', description: 'Western European (ISO)' },
  { id: 'iso88592', name: 'ISO 8859-2', description: 'Central European (ISO)' },
  { id: 'iso88593', name: 'ISO 8859-3', description: 'South European (ISO)' },
  { id: 'iso88594', name: 'ISO 8859-4', description: 'North European (ISO)' },
  { id: 'iso88595', name: 'ISO 8859-5', description: 'Cyrillic (ISO)' },
  { id: 'iso88596', name: 'ISO 8859-6', description: 'Arabic (ISO)' },
  { id: 'iso88597', name: 'ISO 8859-7', description: 'Greek (ISO)' },
  { id: 'iso88598', name: 'ISO 8859-8', description: 'Hebrew (ISO)' },
  { id: 'iso88599', name: 'ISO 8859-9', description: 'Turkish (ISO)' },
  { id: 'iso885913', name: 'ISO 8859-13', description: 'Baltic (ISO)' },
  { id: 'iso885915', name: 'ISO 8859-15', description: 'Western European with Euro (ISO)' },
  { id: 'macroman', name: 'Mac Roman', description: 'Western European (Mac)' },
  { id: 'cp437', name: 'CP437', description: 'DOS US' },
  { id: 'cp850', name: 'CP850', description: 'DOS Western European' },
  { id: 'cp866', name: 'CP866', description: 'DOS Cyrillic' },
  { id: 'shiftjis', name: 'Shift JIS', description: 'Japanese (Shift-JIS)' },
  { id: 'eucjp', name: 'EUC-JP', description: 'Japanese (EUC-JP)' },
  { id: 'iso2022jp', name: 'ISO-2022-JP', description: 'Japanese (JIS)' },
  { id: 'gbk', name: 'GBK', description: 'Chinese (GBK)' },
  { id: 'gb18030', name: 'GB18030', description: 'Chinese (GB18030)' },
  { id: 'big5', name: 'Big5', description: 'Traditional Chinese (Big5)' },
  { id: 'euckr', name: 'EUC-KR', description: 'Korean' },
  { id: 'koi8r', name: 'KOI8-R', description: 'Cyrillic (KOI8-R)' },
  { id: 'koi8u', name: 'KOI8-U', description: 'Cyrillic (KOI8-U)' },
];

export function EncodingSelector({
  isOpen,
  onClose,
  triggerRef,
  currentEncoding,
  onEncodingChange,
}: EncodingSelectorProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate position relative to trigger
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 400, // Show above the statusbar
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

  if (!isOpen) return null;

  // Filter encodings
  const filteredEncodings = ENCODINGS.filter(
    (enc) =>
      enc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (encodingId: string) => {
    const encoding = ENCODINGS.find((e) => e.id === encodingId);
    if (encoding) {
      onEncodingChange(encoding.name);
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed z-[9999] w-96 rounded-lg shadow-2xl border',
        'bg-background border-border',
        'overflow-hidden flex flex-col max-h-96'
      )}
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Select File Encoding</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-muted p-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
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
            placeholder="Search encodings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
            autoFocus
          />
        </div>
      </div>

      {/* Encodings List */}
      <ScrollArea className="flex-1 h-[300px]">
        {filteredEncodings.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No encodings found
          </div>
        ) : (
          <div className="py-1">
            {filteredEncodings.map((encoding) => (
              <button
                key={encoding.id}
                onClick={() => handleSelect(encoding.id)}
                className={cn(
                  'w-full px-4 py-2 text-left transition-all duration-150',
                  'hover:bg-accent hover:text-accent-foreground',
                  'flex items-center justify-between group',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
                  currentEncoding === encoding.name && 'bg-accent text-accent-foreground'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{encoding.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{encoding.description}</div>
                </div>

                {currentEncoding === encoding.name && (
                  <div className="flex-shrink-0 ml-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-medium text-foreground">{currentEncoding}</span>
        </p>
      </div>
    </div>
  );
}
