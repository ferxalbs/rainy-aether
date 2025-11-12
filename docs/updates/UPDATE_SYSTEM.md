# Update System Documentation

## Overview

Rainy Code includes a robust automatic update system powered by the Tauri updater plugin. This system provides seamless background checking, downloading, and installation of application updates with minimal user intervention.

## Architecture

The update system is organized in four layers:

### 1. Backend Layer (Rust)

- **Location**: `src-tauri/src/update_manager.rs`
- **Plugin**: `tauri-plugin-updater` v2
- **Responsibilities**:
  - Check for updates from configured endpoints
  - Download update packages
  - Install updates with platform-specific installers
  - Emit progress events to frontend
  - Handle errors and retries

### 2. Service Layer (TypeScript)

- **Location**: `src/services/updateService.ts`
- **Responsibilities**:
  - Initialize update service and event listeners
  - Coordinate update checking and installation
  - Manage automatic update checking intervals
  - Interface with Tauri backend commands
  - Handle application restart after updates

### 3. State Management

- **Location**: `src/stores/updateStore.ts`
- **Pattern**: `useSyncExternalStore` (React 18)
- **State**:
  - `updateInfo`: Available update information
  - `updateProgress`: Current update operation status
  - `lastChecked`: Timestamp of last update check
  - `autoCheckEnabled`: Whether automatic checking is enabled
  - `checkInterval`: Hours between automatic checks
  - `showNotification`: Whether to display update notification

### 4. UI Layer

- **Location**: `src/components/ide/UpdateNotification.tsx`
- **Features**:
  - Non-intrusive notification in top-right corner
  - Version comparison display
  - Release notes viewer
  - Download progress indicator
  - Install/Restart controls
  - Error handling and retry

## Configuration

### Tauri Configuration

The updater is configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://www.enosislabs.com/releases/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

**Configuration Options**:

- `active`: Enable/disable the updater
- `endpoints`: Array of update server URLs with placeholders:
  - `{{target}}`: Platform (e.g., "windows", "darwin", "linux")
  - `{{arch}}`: Architecture (e.g., "x86_64", "aarch64")
  - `{{current_version}}`: Current app version
- `dialog`: Show native dialog for updates (managed by frontend instead)
- `pubkey`: Public key for signature verification (see Security section)
- `windows.installMode`: Installation mode on Windows
  - `passive`: Silent installation (recommended)
  - `basicUi`: Shows minimal UI
  - `full`: Full installer UI

### Update Server Setup

Your update server must provide a JSON manifest at the configured endpoint:

**Endpoint Example**: `https://www.enosislabs.com/releases/windows/x86_64/0.1.0`

**Expected Response**:

```json
{
  "version": "0.2.0",
  "date": "2025-11-04T12:00:00Z",
  "body": "## What's New\n\n- Feature A\n- Bug fix B\n- Improvement C",
  "download_url": "https://www.enosislabs.com/releases//downloads/rainy-code-0.2.0-x64.msi",
  "signature": "BASE64_SIGNATURE_HERE"
}
```

**Fields**:

- `version`: New version number (semantic versioning)
- `date`: Release date (ISO 8601 format)
- `body`: Release notes (Markdown supported)
- `download_url`: Direct download URL for the installer
- `signature`: Cryptographic signature (optional but recommended)

## Usage

### Programmatic API

#### Check for Updates

```typescript
import { checkForUpdates } from '@/services/updateService';

const updateInfo = await checkForUpdates();
if (updateInfo?.available) {
  console.log(`Update available: ${updateInfo.latestVersion}`);
}
```

#### Install Update

```typescript
import { installUpdate } from '@/services/updateService';

const success = await installUpdate();
if (success) {
  console.log('Update installed, restart to apply');
}
```

#### Get App Version

```typescript
import { getAppVersion } from '@/services/updateService';

const version = await getAppVersion();
console.log(`Current version: ${version}`);
```

#### Configure Auto-Check

```typescript
import { startAutoUpdateCheck, stopAutoUpdateCheck } from '@/services/updateService';

// Check every 12 hours
startAutoUpdateCheck(12);

// Stop auto-checking
stopAutoUpdateCheck();
```

#### Restart Application

```typescript
import { restartApp } from '@/services/updateService';

await restartApp();
```

### React Hooks

```typescript
import { useUpdateState, updateActions } from '@/stores/updateStore';

function MyComponent() {
  const updateState = useUpdateState();

  if (updateState.updateInfo?.available) {
    return (
      <div>
        New version available: {updateState.updateInfo.latestVersion}
      </div>
    );
  }

  return null;
}
```

### Update Store Actions

