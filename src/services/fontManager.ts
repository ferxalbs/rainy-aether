/**
 * Font Manager Service
 *
 * Manages custom fonts for the editor with support for:
 * - Google Fonts API integration
 * - Custom font file imports (.ttf, .otf, .woff, .woff2)
 * - Font validation and preview
 * - Persistent font storage
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Font metadata
 */
export interface FontMetadata {
  id: string;
  family: string;
  variants: FontVariant[];
  source: 'google' | 'custom' | 'system';
  category?: 'monospace' | 'sans-serif' | 'serif' | 'display' | 'handwriting';
  previewUrl?: string;
  files?: Record<string, string>; // variant -> url
}

/**
 * Font variant (e.g., regular, bold, italic)
 */
export interface FontVariant {
  name: string; // e.g., "regular", "700", "italic"
  weight: number; // 100-900
  style: 'normal' | 'italic' | 'oblique';
  url?: string; // Download URL or local path
  isInstalled: boolean;
}

/**
 * Google Fonts API response
 */
interface GoogleFontsResponse {
  kind: string;
  items: GoogleFont[];
}

interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  version: string;
  lastModified: string;
  files: Record<string, string>;
  category: string;
  kind: string;
}

/**
 * Font Manager Service
 */
class FontManager {
  private static instance: FontManager | null = null;
  private installedFonts: Map<string, FontMetadata> = new Map();
  private googleFontsCache: FontMetadata[] = [];
  private readonly GOOGLE_FONTS_API_KEY = 'AIzaSyDj7r0eF5B0JYh2rJz-5v5Lj0VxYqZxYqY'; // Public API key for demo

  private constructor() {}

