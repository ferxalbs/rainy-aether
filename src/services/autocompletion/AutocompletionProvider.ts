/**
 * AI Autocompletion Provider
 * 
 * Monaco InlineCompletionsProvider implementation for AI-powered code completions.
 * Provides ghost text suggestions that can be accepted with Tab.
 */

import * as monaco from 'monaco-editor';
import { getAutocompletionService } from './AutocompletionService';
import { AutocompletionContext } from './types';
import { autocompletionActions, getAutocompletionState } from '../../stores/autocompletionStore';

// ============================================================================
// Provider Implementation
// ============================================================================

export class AutocompletionProvider implements monaco.languages.InlineCompletionsProvider {
    /**
     * Provide inline completions for the current cursor position
     */
    async provideInlineCompletions(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        _context: monaco.languages.InlineCompletionContext,
        token: monaco.CancellationToken
    ): Promise<monaco.languages.InlineCompletions> {
        console.debug('[AutocompletionProvider] provideInlineCompletions called at L' + position.lineNumber + ':C' + position.column);

        // Check if autocompletion is enabled
        const state = getAutocompletionState();
        if (!state.enabled) {
            console.debug('[AutocompletionProvider] Disabled in state, skipping');
            return { items: [] };
        }

        // Check cancellation
        if (token.isCancellationRequested) {
            console.debug('[AutocompletionProvider] Request cancelled');
            return { items: [] };
        }

        // Get the service
        const service = getAutocompletionService();
        if (!service.isReady()) {
            console.debug('[AutocompletionProvider] Service not ready, attempting init...');
            await service.initialize();
            if (!service.isReady()) {
                console.debug('[AutocompletionProvider] Service still not ready (no API key?)');
                return { items: [] };
            }
        }

        // Build context from model
        const autocompletionContext = this.buildContext(model, position);
        if (!autocompletionContext) {
            console.debug('[AutocompletionProvider] Failed to build context');
            return { items: [] };
        }

        console.debug('[AutocompletionProvider] Requesting AI completion for', autocompletionContext.language);

        // Set loading state
        autocompletionActions.setLoading(true);

        try {
            // Get completion from service
            const result = await service.getCompletion(autocompletionContext);

            // Check cancellation again
            if (token.isCancellationRequested) {
                return { items: [] };
            }

            if (!result || !result.text) {
                return { items: [] };
            }

            // Record generation
            autocompletionActions.recordGenerated();

            // Create inline completion item
            const item: monaco.languages.InlineCompletion = {
                insertText: result.text,
                range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                ),
            };

            return {
                items: [item],
            };
        } catch (error) {
            console.error('[AutocompletionProvider] Error:', error);
            return { items: [] };
        } finally {
            autocompletionActions.setLoading(false);
        }
    }

    /**
     * Handle inline completions (cleanup) - deprecated, use disposeInlineCompletions
     */
    freeInlineCompletions(_completions: monaco.languages.InlineCompletions): void {
        // Nothing to clean up for now
    }

    /**
     * Dispose inline completions (cleanup)
     */
    disposeInlineCompletions(_completions: monaco.languages.InlineCompletions): void {
        // Nothing to clean up for now
    }

    /**
     * Build autocompletion context from Monaco model
     */
    private buildContext(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): AutocompletionContext | null {
        try {
            const fileUri = model.uri.toString();
            const language = model.getLanguageId();

            // Get prefix (text before cursor)
            const prefixRange = new monaco.Range(
                1, 1,
                position.lineNumber, position.column
            );
            const prefix = model.getValueInRange(prefixRange);

            // Get suffix (text after cursor)
            const lineCount = model.getLineCount();
            const lastLineLength = model.getLineLength(lineCount);
            const suffixRange = new monaco.Range(
                position.lineNumber, position.column,
                lineCount, lastLineLength + 1
            );
            const suffix = model.getValueInRange(suffixRange);

            // Get current line info
            const currentLine = model.getLineContent(position.lineNumber);
            const indentMatch = currentLine.match(/^(\s*)/);
            const indentation = indentMatch ? indentMatch[1] : '';

            return {
                fileUri,
                language,
                prefix,
                suffix,
                cursorLine: position.lineNumber,
                cursorColumn: position.column,
                currentLine,
                indentation,
            };
        } catch (error) {
            console.error('[AutocompletionProvider] Failed to build context:', error);
            return null;
        }
    }
}

// ============================================================================
// Provider Registration
// ============================================================================

let providerDisposable: monaco.IDisposable | null = null;
let providerInstance: AutocompletionProvider | null = null;

/**
 * Register the autocompletion provider with Monaco
 */
export function registerAutocompletionProvider(): void {
    // Dispose existing provider if any
    if (providerDisposable) {
        providerDisposable.dispose();
        providerDisposable = null;
    }

    // Create new provider
    providerInstance = new AutocompletionProvider();

    // Register for all languages using wildcard
    providerDisposable = monaco.languages.registerInlineCompletionsProvider(
        { pattern: '**' },
        providerInstance
    );

    console.log('[AutocompletionProvider] Registered for all languages');
}

/**
 * Unregister the autocompletion provider
 */
export function unregisterAutocompletionProvider(): void {
    if (providerDisposable) {
        providerDisposable.dispose();
        providerDisposable = null;
    }
    providerInstance = null;
    console.log('[AutocompletionProvider] Unregistered');
}

/**
 * Get the provider instance
 */
export function getAutocompletionProvider(): AutocompletionProvider | null {
    return providerInstance;
}