```typescript
import { updateActions } from '@/stores/updateStore';

// Set update info
updateActions.setUpdateInfo({
  available: true,
  currentVersion: '0.1.0',
  latestVersion: '0.2.0',
  // ...
});

// Set progress
updateActions.setUpdateProgress({
  status: 'downloading',
  progress: 45.5,
  message: 'Downloading... 45.5%',
});

// Show/hide notification
updateActions.setShowNotification(true);
updateActions.dismissNotification();

// Configure auto-check
updateActions.setAutoCheckEnabled(true);
updateActions.setCheckInterval(24); // hours

// Check if should auto-check
if (updateActions.shouldAutoCheck()) {
  // Perform check
}
```

## Backend Commands

### `check_for_updates`

**Command**: `invoke('check_for_updates')`

**Returns**: `UpdateInfo`

```typescript
interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
  downloadUrl?: string;
}
```

**Events Emitted**:

- `update-status` with status `"checking"`
- `update-status` with status `"available"` or `"up-to-date"` or `"error"`

### `install_update`

**Command**: `invoke('install_update')`

**Returns**: `void`

**Events Emitted**:

- `update-status` with status `"downloading"` and progress updates
- `update-status` with status `"installing"`
- `update-status` with status `"ready"` or `"error"`

### `get_app_version`

**Command**: `invoke('get_app_version')`

**Returns**: `string` (e.g., `"0.1.0"`)

## Event System

The backend emits `update-status` events throughout the update lifecycle:

```typescript
import { listen } from '@tauri-apps/api/event';

await listen('update-status', (event) => {
  const { status, progress, message } = event.payload;
  console.log(`Status: ${status}, Progress: ${progress}%, Message: ${message}`);
});
```

**Event Payload**:

```typescript
interface UpdateProgress {
  status: 'idle' | 'checking' | 'available' | 'downloading' |
          'installing' | 'ready' | 'up-to-date' | 'error' | 'dev-mode';
  progress?: number; // 0-100
  message?: string;
}
```

**Status Lifecycle**:

1. `checking` → Checking for updates
2. `available` → Update found
3. `downloading` → Download in progress (with progress %)
4. `installing` → Installing update
5. `ready` → Update installed, restart required
6. `up-to-date` → No update available
7. `error` → Error occurred
8. `dev-mode` → Development mode (updater disabled)

## Update Workflow

### Automatic Update Flow

1. **Initialization** (IDE.tsx `useEffect`):

   ```typescript
   await initializeUpdateService();
   startAutoUpdateCheck(24); // Check every 24 hours
   ```

2. **Background Checking**:
   - Service checks if `shouldAutoCheck()` returns true
   - Performs update check via `check_for_updates` command
   - Stores result in `updateStore`

3. **Update Available**:
   - `UpdateNotification` component displays
   - User sees current vs. latest version
   - Optional release notes display

4. **User Action**:
   - **Install Now**: Downloads and installs update
   - **Later**: Dismisses notification
   - **Restart Now**: Applies installed update

5. **Installation**:
   - Progress bar shows download progress
   - Backend handles platform-specific installation
   - On success, prompts user to restart

6. **Restart**:
   - User clicks "Restart Now"
   - App restarts with new version

### Manual Update Flow

Users can manually check for updates via:

```typescript
import { checkForUpdates } from '@/services/updateService';

// Manual check
await checkForUpdates();
```

This can be triggered from:

- Menu bar → Help → Check for Updates
- Settings page
- Command palette

## Development Mode

In development mode (`debug_assertions` enabled):

- Update checking returns mock data
- Installation is disabled
- Status shows `"dev-mode"`
- No network requests made

This prevents accidental updates during development.

## Security

### Signature Verification

**Generating Keys**:

```bash
# Install Tauri CLI
cargo install tauri-cli

# Generate keypair
tauri signer generate -w ~/.tauri/myapp.key
```

This creates:

- **Private key**: `~/.tauri/myapp.key` (keep secret!)
- **Public key**: Printed to console

**Configure Public Key**:

Add the public key to `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo="
    }
  }
}
```

**Signing Releases**:

```bash
# Sign the installer
tauri signer sign ~/.tauri/myapp.key /path/to/rainy-code-0.2.0-x64.msi
```

This generates a `.sig` file alongside the installer. Your update server must:

1. Read the `.sig` file
2. Include the signature in the JSON manifest

**Manifest with Signature**:

```json
{
  "version": "0.2.0",
  "download_url": "https://releases.rainycode.com/downloads/rainy-code-0.2.0-x64.msi",
  "signature": "SIGNATURE_FROM_SIG_FILE"
}
```

Tauri automatically verifies the signature during download.

### HTTPS Requirement

Update endpoints **must** use HTTPS to prevent man-in-the-middle attacks. HTTP endpoints will be rejected.

### Endpoint Validation

The updater validates:

