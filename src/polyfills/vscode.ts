/**
 * VSCode API stub for browser environment
 *
 * vscode-languageclient has optional dependencies on the vscode module
 * which is only available in VS Code extension host environments.
 * This stub provides minimal exports to satisfy imports without functionality.
 *
 * In our Tauri environment, we use the browser-compatible parts of
 * vscode-languageclient with our custom Tauri IPC transport layer.
 */

// Disposable base class
export class Disposable {
  static from(...disposables: { dispose(): any }[]) {
    return new Disposable(() => {
      for (const d of disposables) {
        d.dispose();
      }
    });
  }

  constructor(private callOnDispose?: () => any) {}

  dispose(): any {
    if (this.callOnDispose) {
      this.callOnDispose();
    }
  }
}

// Event emitter
export class EventEmitter<T = any> {
  private listeners: ((e: T) => any)[] = [];

  get event() {
    return (listener: (e: T) => any) => {
      this.listeners.push(listener);
      return new Disposable(() => {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
          this.listeners.splice(index, 1);
        }
      });
    };
  }

  fire(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// URI class
export class Uri {
  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    return new Uri('', '', value, '', '');
  }

  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string
  ) {}

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`;
  }
}

// Position class
export class Position {
  constructor(public line: number, public character: number) {}

  isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }

  isBeforeOrEqual(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character <= other.character);
  }

  isAfter(other: Position): boolean {
    return !this.isBeforeOrEqual(other);
  }

  isAfterOrEqual(other: Position): boolean {
    return !this.isBefore(other);
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }
}

// Range class
export class Range {
  constructor(
    public start: Position,
    public end: Position
  ) {}

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Range) {
      return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    return positionOrRange.isAfterOrEqual(this.start) && positionOrRange.isBeforeOrEqual(this.end);
  }

  isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }
}

// Other API stubs
export const workspace = {
  getConfiguration: () => ({}),
  onDidChangeConfiguration: new EventEmitter().event,
  workspaceFolders: [],
};

export const window = {
  showErrorMessage: (..._args: any[]) => Promise.resolve(),
  showWarningMessage: (..._args: any[]) => Promise.resolve(),
  showInformationMessage: (..._args: any[]) => Promise.resolve(),
};

export const commands = {
  registerCommand: () => new Disposable(),
  executeCommand: () => Promise.resolve(),
};

export const languages = {
  registerCompletionItemProvider: () => new Disposable(),
  registerHoverProvider: () => new Disposable(),
  registerDefinitionProvider: () => new Disposable(),
};

// CancellationError
export class CancellationError extends Error {
  constructor(message?: string) {
    super(message || 'Cancelled');
    this.name = 'CancellationError';
  }
}

// CancellationToken
export class CancellationTokenSource {
  token = {
    isCancellationRequested: false,
    onCancellationRequested: new EventEmitter().event,
  };

  cancel(): void {
    this.token.isCancellationRequested = true;
  }

  dispose(): void {}
}

// Extensions API
export const extensions = {
  getExtension: () => undefined,
  all: [],
};

// Enums
export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

// Default export for wildcard imports
export default {
  Disposable,
  EventEmitter,
  Uri,
  Position,
  Range,
  workspace,
  window,
  commands,
  languages,
  CancellationError,
  CancellationTokenSource,
  extensions,
  ConfigurationTarget,
  DiagnosticSeverity,
};
