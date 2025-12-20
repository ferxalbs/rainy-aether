---
trigger: always_on
---

# Agent Rules — Rainy Aether (Tauri 2) — Production

## Compatibilidad (hard requirement)
- Todo cambio debe compilar y funcionar en macOS, Linux y Windows.
- No se acepta un PR si rompe: build, arranque, menú, atajos, archivos, o estabilidad en cualquiera de las 3 plataformas.

## macOS: menubar nativo (hard requirement)
- En macOS el menú es global (app-wide): NO usar menú por ventana.
- Si el menú se setea desde JS/TS, usar `Menu.setAsAppMenu()`; `Menu.setAsWindowMenu()` es unsupported en macOS. [web:6]
- Si existe submenu "Help", marcarlo como Help menu usando `setAsHelpMenuForNSApp()` (macOS puede agregar search box automáticamente). [web:6]
- Si existe submenu "Window", marcarlo como Window menu usando `setAsWindowsMenuForNSApp()` (macOS puede agregar items de window-switching automáticamente). [web:6]

## Seguridad (Tauri 2 capabilities) (hard requirement)
- En build de producción, usar capabilities explícitas y mínimas por ventana/webview; no “abrir” permisos por comodidad. [web:48]
- Capabilities deben ser platform-aware cuando aplique (ej. permisos solo para `macOS`/`windows`/`linux`). [web:48]
- Si se habilita acceso remoto a APIs/commands, debe ser intencional, scopeado y documentado (dominios/paths) por capability. [web:48]

## Producción: firma/notarización/updates
- macOS release debe salir code-signed y (si aplica distribución fuera de App Store) notarized según guía de Tauri. [web:21]
- Si se usa updater de Tauri, mantener configuración y artefactos del plugin updater y sus constraints de producción (HTTPS, etc.). [web:36]