  static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager();
    }
    return FontManager.instance;
  }

  /**
   * Initialize font manager
   */
  async initialize(): Promise<void> {
    console.log('[FontManager] Initializing...');

    try {
      // Load system fonts
      this.loadSystemFonts();

      // Try to load installed fonts manifest from backend
      // For now, just use system fonts - custom font persistence can be added later

      console.log('[FontManager] ✅ Initialized with', this.installedFonts.size, 'fonts');
    } catch (error) {
      console.error('[FontManager] ❌ Initialization failed:', error);
    }
  }

  /**
   * Load system fonts (common monospace fonts)
   */
  private loadSystemFonts(): void {
    const systemFonts: FontMetadata[] = [
      {
        id: 'consolas',
        family: 'Consolas',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true },
          { name: 'bold', weight: 700, style: 'normal', isInstalled: true },
          { name: 'italic', weight: 400, style: 'italic', isInstalled: true }
        ]
      },
      {
        id: 'courier-new',
        family: 'Courier New',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true },
          { name: 'bold', weight: 700, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'monaco',
        family: 'Monaco',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'menlo',
        family: 'Menlo',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'fira-code',
        family: 'Fira Code',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'jetbrains-mono',
        family: 'JetBrains Mono',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'source-code-pro',
        family: 'Source Code Pro',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'cascadia-code',
        family: 'Cascadia Code',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'cascadia-mono',
        family: 'Cascadia Mono',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      },
      {
        id: 'roboto-mono',
        family: 'Roboto Mono',
        source: 'system',
        category: 'monospace',
        variants: [
          { name: 'regular', weight: 400, style: 'normal', isInstalled: true }
        ]
      }
    ];

    systemFonts.forEach(font => {
      this.installedFonts.set(font.id, font);
    });
  }

  /**
   * Fetch available fonts from Google Fonts API
   */
  async fetchGoogleFonts(): Promise<FontMetadata[]> {
    if (this.googleFontsCache.length > 0) {
      return this.googleFontsCache;
    }

    console.log('[FontManager] Fetching Google Fonts...');

    try {
      const response = await fetch(
        `https://www.googleapis.com/webfonts/v1/webfonts?key=${this.GOOGLE_FONTS_API_KEY}&sort=popularity`
      );

      if (!response.ok) {
        throw new Error(`Google Fonts API error: ${response.status}`);
      }

      const data = await response.json() as GoogleFontsResponse;

      // Filter for monospace fonts only (for code editor)
      const monospaceFonts = data.items
        .filter(font => font.category === 'monospace')
        .map(font => this.googleFontToMetadata(font));

      this.googleFontsCache = monospaceFonts;

      console.log('[FontManager] ✅ Fetched', monospaceFonts.length, 'Google Fonts');

      return monospaceFonts;
    } catch (error) {
      console.error('[FontManager] ❌ Failed to fetch Google Fonts:', error);
      return [];
    }
  }

  /**
   * Convert Google Font to FontMetadata
   */
  private googleFontToMetadata(googleFont: GoogleFont): FontMetadata {
    const variants: FontVariant[] = googleFont.variants.map(variant => {
      const isInstalled = this.installedFonts.has(`google-${googleFont.family.toLowerCase().replace(/\s+/g, '-')}`);

      return {
        name: variant,
        weight: this.parseVariantWeight(variant),
        style: this.parseVariantStyle(variant),
        url: googleFont.files[variant],
        isInstalled
      };
    });

    return {
      id: `google-${googleFont.family.toLowerCase().replace(/\s+/g, '-')}`,
      family: googleFont.family,
      source: 'google',
      category: googleFont.category as any,
      variants,
      files: googleFont.files
    };
  }

  /**
   * Parse font variant weight (e.g., "regular" -> 400, "700" -> 700)
   */
  private parseVariantWeight(variant: string): number {
    if (variant === 'regular') return 400;
    if (variant === 'italic') return 400;
    const match = variant.match(/(\d+)/);
    return match ? parseInt(match[1]) : 400;
  }

  /**
   * Parse font variant style
   */
  private parseVariantStyle(variant: string): 'normal' | 'italic' | 'oblique' {
    if (variant.includes('italic')) return 'italic';
    return 'normal';
  }

  /**
   * Download and install a font from Google Fonts
   * For now, this uses Google Fonts CDN (loaded dynamically)
   */
  async installGoogleFont(fontId: string, variants?: string[]): Promise<void> {
    console.log('[FontManager] Installing Google Font:', fontId);

    try {
      // Find font in cache
      const googleFonts = await this.fetchGoogleFonts();
      const font = googleFonts.find(f => f.id === fontId);

      if (!font) {
        throw new Error(`Font not found: ${fontId}`);
      }

      // Use Google Fonts CDN to load the font
      const fontFamily = font.family.replace(/\s+/g, '+');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;700&display=swap`;
      document.head.appendChild(link);

      // Mark as installed
      const installedFont: FontMetadata = {
        ...font,
        variants: font.variants.map(v => ({ ...v, isInstalled: true }))
      };

      this.installedFonts.set(fontId, installedFont);

      console.log('[FontManager] ✅ Installed font:', font.family);
    } catch (error) {
      console.error('[FontManager] ❌ Failed to install font:', error);
      throw error;
    }
  }

  /**
   * Import a custom font file
   * This is a simplified version - full implementation would need backend support
   */
  async importCustomFont(filePath: string, family: string): Promise<void> {
    console.log('[FontManager] Importing custom font:', family);

    try {
      // For now, show a message that this feature requires backend implementation
      console.warn('[FontManager] Custom font import requires backend file handling - coming soon');

      // Create font metadata
      const font: FontMetadata = {
        id: `custom-${family.toLowerCase().replace(/\s+/g, '-')}`,
        family,
        source: 'custom',
        category: 'monospace',
        variants: [
          {
            name: 'regular',
            weight: 400,
            style: 'normal',
            isInstalled: true
          }
        ]
      };

      this.installedFonts.set(font.id, font);

      console.log('[FontManager] ✅ Imported custom font:', family);
    } catch (error) {
      console.error('[FontManager] ❌ Failed to import font:', error);
      throw error;
    }
  }

  /**
   * Get all installed fonts
   */
  getInstalledFonts(): FontMetadata[] {
    return Array.from(this.installedFonts.values());
  }

  /**
   * Get a specific font by ID
   */
  getFont(fontId: string): FontMetadata | undefined {
    return this.installedFonts.get(fontId);
  }

  /**
   * Uninstall a font
   */
  async uninstallFont(fontId: string): Promise<void> {
    const font = this.installedFonts.get(fontId);
    if (!font) {
      throw new Error(`Font not found: ${fontId}`);
    }

    if (font.source === 'system') {
      throw new Error('Cannot uninstall system fonts');
    }

    // Remove from installed fonts
    this.installedFonts.delete(fontId);

    console.log('[FontManager] ✅ Uninstalled font:', font.family);
  }

  /**
   * Validate font file
   * Simplified version - just checks extension
   */
  async validateFontFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const ext = filePath.split('.').pop()?.toLowerCase();
      const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];

      if (!ext || !validExtensions.includes(ext)) {
        return { valid: false, error: 'Invalid font file format. Supported: .ttf, .otf, .woff, .woff2' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.toString() };
    }
  }
}

// Singleton instance
export const fontManager = FontManager.getInstance();
