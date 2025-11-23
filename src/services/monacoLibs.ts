/**
 * Monaco Extra Library Definitions
 * Provides comprehensive type definitions for Node.js, browser APIs, and common libraries
 * to enhance IntelliSense and reduce "Cannot find module" errors
 */

import * as monaco from 'monaco-editor';

/**
 * Add extra library definitions to Monaco TypeScript service
 * This helps reduce false positives for common imports
 */
export function addMonacoExtraLibs() {
  // Node.js Core Modules - Comprehensive definitions
  const nodeTypes = `
    // Node.js Global Types
    declare namespace NodeJS {
      export interface Process {
        env: Record<string, string | undefined>;
        cwd(): string;
        exit(code?: number): never;
        nextTick(callback: (...args: any[]) => void, ...args: any[]): void;
        platform: 'aix' | 'android' | 'darwin' | 'freebsd' | 'haiku' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'cygwin' | 'netbsd';
        version: string;
        versions: Record<string, string>;
        argv: string[];
        execPath: string;
        abort(): never;
        chdir(directory: string): void;
        memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
      }
      export interface Global {}
      export interface Timer {
        ref(): this;
        unref(): this;
        hasRef(): boolean;
        refresh(): this;
      }
      export interface Timeout extends Timer {}
      export interface Immediate extends Timer {}
    }

    declare var process: NodeJS.Process;
    declare var global: typeof globalThis;
    declare var __dirname: string;
    declare var __filename: string;
    declare var exports: any;
    declare var module: { exports: any; require: NodeRequire; id: string; filename: string; loaded: boolean; parent: any; children: any[] };
    declare var require: NodeRequire;

    interface NodeRequire {
      (id: string): any;
      resolve(id: string): string;
      cache: Record<string, any>;
      main: any;
    }

    // Buffer - Node.js Buffer API
    declare class Buffer extends Uint8Array {
      static from(data: any, encoding?: string): Buffer;
      static alloc(size: number, fill?: any, encoding?: string): Buffer;
      static allocUnsafe(size: number): Buffer;
      static isBuffer(obj: any): obj is Buffer;
      static concat(list: Uint8Array[], totalLength?: number): Buffer;
      toString(encoding?: string, start?: number, end?: number): string;
      toJSON(): { type: 'Buffer'; data: number[] };
      write(string: string, offset?: number, length?: number, encoding?: string): number;
      slice(start?: number, end?: number): Buffer;
    }

    // Path Module
    declare module 'path' {
      export function join(...paths: string[]): string;
      export function resolve(...paths: string[]): string;
      export function dirname(path: string): string;
      export function basename(path: string, ext?: string): string;
      export function extname(path: string): string;
      export function normalize(path: string): string;
      export function isAbsolute(path: string): boolean;
      export function relative(from: string, to: string): string;
      export function parse(path: string): { root: string; dir: string; base: string; ext: string; name: string };
      export function format(pathObject: { root?: string; dir?: string; base?: string; ext?: string; name?: string }): string;
      export const sep: string;
      export const delimiter: string;
      export namespace posix {
        export function join(...paths: string[]): string;
        export function resolve(...paths: string[]): string;
        export function dirname(path: string): string;
        export function basename(path: string, ext?: string): string;
        export function extname(path: string): string;
      }
      export namespace win32 {
        export function join(...paths: string[]): string;
        export function resolve(...paths: string[]): string;
        export function dirname(path: string): string;
        export function basename(path: string, ext?: string): string;
        export function extname(path: string): string;
      }
    }

    // FS Module
    declare module 'fs' {
      export interface Stats {
        isFile(): boolean;
        isDirectory(): boolean;
        isBlockDevice(): boolean;
        isCharacterDevice(): boolean;
        isSymbolicLink(): boolean;
        isFIFO(): boolean;
        isSocket(): boolean;
        size: number;
        mode: number;
        mtime: Date;
        atime: Date;
        ctime: Date;
        birthtime: Date;
      }
      export function readFile(path: string, encoding: string, callback: (err: Error | null, data: string) => void): void;
      export function readFile(path: string, callback: (err: Error | null, data: Buffer) => void): void;
      export function readFileSync(path: string, encoding: string): string;
      export function readFileSync(path: string): Buffer;
      export function writeFile(path: string, data: string | Buffer, callback: (err: Error | null) => void): void;
      export function writeFileSync(path: string, data: string | Buffer): void;
      export function stat(path: string, callback: (err: Error | null, stats: Stats) => void): void;
      export function statSync(path: string): Stats;
      export function exists(path: string, callback: (exists: boolean) => void): void;
      export function existsSync(path: string): boolean;
      export function mkdir(path: string, callback: (err: Error | null) => void): void;
      export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
      export function readdir(path: string, callback: (err: Error | null, files: string[]) => void): void;
      export function readdirSync(path: string): string[];
      export function unlink(path: string, callback: (err: Error | null) => void): void;
      export function unlinkSync(path: string): void;
      export function rmdir(path: string, callback: (err: Error | null) => void): void;
      export function rmdirSync(path: string, options?: { recursive?: boolean }): void;
      export function rename(oldPath: string, newPath: string, callback: (err: Error | null) => void): void;
      export function renameSync(oldPath: string, newPath: string): void;

      export namespace promises {
        export function readFile(path: string, encoding: string): Promise<string>;
        export function readFile(path: string): Promise<Buffer>;
        export function writeFile(path: string, data: string | Buffer): Promise<void>;
        export function stat(path: string): Promise<Stats>;
        export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
        export function readdir(path: string): Promise<string[]>;
        export function unlink(path: string): Promise<void>;
        export function rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
        export function rename(oldPath: string, newPath: string): Promise<void>;
      }
    }

    // HTTP Module
    declare module 'http' {
      export interface Server {
        listen(port: number, callback?: () => void): this;
        close(callback?: () => void): this;
      }
      export interface IncomingMessage {
        headers: Record<string, string>;
        url?: string;
        method?: string;
        statusCode?: number;
      }
      export interface ServerResponse {
        writeHead(statusCode: number, headers?: Record<string, string>): this;
        write(chunk: any): boolean;
        end(chunk?: any): void;
        statusCode: number;
      }
      export function createServer(requestListener?: (req: IncomingMessage, res: ServerResponse) => void): Server;
      export function request(options: any, callback?: (res: IncomingMessage) => void): any;
      export function get(url: string, callback?: (res: IncomingMessage) => void): any;
    }

    // HTTPS Module
    declare module 'https' {
      import * as http from 'http';
      export function createServer(options: any, requestListener?: (req: http.IncomingMessage, res: http.ServerResponse) => void): http.Server;
      export function request(options: any, callback?: (res: http.IncomingMessage) => void): any;
      export function get(url: string, callback?: (res: http.IncomingMessage) => void): any;
    }

    // Events Module
    declare module 'events' {
      export class EventEmitter {
        on(event: string | symbol, listener: (...args: any[]) => void): this;
        once(event: string | symbol, listener: (...args: any[]) => void): this;
        off(event: string | symbol, listener: (...args: any[]) => void): this;
        emit(event: string | symbol, ...args: any[]): boolean;
        removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
        removeAllListeners(event?: string | symbol): this;
        listeners(event: string | symbol): Function[];
        listenerCount(event: string | symbol): number;
      }
      export default EventEmitter;
    }

    // Util Module
    declare module 'util' {
      export function promisify<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => Promise<any>;
      export function format(format: string, ...args: any[]): string;
      export function inspect(object: any, options?: any): string;
      export function isArray(object: any): boolean;
      export function isDeepStrictEqual(val1: any, val2: any): boolean;
      export class TextDecoder {
        constructor(encoding?: string);
        decode(input?: Uint8Array): string;
      }
      export class TextEncoder {
        encode(input?: string): Uint8Array;
      }
    }

    // OS Module
    declare module 'os' {
      export function platform(): 'aix' | 'android' | 'darwin' | 'freebsd' | 'haiku' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'cygwin' | 'netbsd';
      export function arch(): string;
      export function cpus(): Array<{ model: string; speed: number; times: { user: number; nice: number; sys: number; idle: number; irq: number } }>;
      export function homedir(): string;
      export function hostname(): string;
      export function tmpdir(): string;
      export function type(): string;
      export function release(): string;
      export function version(): string;
      export function totalmem(): number;
      export function freemem(): number;
      export function uptime(): number;
      export const EOL: string;
    }

    // Child Process Module
    declare module 'child_process' {
      export interface ChildProcess {
        stdin: any;
        stdout: any;
        stderr: any;
        pid: number;
        kill(signal?: string): boolean;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export function spawn(command: string, args?: string[], options?: any): ChildProcess;
      export function exec(command: string, callback?: (error: Error | null, stdout: string, stderr: string) => void): ChildProcess;
      export function execSync(command: string, options?: any): Buffer | string;
      export function fork(modulePath: string, args?: string[], options?: any): ChildProcess;
    }

    // Stream Module
    declare module 'stream' {
      export class Readable {
        read(size?: number): any;
        pipe<T extends Writable>(destination: T, options?: { end?: boolean }): T;
        on(event: 'data', listener: (chunk: any) => void): this;
        on(event: 'end', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export class Writable {
        write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;
        end(callback?: () => void): void;
        on(event: 'finish', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export class Transform extends Readable {
        _transform(chunk: any, encoding: string, callback: (error?: Error | null, data?: any) => void): void;
      }
    }

    // Crypto Module
    declare module 'crypto' {
      export function randomBytes(size: number): Buffer;
      export function randomUUID(): string;
      export function createHash(algorithm: string): any;
      export function createHmac(algorithm: string, key: string | Buffer): any;
      export function pbkdf2(password: string, salt: string, iterations: number, keylen: number, digest: string, callback: (err: Error | null, derivedKey: Buffer) => void): void;
      export function pbkdf2Sync(password: string, salt: string, iterations: number, keylen: number, digest: string): Buffer;
    }

    // URL Module
    declare module 'url' {
      export interface URL {
        href: string;
        origin: string;
        protocol: string;
        username: string;
        password: string;
        host: string;
        hostname: string;
        port: string;
        pathname: string;
        search: string;
        searchParams: URLSearchParams;
        hash: string;
      }
      export class URLSearchParams {
        constructor(init?: string | Record<string, string>);
        append(name: string, value: string): void;
        delete(name: string): void;
        get(name: string): string | null;
        getAll(name: string): string[];
        has(name: string): boolean;
        set(name: string, value: string): void;
        toString(): string;
      }
      export function parse(urlString: string): any;
      export function format(urlObject: any): string;
    }
  `;

  // React types - More comprehensive
  const reactTypes = `
    declare module 'react' {
      export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
      export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
      export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
      export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
      export function useRef<T>(initialValue: T): { current: T };
      export function useRef<T = undefined>(): { current: T | undefined };
      export function useContext<T>(context: React.Context<T>): T;
      export function useReducer<R extends React.Reducer<any, any>>(
        reducer: R,
        initialState: React.ReducerState<R>,
        initializer?: undefined
      ): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];
      export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
      export function useImperativeHandle<T, R extends T>(ref: React.Ref<T> | undefined, init: () => R, deps?: readonly any[]): void;
      export function useDebugValue<T>(value: T, format?: (value: T) => any): void;
      export function useSyncExternalStore<Snapshot>(
        subscribe: (onStoreChange: () => void) => () => void,
        getSnapshot: () => Snapshot,
        getServerSnapshot?: () => Snapshot
      ): Snapshot;
      export function useTransition(): [boolean, (callback: () => void) => void];
      export function useDeferredValue<T>(value: T): T;
      export function useId(): string;
      export const Fragment: React.ComponentType<{ children?: React.ReactNode }>;
      export const StrictMode: React.ComponentType<{ children?: React.ReactNode }>;
      export const Suspense: React.ComponentType<{ children?: React.ReactNode; fallback?: React.ReactNode }>;
      export function createElement(type: any, props?: any, ...children: any[]): React.ReactElement;
      export function cloneElement(element: React.ReactElement, props?: any, ...children: any[]): React.ReactElement;
      export function createContext<T>(defaultValue: T): React.Context<T>;
      export function forwardRef<T, P = {}>(render: (props: P, ref: React.Ref<T>) => React.ReactElement | null): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<T>>;
      export function memo<P extends object>(Component: React.FunctionComponent<P>, propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean): React.NamedExoticComponent<P>;
      export function lazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>): React.LazyExoticComponent<T>;
      export default React;

      export namespace React {
        export type FC<P = {}> = FunctionComponent<P>;
        export type FunctionComponent<P = {}> = (props: P) => ReactElement | null;
        export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
        export type ReactNode = ReactElement | string | number | ReactFragment | ReactPortal | boolean | null | undefined;
        export type ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> = {
          type: T;
          props: P;
          key: Key | null;
        };
        export type ReactFragment = {} | Iterable<ReactNode>;
        export type ReactPortal = ReactElement;
        export type Key = string | number;
        export type Ref<T> = RefCallback<T> | RefObject<T> | null;
        export type RefCallback<T> = (instance: T | null) => void;
        export type RefObject<T> = { readonly current: T | null };
        export type CSSProperties = Record<string, any>;
        export type MouseEvent<T = Element> = Event & { target: T; currentTarget: T };
        export type ChangeEvent<T = Element> = Event & { target: T; currentTarget: T };
        export type FormEvent<T = Element> = Event & { target: T; currentTarget: T };
        export type KeyboardEvent<T = Element> = Event & { target: T; currentTarget: T; key: string; code: string };
        export type FocusEvent<T = Element> = Event & { target: T; currentTarget: T };
        export type Context<T> = { Provider: React.Provider<T>; Consumer: React.Consumer<T>; displayName?: string };
        export type Provider<T> = React.ComponentType<{ value: T; children?: ReactNode }>;
        export type Consumer<T> = React.ComponentType<{ children: (value: T) => ReactNode }>;
        export type Reducer<S, A> = (prevState: S, action: A) => S;
        export type Dispatch<A> = (value: A) => void;
        export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
        export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
        export type ComponentClass<P = {}> = new (props: P) => React.Component<P>;
        export class Component<P = {}, S = {}> {
          constructor(props: P);
          setState(state: Partial<S> | ((prevState: S, props: P) => Partial<S>), callback?: () => void): void;
          forceUpdate(callback?: () => void): void;
          render(): ReactNode;
          props: Readonly<P>;
          state: Readonly<S>;
        }
        export type ForwardRefExoticComponent<P> = React.ComponentType<P>;
        export type NamedExoticComponent<P = {}> = React.ComponentType<P>;
        export type LazyExoticComponent<T extends React.ComponentType<any>> = React.ComponentType<React.ComponentProps<T>>;
        export type ComponentProps<T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>> = T extends React.JSXElementConstructor<infer P> ? P : T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : {};
        export type PropsWithChildren<P = unknown> = P & { children?: ReactNode };
        export type PropsWithoutRef<P> = P extends any ? ('ref' extends keyof P ? Pick<P, Exclude<keyof P, 'ref'>> : P) : P;
        export type RefAttributes<T> = { ref?: Ref<T> };
        export type JSXElementConstructor<P> = ((props: P) => ReactElement | null) | (new (props: P) => React.Component<P>);
      }
    }

    declare module 'react-dom' {
      import * as React from 'react';
      export function render(element: React.ReactElement, container: Element | DocumentFragment): void;
      export function hydrate(element: React.ReactElement, container: Element | DocumentFragment): void;
      export function unmountComponentAtNode(container: Element | DocumentFragment): boolean;
      export function findDOMNode(component: React.Component): Element | null;
      export function createPortal(children: React.ReactNode, container: Element): React.ReactPortal;
      export function flushSync<R>(fn: () => R): R;
    }

    declare module 'react-dom/client' {
      import * as React from 'react';
      export interface Root {
        render(children: React.ReactNode): void;
        unmount(): void;
      }
      export function createRoot(container: Element, options?: { hydrate?: boolean }): Root;
      export function hydrateRoot(container: Element, initialChildren: React.ReactNode): Root;
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
    // Add extra libs with fallback-only approach
    // These are lightweight stubs that help IntelliSense without conflicting with real types

    // Note: These libs are intentionally minimal to avoid conflicts
    // They provide basic completions without full type checking

    // Add Node.js core types (basic stubs for common modules)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(nodeTypes, 'file:///node_modules/@types/node/index.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(nodeTypes, 'file:///node_modules/@types/node/index.d.ts');

    // Add React types (basic stubs for hooks and components)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(reactTypes, 'file:///node_modules/@types/react/index.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(reactTypes, 'file:///node_modules/@types/react/index.d.ts');

    // Add Tauri types
    monaco.languages.typescript.typescriptDefaults.addExtraLib(tauriTypes, 'file:///node_modules/@tauri-apps/api/index.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(tauriTypes, 'file:///node_modules/@tauri-apps/api/index.d.ts');

    // Add Monaco types
    monaco.languages.typescript.typescriptDefaults.addExtraLib(monacoTypes, 'file:///node_modules/monaco-editor/index.d.ts');

    // Add utility library types
    monaco.languages.typescript.typescriptDefaults.addExtraLib(utilTypes, 'file:///node_modules/@types/utils/index.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(utilTypes, 'file:///node_modules/@types/utils/index.d.ts');

    console.info('[Monaco] Extra library definitions added (Node.js, React, Tauri, Utilities)');
  } catch (error) {
    console.warn('[Monaco] Failed to add extra libs:', error);
  }
}