- TLS certificate validity
- Signature authenticity (if configured)
- Version number format
- Download integrity

## Platform-Specific Notes

### Windows

- **Installer Types**: MSI, NSIS, or WiX
- **Install Mode**: `passive` (silent) recommended for best UX
- **Permissions**: May require admin elevation for system-wide installs
- **Restart**: Application automatically restarts after install

### macOS

- **Installer Types**: DMG, PKG, or App Bundle
- **Code Signing**: Required for macOS 10.15+ (notarization)
- **Gatekeeper**: Unsigned apps will be blocked
- **Restart**: Manual restart required

### Linux

- **Installer Types**: AppImage, DEB, RPM
- **Permissions**: No sudo required for AppImage
- **Auto-update**: AppImage supports seamless updates
- **Restart**: Manual restart required

## Error Handling

### Common Errors

**Network Errors**:

```typescript
{
  status: 'error',
  message: 'Failed to check for updates: Network error'
}
```

**Signature Verification Failed**:

```typescript
{
  status: 'error',
  message: 'Failed to install update: Signature verification failed'
}
```

**Insufficient Permissions**:

```typescript
{
  status: 'error',
  message: 'Failed to install update: Insufficient permissions'
}
```

### Retry Logic

Users can retry failed operations via the UI:

```typescript
// In UpdateNotification.tsx
{hasError && (
  <button onClick={handleCheckAgain}>
    Try Again
  </button>
)}
```

## Testing

### Local Testing

1. **Build a Release**:

   ```bash
   pnpm tauri build
   ```

2. **Set Up Local Update Server**:

   ```bash
   # Create mock manifest
   cat > update-manifest.json <<EOF
   {
     "version": "0.2.0",
     "date": "2025-11-04T12:00:00Z",
     "body": "Test update",
     "download_url": "http://localhost:8080/installer.msi"
   }
   EOF

   # Serve files
   python -m http.server 8080
   ```

3. **Update Configuration** (temporarily):

   ```json
   {
     "plugins": {
       "updater": {
         "endpoints": ["http://localhost:8080/update-manifest.json"]
       }
     }
   }
   ```

4. **Test Update Flow**:
   - Launch app
   - Trigger manual check
   - Verify download and install

### CI/CD Integration

**GitHub Actions Example**:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
        with:
          tagName: v__VERSION__
          releaseName: 'Rainy Code v__VERSION__'
          releaseBody: 'See CHANGELOG.md for details'
          releaseDraft: true
          prerelease: false
```

## Best Practices

1. **Version Numbering**: Use semantic versioning (MAJOR.MINOR.PATCH)
2. **Release Notes**: Provide clear, user-friendly release notes
3. **Signature Verification**: Always sign production releases
4. **Staged Rollout**: Consider rolling out updates gradually
5. **Testing**: Test updates on all platforms before release
6. **Backup**: Encourage users to backup before major updates
7. **Changelog**: Maintain a changelog for transparency
8. **Auto-Check Interval**: Default to 24 hours, allow user configuration
9. **User Control**: Always allow users to skip updates
10. **Error Recovery**: Provide clear error messages and retry options

## Troubleshooting

### Updates Not Checking

- Verify network connectivity
- Check endpoint URL is correct
- Ensure HTTPS is used
- Verify server is returning valid JSON

### Installation Fails

- Check user has required permissions
- Verify installer file integrity
- Ensure signature is valid
- Check disk space

### Application Won't Restart

- Try manual restart
- Check for processes blocking restart
- Verify new version installed correctly

### Debug Logging

Enable verbose logging:

```rust
// In update_manager.rs
println!("Update check result: {:?}", update_response);
```

## Future Enhancements

Planned improvements to the update system:

- [ ] Differential updates (download only changes)
- [ ] Rollback mechanism for failed updates
- [ ] Update channels (stable, beta, nightly)
- [ ] Bandwidth throttling for large downloads
- [ ] Background downloads (download while app is open)
- [ ] Update scheduling (install at specific times)
- [ ] Statistics and telemetry
- [ ] Multi-language support for notifications
- [ ] Custom update UI themes
- [ ] Integration with in-app changelog viewer

## References

- [Tauri Updater Plugin](https://v2.tauri.app/plugin/updater/)
- [Tauri Signing Guide](https://v2.tauri.app/distribute/sign/)
- [Semantic Versioning](https://semver.org/)
- [Update Server Best Practices](https://github.com/tauri-apps/tauri/wiki/Updater-Best-Practices)

## Support

For issues related to the update system:

1. Check this documentation
2. Review error messages in the notification
3. Check browser console for detailed logs
4. Open an issue on GitHub with:
   - Current version
   - Platform and architecture
   - Error message
   - Steps to reproduce
