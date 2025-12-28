---
trigger: always_on
---

## Compatibility (hard requirement)
- All changes must compile and work on macOS, Linux, and Windows.
- A PR will not be accepted if it breaks: build, startup, menu, shortcuts, files, or stability on any of the three platforms. So always keep this in mind.

## macOS: native menu bar (hard requirement)
- On macOS, the menu is global (app-wide): DO NOT use a menu per window.
- If the menu is set from JS/TS, use `Menu.setAsAppMenu()`; `Menu.setAsWindowMenu()` is unsupported on macOS. [web:6]
- If there is a “Help” submenu, mark it as a Help menu using `setAsHelpMenuForNSApp()` (macOS can add a search box automatically). [web:6]
- If there is a “Window” submenu, mark it as a Window menu using `setAsWindowsMenuForNSApp()` (macOS may automatically add window-switching items).

## Security (Tauri 2 capabilities) (hard requirement)
- In production builds, use explicit and minimal capabilities per window/webview; do not “open” permissions for convenience.
- Capabilities must be platform-aware when applicable (e.g., permissions only for macOS/windows/linux).
- If remote access to APIs/commands is enabled, it must be intentional, scoped, and documented (domains/paths) by capability.

## Production: signing/notarization/updates
- macOS releases must be code-signed and (if distributing outside the App Store) notarized according to Tauri guidelines.
- If using Tauri updater, maintain the updater plugin configuration and artifacts and their production constraints (HTTPS, etc.). 