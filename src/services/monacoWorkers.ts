// Monaco Editor Worker Configuration
// This file provides a centralized way to configure Monaco workers for different environments

// For Vite/Webpack bundlers - use CDN workers with proper configuration
export const getMonacoWorkerUrl = (_moduleId: string, label: string): string => {
  // Use CDN URLs for all workers to avoid Vite glob issues
  switch (label) {
    case 'json':
      return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs/language/json/json.worker.js';
    case 'css':
    case 'scss':
    case 'less':
      return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs/language/css/css.worker.js';
    case 'html':
    case 'handlebars':
    case 'razor':
      return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs/language/html/html.worker.js';
    case 'typescript':
    case 'javascript':
      return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs/language/typescript/ts.worker.js';
    default:
      return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs/editor/editor.worker.js';
  }
};

// For Create React App - copy workers to public folder
export const getMonacoWorkerUrlCRA = (_moduleId: string, label: string): string => {
  return `/${label}.worker.js`;
};

// For custom webpack setups - use proper URL construction without glob patterns
export const getMonacoWorkerUrlWebpack = (moduleId: string, label: string): string => {
  // Use CDN URLs instead of trying to resolve npm package paths
  // This avoids Vite glob import issues
  return getMonacoWorkerUrl(moduleId, label);
};

// Configure Monaco Environment
export const configureMonacoEnvironment = (workerUrlGetter: (moduleId: string, label: string) => string) => {
  if (typeof window !== 'undefined') {
    window.MonacoEnvironment = {
      getWorkerUrl: workerUrlGetter,
    };
  }
};

// Default configuration for Vite
export const configureMonacoForVite = () => {
  configureMonacoEnvironment(getMonacoWorkerUrl);
};

// Configuration for Create React App
export const configureMonacoForCRA = () => {
  configureMonacoEnvironment(getMonacoWorkerUrlCRA);
};

// Configuration for custom webpack
export const configureMonacoForWebpack = () => {
  configureMonacoEnvironment(getMonacoWorkerUrlWebpack);
};