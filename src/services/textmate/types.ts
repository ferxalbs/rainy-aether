import type { IGrammar, IRawGrammar } from 'vscode-textmate';
import type * as monaco from 'monaco-editor';

/**
 * Configuration for a TextMate grammar
 */
export interface GrammarConfiguration {
  /**
   * Language ID (e.g., 'python', 'typescript')
   */
  language: string;

  /**
   * TextMate scope name (e.g., 'source.python')
   */
  scopeName: string;

  /**
   * Path to the grammar file
   */
  path: string;

  /**
   * Embedded languages
   */
  embeddedLanguages?: { [scopeName: string]: string };

  /**
   * Token types
   */
  tokenTypes?: { [scopeName: string]: string };
}

/**
 * Loaded grammar information
 */
export interface LoadedGrammar {
  /**
   * TextMate grammar instance
   */
  grammar: IGrammar;

  /**
   * Grammar configuration
   */
  configuration: GrammarConfiguration;

  /**
   * Monaco disposable for cleanup
   */
  disposable?: monaco.IDisposable;
}

/**
 * TextMate tokenization state
 */
export interface TokenizationState {
  /**
   * Rule stack for incremental tokenization
   */
  ruleStack: any;
}

/**
 * Grammar loader function type
 */
export type GrammarLoader = (scopeName: string) => Promise<IRawGrammar | null>;

/**
 * Theme token color
 */
export interface ThemeTokenColor {
  /**
   * Token scope selector
   */
  scope: string | string[];

  /**
   * Foreground color
   */
  foreground?: string;

  /**
   * Background color
   */
  background?: string;

  /**
   * Font style (bold, italic, underline)
   */
  fontStyle?: string;
}

/**
 * TextMate theme definition
 */
export interface TextMateTheme {
  /**
   * Theme name
   */
  name: string;

  /**
   * Theme type (light/dark)
   */
  type?: 'light' | 'dark';

  /**
   * Token colors
   */
  tokenColors: ThemeTokenColor[];

  /**
   * Editor colors
   */
  colors?: { [key: string]: string };
}

/**
 * Monaco token theme rule
 */
export interface MonacoTokenThemeRule {
  /**
   * Token type
   */
  token: string;

  /**
   * Foreground color
   */
  foreground?: string;

  /**
   * Background color
   */
  background?: string;

  /**
   * Font style
   */
  fontStyle?: string;
}
