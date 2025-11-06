# Extension Development Quick Start

Get started building extensions for Rainy Code in 5 minutes!

## Prerequisites

- Node.js 18+ and pnpm
- Rainy Code IDE
- TypeScript knowledge (recommended)

## Step 1: Generate Extension

```bash
# Install the extension generator (coming soon)
pnpm add -g @rainycode/create-extension

# Generate new extension
pnpx @rainycode/create-extension my-first-extension

cd my-first-extension
pnpm install
```

Or manually:

```bash
mkdir my-first-extension
cd my-first-extension
pnpm init
```

## Step 2: Create Package.json

```json
{
  "name": "my-first-extension",
  "displayName": "My First Extension",
  "description": "My first Rainy Code extension",
  "version": "0.0.1",
  "publisher": "your-name",
  "engines": {
    "rainycode": "^0.1.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onCommand:myExtension.helloWorld"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myExtension.helloWorld",
        "title": "Hello World"
      }
    ]
  },
  "permissions": {
    "capabilities": ["ui:notifications", "commands:register"]
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Step 3: Create Extension Code

`src/extension.ts`:

```typescript
import * as rainycode from 'rainycode';

export function activate(context: rainycode.ExtensionContext) {
  console.log('My extension is now active!');

  const disposable = rainycode.commands.registerCommand(
    'myExtension.helloWorld',
    () => {
      rainycode.window.showInformationMessage('Hello World from My Extension!');
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

## Step 4: Configure TypeScript

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  }
}
```

## Step 5: Compile

```bash
pnpm run compile
```

## Step 6: Test

In Rainy Code:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Load Extension from Folder"
3. Select your extension folder
4. Run "Hello World" command

## Next Steps

### Add More Features

**Status Bar Item:**

```typescript
const statusBarItem = rainycode.window.createStatusBarItem(
  rainycode.StatusBarAlignment.Right,
  100
);
statusBarItem.text = "$(rocket) My Extension";
statusBarItem.show();
context.subscriptions.push(statusBarItem);
```

**Language Support:**

```typescript
const provider = rainycode.languages.registerCompletionItemProvider('javascript', {
  provideCompletionItems(document, position) {
    return [
      new rainycode.CompletionItem('mySnippet', rainycode.CompletionItemKind.Snippet)
    ];
  }
});
context.subscriptions.push(provider);
```

**Diagnostics:**

```typescript
const collection = rainycode.languages.createDiagnosticCollection('myExtension');

const diagnostics = [
  {
    range: new rainycode.Range(0, 0, 0, 10),
    message: 'This is a warning',
    severity: rainycode.DiagnosticSeverity.Warning
  }
];

collection.set(rainycode.Uri.file('/path/to/file.js'), diagnostics);
```

## Publishing

1. Create account on marketplace.rainycode.com
2. Get Personal Access Token
3. Package and publish:

```bash
rainycode package
rainycode publish --pat YOUR_TOKEN
```

## Resources

- [Full Extension API Documentation](./EXTENSION_SYSTEM.md)
- [Extension Samples](https://github.com/rainycode/extension-samples)
- [API Reference](https://docs.rainycode.com/api)
- [Community Forum](https://community.rainycode.com)

## Common Patterns

### Reading Active File

```typescript
const editor = rainycode.window.activeTextEditor;
if (editor) {
  const document = editor.document;
  const text = document.getText();
  console.log('File content:', text);
}
```

### Watching File Changes

```typescript
const watcher = rainycode.workspace.createFileSystemWatcher('**/*.js');

watcher.onDidChange(uri => {
  console.log('File changed:', uri.fsPath);
});

context.subscriptions.push(watcher);
```

### Making HTTP Requests

```typescript
// Requires "network:http" capability
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

### Storing Data

```typescript
// Global state (persists across sessions)
await context.globalState.update('myKey', 'myValue');
const value = context.globalState.get('myKey');

// Workspace state (per-workspace)
await context.workspaceState.update('myKey', 'myValue');

// Secrets (encrypted storage)
await context.secrets.store('apiKey', 'secret-key');
const apiKey = await context.secrets.get('apiKey');
```

## Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"]
    }
  ]
}
```

Press F5 to start debugging!

## Tips

1. **Use activation events** to load extension only when needed
2. **Dispose resources** by adding to `context.subscriptions`
3. **Handle errors** gracefully with try-catch
4. **Test on multiple platforms** (Windows, Mac, Linux)
5. **Document your commands** in package.json
6. **Follow naming conventions**: `publisher.extensionName.commandName`

Happy coding! 🎉
