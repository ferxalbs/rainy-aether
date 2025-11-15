/**
 * Extension Runtime System
 *
 * Public API exports for the extension code execution system (Phase 2).
 */

// Core classes
export { ExtensionSandbox, createExtensionSandbox } from './ExtensionSandbox';
export { ModuleLoader, createModuleLoader } from './ModuleLoader';
export { ExtensionContext, createExtensionContext, type ExtensionContextConfig } from './ExtensionContext';
export { ActivationManager, createActivationManager, ActivationEvents } from './ActivationManager';

// API shim
export { createVSCodeAPI } from './VSCodeAPIShim';

// Language Server Protocol shim
export { LanguageClient, State as LanguageClientState, vscodeLanguageClient } from './vscode-languageclient-shim';

// Icon Theme API
export { iconThemeAPI } from './iconThemeAPI';
export type { IconThemeContribution } from './iconThemeAPI';

// Configuration API
export { configurationAPI } from './configurationAPI';
export type { ConfigurationContribution } from './configurationAPI';

// Types
export * from './types';
