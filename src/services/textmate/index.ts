/**
 * TextMate service for syntax highlighting via TextMate grammars
 *
 * This module provides TextMate grammar support for Monaco Editor,
 * enabling rich syntax highlighting for VS Code extensions.
 */

export { TextMateService, textMateService } from './TextMateService';
export { GrammarRegistry, grammarRegistry } from './grammarRegistry';
export {
  MonacoTextMateTokenizer,
  registerTextMateLanguage,
  registerTextMateLanguages,
  unregisterTextMateLanguage
} from './MonacoTextMateTokenizer';
export { ThemeConverter } from './themeConverter';

export type {
  GrammarConfiguration,
  LoadedGrammar,
  TokenizationState,
  GrammarLoader,
  ThemeTokenColor,
  TextMateTheme,
  MonacoTokenThemeRule
} from './types';
