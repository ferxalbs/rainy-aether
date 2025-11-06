import * as monaco from 'monaco-editor';
import type { IGrammar, IToken } from 'vscode-textmate';
import { grammarRegistry } from './grammarRegistry';

/**
 * Monaco tokenizer that uses TextMate grammars
 */
export class MonacoTextMateTokenizer {
  private grammar: IGrammar;

  constructor(grammar: IGrammar, _languageId: string) {
    this.grammar = grammar;
  }

  /**
   * Get the initial state for tokenization
   */
  getInitialState(): monaco.languages.IState {
    return new TextMateState(null);
  }

  /**
   * Tokenize a line (encoded version for better performance)
   */
  tokenizeEncoded(
    line: string,
    state: monaco.languages.IState
  ): monaco.languages.IEncodedLineTokens {
    const tmState = state as TextMateState;
    const result = this.grammar.tokenizeLine2(line, tmState.ruleStack, 500);

    return {
      tokens: result.tokens,
      endState: new TextMateState(result.ruleStack),
    };
  }

  /**
   * Tokenize a line (legacy method)
   */
  tokenize(
    line: string,
    state: monaco.languages.IState
  ): monaco.languages.ILineTokens {
    const tmState = state as TextMateState;
    const result = this.grammar.tokenizeLine(line, tmState.ruleStack, 500);

    // Convert TextMate tokens to Monaco tokens
    const tokens: monaco.languages.IToken[] = result.tokens.map((token: IToken) => ({
      startIndex: token.startIndex,
      scopes: this.convertScopesToMonaco(token.scopes)
    }));

    return {
      tokens,
      endState: new TextMateState(result.ruleStack),
    };
  }

  /**
   * Convert TextMate scopes to Monaco-compatible token type
   */
  private convertScopesToMonaco(scopes: string[]): string {
    // The last scope is the most specific
    if (scopes.length === 0) return '';

    // Use the most specific scope (last in the array)
    const scope = scopes[scopes.length - 1];

    // Monaco uses the scope as-is
    return scope;
  }
}

/**
 * TextMate tokenization state for Monaco
 */
class TextMateState implements monaco.languages.IState {
  ruleStack: any;

  constructor(ruleStack: any) {
    this.ruleStack = ruleStack;
  }

  clone(): monaco.languages.IState {
    return new TextMateState(this.ruleStack);
  }

  equals(other: monaco.languages.IState): boolean {
    if (!(other instanceof TextMateState)) {
      return false;
    }
    return this.ruleStack === other.ruleStack;
  }
}

/**
 * Register a TextMate grammar with Monaco for a specific language
 */
export async function registerTextMateLanguage(languageId: string): Promise<boolean> {
  try {
    console.log(`Registering TextMate tokenizer for language: ${languageId}`);

    // Load the grammar
    const grammar = await grammarRegistry.loadGrammarByLanguage(languageId);
    if (!grammar) {
      console.warn(`Failed to load grammar for language: ${languageId}`);
      return false;
    }

    // Create the tokenizer
    const tokenizer = new MonacoTextMateTokenizer(grammar, languageId);

    // Register with Monaco
    const disposable = monaco.languages.setTokensProvider(languageId, tokenizer);

    // Store the disposable for cleanup
    const loadedGrammar = grammarRegistry.getGrammar(languageId);
    if (loadedGrammar) {
      loadedGrammar.disposable = disposable;
    }

    console.log(`Successfully registered TextMate tokenizer for ${languageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to register TextMate tokenizer for ${languageId}:`, error);
    return false;
  }
}

/**
 * Register multiple TextMate languages with Monaco
 */
export async function registerTextMateLanguages(languageIds: string[]): Promise<void> {
  const results = await Promise.allSettled(
    languageIds.map(id => registerTextMateLanguage(id))
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - successful;

  console.log(`TextMate registration complete: ${successful} succeeded, ${failed} failed`);
}

/**
 * Unregister a TextMate language from Monaco
 */
export function unregisterTextMateLanguage(languageId: string): void {
  const loadedGrammar = grammarRegistry.getGrammar(languageId);
  if (loadedGrammar?.disposable) {
    loadedGrammar.disposable.dispose();
  }
  grammarRegistry.unloadGrammar(languageId);
}
