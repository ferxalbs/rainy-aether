# Integrated Browser Preview

The Rainy Aether IDE includes a native browser preview system for viewing your local development servers directly within the IDE. This feature leverages Tauri 2's WebviewWindow capabilities to provide a true browser experience with full localhost access.

## Overview

Instead of switching between your IDE and an external browser, you can now preview your web applications in a native window that's managed by the IDE. This is particularly useful for:

- **Frontend development** - Preview React, Vue, Next.js, or any web framework
- **API testing** - View API responses in a formatted browser
- **Hot reload workflows** - See changes instantly alongside your code

## Getting Started

### Opening a Preview

1. Open the **Preview** tab in the bottom panel (next to Terminal and Problems)
2. Enter a URL in the address bar (e.g., `http://localhost:3000`)
3. Press **Enter** or click the **+** button
4. A new native browser window will open with your content

### Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Preview Panel | `Cmd+Shift+P` | `Ctrl+Shift+P` |

## Features

### Navigation Controls

The preview panel includes a full navigation toolbar:

| Control | Description |
|---------|-------------|
| **← Back** | Navigate to previous page in history |
| **→ Forward** | Navigate to next page in history |
| **↻ Reload** | Refresh the current page |
| **⌂ Home** | Return to localhost:3000 |

### Connection Status

Each browser instance displays its current connection status:

| Status | Indicator | Description |
|--------|-----------|-------------|
| **Connected** | 🟢 Green | Page loaded successfully |
| **Disconnected** | 🟠 Orange | Server connection lost |
| **Failed** | 🔴 Red | Connection error occurred |
| **Closed** | ⚫ Gray | Browser window was closed |

### Multiple Instances

You can open multiple browser windows simultaneously:

- Each window appears as a card in the preview panel
- Click a card to select it as the active instance
- Use the **×** button on each card to close individual windows
- Status and URL are displayed for each instance

## Architecture

### Native WebviewWindow

The browser preview uses Tauri 2's native `WebviewWindow` instead of iframes. This provides:

- **Full browser capabilities** - JavaScript, cookies, local storage
- **Native performance** - Hardware-accelerated rendering
- **Security isolation** - Each webview runs in its own process
- **Localhost access** - No CORS issues with local development servers

### Cross-Platform Support

The preview automatically uses the appropriate webview engine:

| Platform | Engine |
|----------|--------|
| macOS | WebKit |
| Windows | WebView2 (Chromium) |
| Linux | WebKitGTK |

## Backend API

The browser preview is powered by Tauri commands that can also be invoked programmatically:

### Commands

```typescript
// Open a new browser preview
await invoke('browser_open_preview', { 
  url: 'http://localhost:3000',
  windowId: 'optional-custom-id' 
});

// Navigate to a URL
await invoke('browser_navigate', { 
  windowId: 'browser-id', 
  url: 'http://localhost:3000/about' 
});

// Navigation controls
await invoke('browser_back', { windowId: 'browser-id' });
await invoke('browser_forward', { windowId: 'browser-id' });
await invoke('browser_reload', { windowId: 'browser-id' });

// Close a browser
await invoke('browser_close', { windowId: 'browser-id' });

// Get browser state
const state = await invoke('browser_get_state', { windowId: 'browser-id' });

// List all instances
const instances = await invoke('browser_list_instances');

// Update connection status
await invoke('browser_set_status', { 
  windowId: 'browser-id',
  status: 'connected', // 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'
  errorMessage: null 
});
```

### Events

The browser manager emits events that can be listened to:

```typescript
import { listen } from '@tauri-apps/api/event';

// Browser window opened
listen('browser:opened', (event) => {
  console.log('Browser opened:', event.payload);
});

// Navigation occurred
listen('browser:navigated', (event) => {
  console.log('Navigated to:', event.payload.url);
});

// Browser closed
listen('browser:closed', (event) => {
  console.log('Browser closed:', event.payload); // window ID
});

// Status changed
listen('browser:status_changed', (event) => {
  const { id, status, error_message } = event.payload;
  console.log(`Browser ${id} status: ${status}`);
});
```

## State Management

The browser state is managed through a dedicated store:

```typescript
import { 
  useBrowserState,
  useBrowserInstances,
  useActiveInstance,
  browserActions 
} from '@/stores/browserStore';

// In a React component
function MyComponent() {
  const instances = useBrowserInstances();
  const activeInstance = useActiveInstance();
  
  const handleOpen = () => {
    browserActions.openBrowser('http://localhost:3000');
  };
  
  return (
    <div>
      {instances.map(instance => (
        <div key={instance.id}>
          {instance.url} - {instance.connectionStatus}
        </div>
      ))}
    </div>
  );
}
```

## Troubleshooting

### Preview Window Doesn't Open

1. Ensure your development server is running
2. Check the URL is correct (include `http://` or `https://`)
3. Look for errors in the Terminal panel

### Page Shows Error

- **Connection refused** - Your dev server may not be running on that port
- **CORS errors** - These shouldn't occur with native webviews, but check your server config

### Status Stuck

If the status appears stuck:
1. Close the browser window using the **×** button
2. Open a new preview window

## File Structure

```
src-tauri/src/
└── browser_manager.rs    # Rust backend for browser management

src/
├── stores/
│   └── browserStore.ts   # State management for browser instances
└── components/ide/
    └── PreviewBrowserPanel.tsx  # UI component for browser controls
```
