/**
 * Monaco Extra Library Definitions
 * Provides type definitions for common libraries to reduce "Cannot find module" errors
 */

import * as monaco from 'monaco-editor';

/**
 * Add extra library definitions to Monaco TypeScript service
 * This helps reduce false positives for common imports
 */
export function addMonacoExtraLibs() {
  // React types stub
  const reactTypes = `
    declare module 'react' {
      export function useState<T>(initialState: T | (() => T)): [T, (value: T) => void];
      export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
      export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
      export function useMemo<T>(factory: () => T, deps: any[]): T;
      export function useRef<T>(initialValue: T): { current: T };
      export const Fragment: any;
      export default React;
      export namespace React {
        export type FC<P = {}> = (props: P) => JSX.Element | null;
        export type ReactNode = any;
        export type CSSProperties = any;
      }
    }
    
    declare module 'react-dom' {
      export function render(element: any, container: any): void;
      export function createRoot(container: any): any;
    }
    
    declare module 'react-dom/client' {
      export function createRoot(container: any): any;
    }
  `;

  // Tauri API stub
  const tauriTypes = `
    declare module '@tauri-apps/api' {
      export const invoke: <T = any>(cmd: string, args?: any) => Promise<T>;
    }
    
    declare module '@tauri-apps/api/core' {
      export const invoke: <T = any>(cmd: string, args?: any) => Promise<T>;
    }
    
    declare module '@tauri-apps/plugin-dialog' {
      export function open(options?: any): Promise<string | string[] | null>;
      export function save(options?: any): Promise<string | null>;
    }
    
    declare module '@tauri-apps/plugin-fs' {
      export function readTextFile(path: string): Promise<string>;
      export function writeTextFile(path: string, contents: string): Promise<void>;
    }
  `;

  // Monaco editor types stub
  const monacoTypes = `
    declare module 'monaco-editor' {
      export * from 'monaco-editor/esm/vs/editor/editor.api';
    }
  `;

  // Common utility libraries
  const utilTypes = `
    declare module 'clsx' {
      export default function clsx(...args: any[]): string;
    }
    
    declare module 'tailwind-merge' {
      export function twMerge(...args: string[]): string;
    }
    
    declare module 'lucide-react' {
      export const ChevronRight: any;
      export const ChevronDown: any;
      export const File: any;
      export const Folder: any;
      export const FolderOpen: any;
      // Add more as needed
      const icons: Record<string, any>;
      export default icons;
    }
  `;

  try {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(reactTypes, 'ts:react.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(tauriTypes, 'ts:tauri.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(monacoTypes, 'ts:monaco.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(utilTypes, 'ts:utils.d.ts');

    monaco.languages.typescript.javascriptDefaults.addExtraLib(reactTypes, 'js:react.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(tauriTypes, 'js:tauri.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(utilTypes, 'js:utils.d.ts');

    console.info('[Monaco] Extra library definitions added');
  } catch (error) {
    console.warn('[Monaco] Failed to add extra libs:', error);
  }
}
