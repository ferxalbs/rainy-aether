# Debug Guide - Extension Configuration

## Problema Reportado
Las extensiones marcadas como "enabled" no se activan automáticamente al iniciar el IDE.

## Diagnóstico

### 1. Verificar Configuración Actual

Abre la consola del navegador/DevTools y busca estos logs al iniciar:

```
[App] 🔧 Extension Configuration Loaded:
[App]   - Startup Activation Mode: auto  <-- DEBE SER "auto"
[App]   - Loading Strategy: parallel
[App]   - Security Level: unrestricted
[App]   - Verbose Logging: false

[App] 🚀 Should auto-activate extensions: true  <-- DEBE SER "true"

[App] 📦 Found X total extension(s)
[App] ✅ Found Y enabled extension(s):
[App]    - extension-id-1 (Display Name)
[App]    - extension-id-2 (Display Name)
```

### 2. Verificar Modo de Activación

**SI VES**:
```
[App] ⚠️ Extension startup activation mode is set to MANUAL
```

**ENTONCES**: La configuración está en modo manual. Necesitas cambiarla a automático.

**Solución**:
1. Abre Extension Manager
2. Click en el ícono de Settings (⚙️)
3. Click en el botón "Manual" para cambiarlo a "Automatic"
4. Debería mostrar: `[ExtensionConfigStore] Startup activation mode set to: auto`

### 3. Verificar que las Extensiones están Enabled

Busca en los logs:
```
[App] ✅ Found 3 enabled extension(s):
```

Si dice `0 enabled extension(s)`, las extensiones NO están marcadas como enabled en el Extension Manager.

### 4. Verificar que las Extensiones se están Activando

Busca:
```
[App] Auto-activating 3 extension(s) using parallel strategy
[App] Extension activation complete
```

Si NO ves estos mensajes, algo está bloqueando la activación.

### 5. Verificar Filtros de Seguridad

Busca:
```
[App] ⛔ Extension xxx blocked by security settings
```

Si ves esto, la configuración de seguridad está bloqueando extensiones.

## Soluciones

### Solución 1: Configuración en Modo Manual
```typescript
// En la consola del navegador:
import { setStartupActivationMode } from './stores/extensionConfigStore';
await setStartupActivationMode('auto');
```

O manualmente:
1. Extension Manager → Settings (⚙️) → Toggle "Automatic"

### Solución 2: Extensiones no están Enabled
1. Abre Extension Manager
2. Verifica que las extensiones tengan estado "Enabled"
3. Si dicen "Disabled", click en el ícono de Power para activarlas

### Solución 3: Limpiar Configuración Corrupta

Ejecuta en la consola del navegador:
```javascript
// Verificar configuración actual
import { getExtensionConfig } from './stores/extensionConfigStore';
console.log('Config:', getExtensionConfig());

// Resetear a defaults
import { resetExtensionConfig } from './stores/extensionConfigStore';
await resetExtensionConfig();

// Recargar IDE
location.reload();
```

### Solución 4: Verificar Persistencia

Abre DevTools → Application → IndexedDB → rainy-aether-store

Busca las claves:
- `rainy-extension-startup-mode` - debe ser `"auto"`
- `rainy-extension-loading-strategy` - debe ser `"parallel"`
- `rainy-extension-security-level` - debe ser `"unrestricted"`

Si no existen o tienen valores incorrectos, la configuración no se está guardando.

## Logs Esperados (Correcto)

```
[ExtensionConfigStore] Initializing extension configuration...
[ExtensionConfigStore] Extension configuration initialized: { startupActivationMode: 'auto', ... }

[App] 🔧 Extension Configuration Loaded:
[App]   - Startup Activation Mode: auto
[App]   - Loading Strategy: parallel
[App]   - Security Level: unrestricted

[App] 🚀 Should auto-activate extensions: true

[App] 📦 Found 5 total extension(s)
[App] ✅ Found 3 enabled extension(s):
[App]    - pkief.material-icon-theme-5.28.0 (Material Icon Theme)
[App]    - anotherext.id (Another Extension)

[App] Auto-activating 3 extension(s) using parallel strategy
[App] Loading extensions: pkief.material-icon-theme-5.28.0, anotherext.id
[App] Starting extension pkief.material-icon-theme-5.28.0 (1/3)
[App] Extension pkief.material-icon-theme-5.28.0 loaded successfully
[App] Starting extension anotherext.id (2/3)
[App] Extension anotherext.id loaded successfully
[App] ✅ Extension activation complete
```

## Logs de Error (Incorrecto)

```
[App] 🔧 Extension Configuration Loaded:
[App]   - Startup Activation Mode: manual  <-- PROBLEMA: ESTÁ EN MANUAL

[App] 🚀 Should auto-activate extensions: false  <-- PROBLEMA

[App] ⚠️ Extension startup activation mode is set to MANUAL; skipping auto-enable.
[App] ⚠️ Found 3 enabled extension(s) that require manual activation.
```

## Comandos Útiles de Consola

```javascript
// Importar stores
import { getExtensionConfig, setStartupActivationMode } from './stores/extensionConfigStore';
import { extensionManager } from './services/extensionManager';

// Ver configuración actual
console.log('Extension Config:', getExtensionConfig());

// Ver extensiones instaladas
const installed = await extensionManager.getInstalledExtensions();
console.log('Installed:', installed);
console.log('Enabled:', installed.filter(e => e.enabled));

// Cambiar a modo automático
await setStartupActivationMode('auto');
console.log('Changed to auto, reload page');

// Ver en storage
console.log('Storage:', await import('./stores/app-store').then(m => m.loadFromStore('rainy-extension-startup-mode')));
```

## Pasos para Reproducir el Problema

1. Abre IDE fresco
2. Instala 3 extensiones
3. Habilita las 3 extensiones (botón Power → verde)
4. Cierra IDE
5. Abre IDE de nuevo
6. **Resultado Esperado**: Extensiones funcionan inmediatamente
7. **Resultado Actual (BUG)**: Extensiones muestran "Enabled" pero no funcionan hasta toggle manual

## Verificación de la Solución

Después de aplicar la solución:

1. Abre IDE
2. Verifica en consola: `Startup Activation Mode: auto`
3. Verifica en consola: `Should auto-activate extensions: true`
4. Verifica en consola: `Extension activation complete`
5. Verifica que las extensiones funcionan sin toggle manual
6. Cierra y vuelve a abrir IDE
7. Verifica que sigue funcionando

## Preguntas Frecuentes

### P: ¿Por qué está en modo "manual" por defecto?
R: El default está configurado como `'auto'` en [extensionConfigStore.ts](src/stores/extensionConfigStore.ts:33). Si ves `'manual'`, la configuración fue cambiada manualmente o hay un problema de inicialización.

### P: ¿Dónde se guarda la configuración?
R: En Tauri store plugin con claves prefijadas `rainy-extension-*`. Ver [app-store.ts](src/stores/app-store.ts).

### P: ¿Puedo tener diferentes configuraciones por workspace?
R: No actualmente. La configuración es global (Window scope). Workspace scope será agregado en el futuro.

### P: ¿Las extensiones se activan en cada recarga?
R: Sí, si `startupActivationMode === 'auto'`. Con modo `'manual'`, debes activarlas cada sesión.

---

**Si ninguna solución funciona**, incluye estos datos en el issue:

1. Logs completos de la consola desde el inicio
2. Output de `getExtensionConfig()` en consola
3. Output de `extensionManager.getInstalledExtensions()` en consola
4. Screenshot del Extension Manager mostrando las extensiones
5. Versión de Rainy Aether
6. Sistema operativo
