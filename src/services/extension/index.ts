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

// Types
export * from './types';
