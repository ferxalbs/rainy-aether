/**
 * Monaco Editor Worker Configuration for Vite
 *
 * Uses Vite's native ?worker import syntax (recommended approach for Vite 2+)
 * See: https://vitejs.dev/guide/features.html#web-workers
 */

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

/**
 * Configure Monaco workers using Vite's native worker support
 * This is the recommended approach for Vite projects in 2024+
 */
export const configureMonacoForVite = () => {
  if (typeof window === 'undefined') {
    return;
  }

  // Configure Monaco Environment to use Vite-bundled workers
  (window as any).MonacoEnvironment = {
    getWorker(_: any, label: string) {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    }
  };

  console.info('[Monaco] Workers configured via Vite native ?worker imports');
};