/**
 * AI Autocompletion Module
 * 
 * Exports for the AI-powered inline autocompletion system.
 */

// Types
export type {
    AutocompletionConfig,
    AutocompletionContext,
    AutocompletionResult,
    AutocompletionCacheKey,
    AutocompletionState,
    AutocompletionTriggerKind,
    InlineCompletionItem,
} from './types';

export { DEFAULT_AUTOCOMPLETION_CONFIG } from './types';

// Service
export {
    AutocompletionService,
    getAutocompletionService,
    initializeAutocompletionService,
} from './AutocompletionService';

// Provider
export {
    AutocompletionProvider,
    registerAutocompletionProvider,
    unregisterAutocompletionProvider,
    getAutocompletionProvider,
} from './AutocompletionProvider';
