/**
 * Font Settings Component
 *
 * UI for managing editor fonts with:
 * - Google Fonts browser and download
 * - Custom font import
 * - Font preview
 * - Current font selection
 */

import React, { useState, useEffect } from 'react';
import { fontManager, type FontMetadata } from '@/services/fontManager';
import { configurationService } from '@/services/configurationService';
import { cn } from '@/lib/cn';
import { open } from '@tauri-apps/plugin-dialog';

export const FontSettings: React.FC = () => {
  const [installedFonts, setInstalledFonts] = useState<FontMetadata[]>([]);
  const [googleFonts, setGoogleFonts] = useState<FontMetadata[]>([]);
  const [selectedFont, setSelectedFont] = useState<string>('');
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog 0123456789');
  const [activeTab, setActiveTab] = useState<'installed' | 'google' | 'import'>('installed');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load current font selection
  useEffect(() => {
    const currentFont = configurationService.get<string>('editor.fontFamily', 'Consolas, monospace');
    setSelectedFont(currentFont.split(',')[0].trim().replace(/['"]/g, ''));

    // Load installed fonts
    loadInstalledFonts();
  }, []);

  const loadInstalledFonts = () => {
    const fonts = fontManager.getInstalledFonts();
    setInstalledFonts([...fonts]);
  };

  const loadGoogleFonts = async () => {
    if (googleFonts.length > 0) return; // Already loaded

    setIsLoading(true);
    setError(null);

    try {
      const fonts = await fontManager.fetchGoogleFonts();
      setGoogleFonts([...fonts]);
    } catch (err: any) {
      setError(`Failed to load Google Fonts: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFontSelect = async (family: string) => {
    setSelectedFont(family);

    // Update configuration
    await configurationService.set({
      key: 'editor.fontFamily',
      value: `"${family}", monospace`,
      scope: 'user'
    });
  };

  const handleInstallGoogleFont = async (fontId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await fontManager.installGoogleFont(fontId);
      loadInstalledFonts();

      // Refresh Google Fonts list to update install status
      setGoogleFonts([]);
      await loadGoogleFonts();
    } catch (err: any) {
      setError(`Failed to install font: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCustomFont = async () => {
    try {
      // Open file dialog
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Font Files',
          extensions: ['ttf', 'otf', 'woff', 'woff2']
        }]
      });

      if (!selected) return;

      // Extract font family name from filename
      const fileName = typeof selected === 'string' ? selected.split(/[/\\]/).pop() : selected.path.split(/[/\\]/).pop();
      const family = fileName?.split('.')[0].replace(/-/g, ' ') || 'Custom Font';

      setIsLoading(true);
      setError(null);

      // Validate font file
      const validation = await fontManager.validateFontFile(typeof selected === 'string' ? selected : selected.path);
      if (!validation.valid) {
        setError(validation.error || 'Invalid font file');
        setIsLoading(false);
        return;
      }

      // Import font
      await fontManager.importCustomFont(typeof selected === 'string' ? selected : selected.path, family);
      loadInstalledFonts();

      // Switch to installed tab
      setActiveTab('installed');
    } catch (err: any) {
      setError(`Failed to import font: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstallFont = async (fontId: string) => {
    if (!confirm('Are you sure you want to uninstall this font?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await fontManager.uninstallFont(fontId);
      loadInstalledFonts();
    } catch (err: any) {
      setError(`Failed to uninstall font: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGoogleFonts = googleFonts.filter(font =>
    font.family.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Editor Fonts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the font used in your code editor
        </p>
      </div>

      {/* Font Preview */}
      <div className="border-b border-border p-4 bg-muted/20">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
          Preview
        </label>
        <div
          className="bg-background border border-border rounded p-4 min-h-[120px]"
          style={{ fontFamily: selectedFont }}
        >
          <textarea
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="w-full bg-transparent text-foreground resize-none outline-none"
            style={{ fontFamily: selectedFont }}
            rows={4}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Current font: <span className="font-medium text-foreground">{selectedFont}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex">
        <button
          onClick={() => setActiveTab('installed')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'installed'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Installed Fonts ({installedFonts.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('google');
            loadGoogleFonts();
          }}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'google'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Google Fonts
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'import'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Import Custom Font
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 m-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'installed' && (
          <div className="space-y-2">
            {installedFonts.map((font) => (
              <div
                key={font.id}
                className={cn(
                  'border border-border rounded p-3 hover:bg-muted/20 cursor-pointer transition-colors',
                  selectedFont === font.family && 'bg-primary/10 border-primary'
                )}
                onClick={() => handleFontSelect(font.family)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground" style={{ fontFamily: font.family }}>
                      {font.family}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {font.source === 'system' && 'System Font'}
                      {font.source === 'google' && 'Google Font'}
                      {font.source === 'custom' && 'Custom Font'}
                      {' · '}
                      {font.variants.length} variant{font.variants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {font.source !== 'system' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUninstallFont(font.id);
                      }}
                      className="px-3 py-1 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                      disabled={isLoading}
                    >
                      Uninstall
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'google' && (
          <div>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Fonts..."
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {isLoading && googleFonts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading Google Fonts...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGoogleFonts.map((font) => {
                  const isInstalled = installedFonts.some(f => f.id === font.id);

                  return (
                    <div
                      key={font.id}
                      className="border border-border rounded p-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {font.family}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {font.variants.length} variant{font.variants.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {isInstalled ? (
                          <div className="px-3 py-1 text-xs bg-green-500/10 text-green-500 rounded">
                            Installed
                          </div>
                        ) : (
                          <button
                            onClick={() => handleInstallGoogleFont(font.id)}
                            className="px-3 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                            disabled={isLoading}
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredGoogleFonts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No fonts found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div className="max-w-md mx-auto text-center py-8">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Import Custom Font
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Import your own font files (.ttf, .otf, .woff, .woff2)
            </p>
            <button
              onClick={handleImportCustomFont}
              className="px-6 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Importing...' : 'Choose Font File'}
            </button>
            <div className="mt-6 p-4 bg-muted/20 border border-border rounded text-left">
              <p className="text-xs font-medium text-foreground mb-2">Supported Formats:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• TrueType Font (.ttf)</li>
                <li>• OpenType Font (.otf)</li>
                <li>• Web Open Font Format (.woff, .woff2)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
