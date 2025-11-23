# Testing JSX Fix - Instrucciones

## ⚠️ IMPORTANTE: Debes Reiniciar la Aplicación

Las definiciones JSX se cargan cuando Monaco se inicializa. **Debes reiniciar completamente** para que los cambios surtan efecto.

## Pasos para Probar el Fix

### 1. Cerrar la Aplicación Actual

```bash
# Ctrl+C en la terminal donde corre pnpm tauri dev
# O cerrar la ventana de la app
```

### 2. Limpiar Procesos (Opcional pero Recomendado)

```bash
# Windows
taskkill /F /IM "rainy-aether.exe" 2>nul
taskkill /F /IM "node.exe" 2>nul

# Esperar 2 segundos
```

### 3. Iniciar Nuevamente

```bash
pnpm tauri dev
```

### 4. Esperar a que Monaco se Inicialice

En la consola del navegador (F12) deberías ver:

```
[Monaco] Extra library definitions added (Node.js, React, Tauri, Utilities)
```

Este mensaje confirma que las definiciones JSX se cargaron.

### 5. Probar JSX en un Archivo

Abre cualquier archivo `.tsx` o crea uno nuevo con este contenido:

```tsx
export function TestComponent() {
  return (
    <div className="container">
      <h3>
        <Link href={`/blog/${post.id}`} className="hover:underline">
          {post.title}
        </Link>
      </h3>
      <p>{post.excerpt}</p>
    </div>
  );
}
```

### 6. Verificar que NO HAY Errores

✅ **DEBE FUNCIONAR:**
- `<div>` - Sin error "JSX element implicitly has type 'any'"
- `className="..."` - Con IntelliSense
- `<Link>` - Reconocido como componente
- `<h3>`, `<p>` - Todos los elementos HTML

❌ **SI PERSISTE EL ERROR:**
1. Verificar en consola: `[Monaco] Extra library definitions added`
2. Si no aparece el mensaje, hay un problema en `monacoConfig.ts`
3. Cerrar y abrir el archivo nuevamente
4. Reiniciar completamente la app

## Debugging

### Ver si las Definiciones se Cargaron

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Verificar que TypeScript defaults existen
console.log(monaco.languages.typescript.typescriptDefaults);

// Ver libs cargadas (deberías ver react, node, etc.)
console.log(monaco.languages.typescript.typescriptDefaults.getExtraLibs());
```

Deberías ver algo como:

```javascript
{
  "file:///node_modules/@types/node/index.d.ts": {...},
  "file:///node_modules/@types/react/index.d.ts": {...},  // <-- IMPORTANTE
  "file:///node_modules/@tauri-apps/api/index.d.ts": {...},
  ...
}
```

### Si las Definiciones NO Están

1. **Verificar monacoConfig.ts se ejecuta:**
   ```typescript
   // En monacoConfig.ts línea ~103
   addMonacoExtraLibs(); // <-- Debe llamarse
   ```

2. **Verificar orden de inicialización:**
   - `monacoConfig.ts` debe ejecutarse ANTES de abrir archivos
   - Ver en `MonacoEditor.tsx` línea ~182

3. **Verificar errores en consola:**
   - Buscar: `[Monaco] Failed to add extra libs`
   - Si hay errores, revisar la sintaxis en `reactTypes`

## Errores Comunes

### Error: "Cannot read property 'typescriptDefaults' of undefined"

**Causa:** Monaco no está importado correctamente

**Solución:**
```typescript
import * as monaco from 'monaco-editor';
```

### Error: Las definiciones se cargan pero JSX sigue con error

**Causa:** Monaco no re-valida archivos abiertos

**Solución:**
1. Cerrar el archivo con error
2. Volver a abrirlo
3. O reiniciar la app

### Warning: "typescript is deprecated"

**Esto es NORMAL:**
- Es solo un warning, no un error
- `monaco.languages.typescript` está deprecado pero funcional
- No afecta la funcionalidad

## Resultados Esperados

### ✅ Funcionando Correctamente

```tsx
// Sin errores, con IntelliSense:
<div className="test">          {/* ✓ */}
  <button onClick={() => {}}>   {/* ✓ */}
    Click me
  </button>
</div>
```

### ❌ Todavía con Problemas

```tsx
// Con error "JSX element implicitly has type 'any'":
<div className="test">          {/* ✗ Error 7026 */}
  ...
</div>
```

Si ves el error, las definiciones **NO** se cargaron. Sigue los pasos de debugging.

## Código de Test Completo

Usa este archivo para probar:

```tsx
// TestJSX.tsx
import React from 'react';

interface Props {
  title: string;
  items: string[];
}

export function TestJSX({ title, items }: Props) {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="p-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => setSelected(item)}
          >
            {item}
            {selected === item && (
              <span className="ml-2 text-green-500">✓</span>
            )}
          </li>
        ))}
      </ul>

      {selected && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          Selected: <strong>{selected}</strong>
        </div>
      )}
    </div>
  );
}
```

**Todos los elementos deberían funcionar sin errores:**
- `<div>`, `<h1>`, `<ul>`, `<li>`, `<span>` ✓
- `className` con IntelliSense ✓
- `onClick`, event handlers ✓
- Nesting correcto ✓

---

## Estado Final Esperado

✅ Sin errores JSX
✅ IntelliSense para className, onClick, etc.
✅ Validación de tipos correcta
✅ Autocomplete de elementos HTML/SVG
✅ Mensaje en consola: `[Monaco] Extra library definitions added`

Si todo funciona, el fix está completo! 🎉
