# Chatbot Extension API Guide

**Version:** 1.0.0
**Last Updated:** November 17, 2025

Complete guide for building chatbot extensions with webview support and live diff previews for Rainy Aether.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Extension Structure](#extension-structure)
- [Webview API](#webview-api)
- [Editor API](#editor-api)
- [Workspace API](#workspace-api)
- [Diff Preview API (Killer Feature!)](#diff-preview-api-killer-feature)
- [Complete Example](#complete-example)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Chatbot Extension API allows you to build powerful AI assistant extensions with:

- **Sidebar webview panels** - Custom UI in React/HTML
- **Code manipulation** - Insert, edit, and navigate code
- **File system access** - Read/write workspace files
- **Live diff previews** - Show code changes in real-time (THE KILLER FEATURE!)
- **VS Code compatibility** - Similar API to VS Code extensions

---

## Quick Start

### 1. Create Extension Manifest

Create `package.json`:

```json
{
  "name": "my-chatbot",
  "displayName": "My AI Chatbot",
  "description": "An AI-powered coding assistant",
  "version": "1.0.0",
  "publisher": "your-name",
  "engines": {
    "rainyaether": "^0.1.0"
  },
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "my-chatbot-view",
          "title": "AI Assistant",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "my-chatbot-view": [
        {
          "id": "chatbot-panel",
          "name": "Chat",
          "type": "webview"
        }
      ]
    }
  },
  "activationEvents": [
    "onView:chatbot-panel"
  ]
}
```

### 2. Create Extension Entry Point

Create `src/extension.ts`:

```typescript
import * as vscode from './vscode-api'; // Your VS Code API shim

export function activate(context: vscode.ExtensionContext) {
  // Register webview provider
  const provider = new ChatbotViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('chatbot-panel', provider)
  );
}

export function deactivate() {
  // Cleanup
}
```

### 3. Create Webview Provider

```typescript
class ChatbotViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
    };

    // Set HTML content
    webviewView.webview.html = this.getHtmlContent();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'chat':
          await this.handleChat(message.text, webviewView.webview);
          break;
      }
    });
  }

  private async handleChat(text: string, webview: vscode.Webview) {
    // Get AI response
    const response = await this.getAIResponse(text);

    // Send response back to webview
    webview.postMessage({
      command: 'response',
      text: response,
    });
  }

  private getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Chatbot</title>
        <style>
          body {
            padding: 10px;
            font-family: var(--font-family);
          }
          .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
          }
          .messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
          }
          .message {
            margin: 8px 0;
            padding: 8px;
            border-radius: 4px;
          }
          .user-message {
            background: var(--vscode-input-background);
          }
          .ai-message {
            background: var(--vscode-editor-background);
          }
          .input-container {
            display: flex;
            gap: 8px;
          }
          input {
            flex: 1;
            padding: 8px;
          }
          button {
            padding: 8px 16px;
          }
        </style>
      </head>
      <body>
        <div class="chat-container">
          <div class="messages" id="messages"></div>
          <div class="input-container">
            <input type="text" id="input" placeholder="Ask me anything...">
            <button onclick="sendMessage()">Send</button>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function sendMessage() {
            const input = document.getElementById('input');
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';

            vscode.postMessage({
              command: 'chat',
              text: text
            });
          }

          function addMessage(text, type) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + (type === 'user' ? 'user-message' : 'ai-message');
            div.textContent = text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
          }

          // Handle messages from extension
          window.addEventListener('message', (event) => {
            const message = event.detail || event.data;
            if (message.command === 'response') {
              addMessage(message.text, 'ai');
            }
          });

          // Handle Enter key
          document.getElementById('input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private async getAIResponse(text: string): Promise<string> {
    // Call your AI service here
    return `You said: ${text}`;
  }
}
```

---

## Webview API

### Register Webview View Provider

```typescript
vscode.window.registerWebviewViewProvider(
  viewId: string,
  provider: WebviewViewProvider,
  options?: {
    webviewOptions?: {
      retainContextWhenHidden?: boolean;
    };
  }
): Disposable
```

### WebviewView Interface

```typescript
interface WebviewView {
  readonly webview: Webview;
  readonly viewType: string;
  title?: string;
  description?: string;
  visible: boolean;

  show(preserveFocus?: boolean): void;
  dispose(): void;
}
```

### Webview Interface

```typescript
interface Webview {
  html: string;
  options: WebviewOptions;

  postMessage(message: any): Promise<boolean>;
  onDidReceiveMessage(handler: (message: any) => void): Disposable;
}
```

---

## Editor API

### Get Active Content

```typescript
// Get current file content
const content = vscode.editor.getActiveTextEditorContent();

// Get selection
const selection = vscode.editor.getActiveSelection();
// Returns: { start: { line, character }, end: { line, character } }
```

### Insert/Replace Code

```typescript
// Insert at cursor
vscode.editor.insertText('const foo = "bar";');

// Replace range
vscode.editor.replaceRange(
  { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
  'new text'
);

// Replace all content
vscode.editor.replaceAllContent('new file content');
```

### Navigation

```typescript
// Get cursor position
const position = vscode.editor.getCursorPosition();

// Set cursor position
vscode.editor.setCursorPosition({ line: 10, character: 5 });

// Open file
await vscode.window.showTextDocument('/path/to/file.ts', {
  selection: { start: { line: 10, character: 0 }, end: { line: 10, character: 0 } },
  preserveFocus: false,
});
```

---

## Workspace API

### File Operations

```typescript
// Read file
const content = await vscode.workspace.readFile('/path/to/file.ts');
const text = new TextDecoder().decode(content);

// Write file
const newContent = new TextEncoder().encode('new content');
await vscode.workspace.writeFile('/path/to/file.ts', newContent);

// Create directory
await vscode.workspace.createDirectory('/path/to/new-dir');

// Delete file
await vscode.workspace.deleteFile('/path/to/file.ts');

// Get workspace folder
const workspaceFolder = vscode.workspace.getWorkspaceFolder();
```

---

## Diff Preview API (Killer Feature!)

### Show Simple Diff

```typescript
// Show a diff for a single file
const diffSetId = vscode.editor.showDiff({
  uri: '/path/to/file.ts',
  originalContent: currentFileContent,
  modifiedContent: aiGeneratedContent,
  title: 'AI Code Suggestion',
  description: 'Refactored for better performance',
  viewMode: 'split', // or 'inline'
});
```

### Show Streaming Diff (THE KILLER FEATURE!)

```typescript
// Show diff with real-time updates as AI generates code
const stream = vscode.editor.showStreamingDiff({
  uri: '/path/to/file.ts',
  originalContent: currentFileContent,
  title: 'AI is writing code...',
  onChunk: (chunk) => {
    console.log('Received chunk:', chunk);
  },
  onComplete: (finalContent) => {
    console.log('Streaming complete!');
  },
  onError: (error) => {
    console.error('Streaming error:', error);
  },
});

// Update the diff as AI generates code
let accumulatedContent = '';

// Simulate streaming AI response
async function streamAIResponse() {
  const chunks = [
    'import { useState } from "react";\n\n',
    'export function MyComponent() {\n',
    '  const [count, setCount] = useState(0);\n\n',
    '  return (\n',
    '    <div>\n',
    '      <p>Count: {count}</p>\n',
    '      <button onClick={() => setCount(c => c + 1)}>Increment</button>\n',
    '    </div>\n',
    '  );\n',
    '}\n',
  ];

  for (const chunk of chunks) {
    accumulatedContent += chunk;
    stream.update(accumulatedContent);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
  }

  stream.complete(accumulatedContent);
}

streamAIResponse();
```

### Show Multiple File Diffs

```typescript
// Show diffs for multiple files at once
const diffSetId = vscode.editor.showDiffSet(
  [
    {
      uri: '/path/to/App.tsx',
      originalContent: currentAppContent,
      modifiedContent: newAppContent,
      description: 'Updated main component',
    },
    {
      uri: '/path/to/utils.ts',
      originalContent: currentUtilsContent,
      modifiedContent: newUtilsContent,
      description: 'Added helper functions',
    },
    {
      uri: '/path/to/types.ts',
      originalContent: currentTypesContent,
      modifiedContent: newTypesContent,
      description: 'Updated type definitions',
    },
  ],
  'Multi-file Refactoring'
);
```

### Accept/Reject Diffs

```typescript
// Accept a specific file diff
await vscode.editor.acceptDiff(diffSetId, '/path/to/file.ts');

// Reject a specific file diff
vscode.editor.rejectDiff(diffSetId, '/path/to/file.ts');

// Accept all diffs
await vscode.editor.acceptDiff(diffSetId);

// Reject all diffs
vscode.editor.rejectDiff(diffSetId);

// Close diff preview
vscode.editor.closeDiff(diffSetId);
```

---

## Complete Example

Here's a complete example of a chatbot extension that generates code with live diff preview:

```typescript
class ChatbotViewProvider implements vscode.WebviewViewProvider {
  async resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtmlContent();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'generate-code':
          await this.generateCodeWithDiff(message.prompt, webviewView.webview);
          break;
      }
    });
  }

  private async generateCodeWithDiff(prompt: string, webview: vscode.Webview) {
    // Get current file
    const currentContent = vscode.editor.getActiveTextEditorContent();
    if (!currentContent) {
      vscode.window.showErrorMessage('No file is currently open');
      return;
    }

    // Get file path (you'd need to track this)
    const filePath = '/path/to/current/file.ts';

    // Create streaming diff
    const stream = vscode.editor.showStreamingDiff({
      uri: filePath,
      originalContent: currentContent,
      title: `AI: ${prompt}`,
      description: 'Generating code...',
      onComplete: () => {
        webview.postMessage({
          command: 'generation-complete',
        });
      },
      onError: (error) => {
        webview.postMessage({
          command: 'generation-error',
          error: error.message,
        });
      },
    });

    // Notify webview that generation started
    webview.postMessage({
      command: 'generation-started',
    });

    try {
      // Call your AI service (streaming)
      let accumulatedCode = '';

      await this.streamAIGeneration(prompt, currentContent, (chunk) => {
        accumulatedCode += chunk;
        stream.update(accumulatedCode);
      });

      stream.complete(accumulatedCode);
    } catch (error) {
      stream.error(error as Error);
    }
  }

  private async streamAIGeneration(
    prompt: string,
    context: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    // Call your AI API here (e.g., OpenAI, Anthropic, etc.)
    // This is a mock implementation
    const response = await fetch('https://api.your-ai-service.com/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_API_KEY',
      },
      body: JSON.stringify({
        prompt,
        context,
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    /* Your styles */
  </style>
</head>
<body>
  <div class="chat-container">
    <h2>AI Code Generator</h2>
    <input type="text" id="prompt" placeholder="Describe what you want to build...">
    <button onclick="generateCode()">Generate Code</button>
    <div id="status"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function generateCode() {
      const prompt = document.getElementById('prompt').value;
      if (!prompt) return;

      document.getElementById('status').textContent = 'Generating...';

      vscode.postMessage({
        command: 'generate-code',
        prompt: prompt,
      });
    }

    window.addEventListener('message', (event) => {
      const message = event.detail || event.data;
      const status = document.getElementById('status');

      switch (message.command) {
        case 'generation-started':
          status.textContent = 'AI is writing code... Check the diff panel!';
          break;
        case 'generation-complete':
          status.textContent = 'Done! Review the changes in the diff panel.';
          break;
        case 'generation-error':
          status.textContent = 'Error: ' + message.error;
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}
```

---

## Best Practices

### 1. Always Show Diffs for Code Changes

```typescript
// ❌ BAD - Directly modify code without showing diff
await vscode.workspace.writeFile(uri, newContent);

// ✅ GOOD - Show diff first, let user accept/reject
const diffId = vscode.editor.showDiff({
  uri,
  originalContent,
  modifiedContent: newContent,
});
```

### 2. Use Streaming for Long Operations

```typescript
// ✅ GOOD - User sees progress in real-time
const stream = vscode.editor.showStreamingDiff({
  uri: filePath,
  originalContent,
  onChunk: (chunk) => {
    // Update UI to show progress
  },
});

// Stream AI response
await streamAIResponse(stream);
```

### 3. Handle Errors Gracefully

```typescript
try {
  await vscode.workspace.writeFile(uri, content);
} catch (error) {
  vscode.window.showErrorMessage(
    `Failed to write file: ${error.message}`
  );
}
```

### 4. Clean Up Resources

```typescript
export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatbotViewProvider();

  // Register disposables
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('my-view', provider)
  );
}
```

---

## Troubleshooting

### Webview Not Showing

1. Check that `viewId` in manifest matches registration
2. Verify `activationEvents` includes `onView:your-view-id`
3. Check console for errors

### Diff Preview Not Opening

1. Ensure `originalContent` and `modifiedContent` are different
2. Check that file URI is valid
3. Verify diff store is initialized

### Messages Not Received

1. Use `acquireVsCodeApi()` in webview
2. Check message structure matches expected format
3. Verify `enableScripts: true` in webview options

---

## Resources

- **API Reference**: See `src/services/extension/chatbotAPI.ts`
- **Example Extensions**: See `examples/chatbot-extension/`
- **VS Code Extension Guides**: https://code.visualstudio.com/api

---

**Built with ❤️ by Enosis Labs, Inc.**
