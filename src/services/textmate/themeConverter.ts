import type * as monaco from 'monaco-editor';
import type { TextMateTheme, ThemeTokenColor, MonacoTokenThemeRule } from './types';

/**
 * Convert a TextMate/VS Code theme to Monaco theme format
 */
export class ThemeConverter {
  /**
   * Convert VS Code theme to Monaco theme
   */
  static convertTheme(
    vsCodeTheme: TextMateTheme,
    baseTheme: 'vs' | 'vs-dark' | 'hc-black' = 'vs-dark'
  ): monaco.editor.IStandaloneThemeData {
    const tokenRules = this.convertTokenColors(vsCodeTheme.tokenColors);

    return {
      base: baseTheme,
      inherit: true,
      rules: tokenRules,
      colors: vsCodeTheme.colors || {}
    };
  }

  /**
   * Convert token colors to Monaco token theme rules
   */
  private static convertTokenColors(tokenColors: ThemeTokenColor[]): MonacoTokenThemeRule[] {
    const rules: MonacoTokenThemeRule[] = [];

    for (const tokenColor of tokenColors) {
      const scopes = Array.isArray(tokenColor.scope)
        ? tokenColor.scope
        : [tokenColor.scope];

      for (const scope of scopes) {
        if (!scope) continue;

        const rule: MonacoTokenThemeRule = {
          token: this.convertScopeToMonacoToken(scope)
        };

        if (tokenColor.foreground) {
          rule.foreground = this.normalizeColor(tokenColor.foreground);
        }

        if (tokenColor.background) {
          rule.background = this.normalizeColor(tokenColor.background);
        }

        if (tokenColor.fontStyle) {
          rule.fontStyle = tokenColor.fontStyle;
        }

        rules.push(rule);
      }
    }

    return rules;
  }

  /**
   * Convert TextMate scope to Monaco token
   * Monaco uses dot notation, TextMate uses dot notation too, so mostly passthrough
   */
  private static convertScopeToMonacoToken(scope: string): string {
    // Remove any leading/trailing whitespace
    return scope.trim();
  }

  /**
   * Normalize color format (remove # if present, ensure hex format)
   */
  private static normalizeColor(color: string): string {
    // Remove # if present
    color = color.replace(/^#/, '');

    // Ensure uppercase
    color = color.toUpperCase();

    // Handle 3-digit hex colors (e.g., "F00" -> "FF0000")
    if (color.length === 3) {
      color = color
        .split('')
        .map(c => c + c)
        .join('');
    }

    // Handle 8-digit hex colors (RGBA) by removing alpha channel
    // Monaco doesn't support alpha in theme colors
    if (color.length === 8) {
      color = color.substring(0, 6);
    }

    return color;
  }

  /**
   * Apply a theme to Monaco editor
   */
  static applyTheme(
    themeName: string,
    theme: TextMateTheme,
    baseTheme: 'vs' | 'vs-dark' | 'hc-black' = 'vs-dark'
  ): void {
    const monaco = require('monaco-editor');
    const monacoTheme = this.convertTheme(theme, baseTheme);
    monaco.editor.defineTheme(themeName, monacoTheme);
    console.log(`Applied TextMate theme: ${themeName}`);
  }

  /**
   * Get base theme from theme type
   */
  static getBaseTheme(themeType?: 'light' | 'dark'): 'vs' | 'vs-dark' | 'hc-black' {
    if (themeType === 'light') {
      return 'vs';
    }
    return 'vs-dark';
  }
}
