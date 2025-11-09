# Quick Fix System - Guía de Usuario

**Última actualización:** 2025-11-09
**Fase implementada:** 1-4 del ERROR_SYSTEM_IMPLEMENTATION_PLAN.md

---

## 📋 **Tabla de Contenidos**

1. [¿Qué es el Quick Fix System?](#qué-es-el-quick-fix-system)
2. [Cómo Funciona](#cómo-funciona)
3. [Uso Paso a Paso](#uso-paso-a-paso)
4. [Ejemplos Prácticos](#ejemplos-prácticos)
5. [Tipos de Quick Fixes](#tipos-de-quick-fixes)
6. [Troubleshooting](#troubleshooting)
7. [Configuración](#configuración)

---

## 🎯 **¿Qué es el Quick Fix System?**

El **Quick Fix System** es una funcionalidad que permite **corregir automáticamente** errores, warnings y problemas en tu código con un solo click. Es similar al sistema de VS Code.

### **Características Principales**

- ✅ **Detección automática** de correcciones disponibles
- ✅ **Icono visual (💡)** cuando hay fixes disponibles
- ✅ **Menú contextual** con todas las opciones
- ✅ **Navegación por teclado** (↑↓ Enter Esc)
- ✅ **Corrección con un click**
- ✅ **Integración con Monaco Editor**
- ✅ **Soporte para múltiples lenguajes** (TypeScript, JavaScript, etc.)

---

## 🔧 **Cómo Funciona**

### **Arquitectura**

```
Monaco Editor (TypeScript Service)
         ↓
   Detecta errores/warnings
         ↓
   MarkerService registra los problemas
         ↓
   ProblemsPanel muestra los problemas
         ↓
   CodeActionService verifica si hay Quick Fixes
         ↓
   Icono 💡 aparece si hay fixes disponibles
         ↓
   Click en 💡 → QuickFixMenu se abre
         ↓
   Seleccionar fix → Aplicar automáticamente
```

### **Flujo de Datos**

1. **Monaco** detecta un error (ej: variable no usada)
2. **MarkerService** almacena el error con su posición
3. **ProblemsPanel** muestra el error en la lista
4. **CodeActionService** consulta a Monaco si hay quick fixes
5. Si hay fixes disponibles → **Icono 💡 aparece**
6. Click en 💡 → **QuickFixMenu** se abre
7. Usuario selecciona un fix → **Se aplica automáticamente**

---

## 🚀 **Uso Paso a Paso**

### **Paso 1: Abrir el Panel de Problemas**

El panel de problemas se abre automáticamente cuando hay errores, o puedes abrirlo manualmente:

- **Atajo de teclado:** `Ctrl+Shift+M` (o el configurado)
- **Menu:** View → Problems
- **Click en StatusBar:** Click en el contador de errores (ej: "✖ 5 ⚠ 3")

### **Paso 2: Identificar Problemas con Quick Fixes**

En el ProblemsPanel verás:

```
┌─────────────────────────────────────────────────────────┐
│ Problems                                    5 problems  │
├─────────────────────────────────────────────────────────┤
│ demo.tsx (5)                                            │
│   ✖ Variable 'unusedVariable' is declared but...   💡  │ ← Icono de bombilla
│     typescript  Ln 8, Col 7  Error                      │
└─────────────────────────────────────────────────────────┘
```

**Indicadores visuales:**
- 💡 **Bombilla amarilla** = Hay Quick Fixes disponibles
- Sin bombilla = No hay Quick Fixes disponibles

### **Paso 3: Abrir el Menú de Quick Fixes**

Hay **3 formas** de abrir el menú:

#### **Opción A: Click en la Bombilla 💡**
```
Pasa el mouse sobre el problema → Bombilla aparece → Click
```

#### **Opción B: Navegar con teclado**
```
1. Usa ↑↓ para navegar entre problemas
2. Enter para saltar al código
3. Ctrl+. (en el editor) para abrir Quick Fixes
```

#### **Opción C: Click derecho en el código**
```
Click derecho en la línea con error → "Quick Fix..." (si está disponible)
```

### **Paso 4: Seleccionar y Aplicar un Fix**

El menú muestra todas las correcciones disponibles:

```
┌─────────────────────────────────────────────────────┐
│ 💡 Quick Fixes                                      │
├─────────────────────────────────────────────────────┤
│ ⭐ Remove unused variable               [Preferred] │
│ 💡 Prefix with underscore (_unusedVariable)         │
│ 💡 Add comment to disable rule                      │
│                                                     │
│ Use ↑↓ to navigate • Enter to apply • Esc to close │
└─────────────────────────────────────────────────────┘
```

**Métodos de selección:**
- **Mouse:** Hover sobre una opción → Click
- **Teclado:** ↑↓ para navegar → Enter para aplicar
- **Automático:** El fix marcado como "Preferred" es la recomendación

### **Paso 5: Ver el Resultado**

Después de aplicar el fix:

1. ✅ El código se **actualiza automáticamente**
2. ✅ El **menú se cierra**
3. ✅ El **ProblemsPanel se actualiza** (el error desaparece)
4. ✅ Puedes usar **Ctrl+Z** para deshacer si no te gusta el resultado

---

## 💡 **Ejemplos Prácticos**

### **Ejemplo 1: Variable No Usada**

**Antes:**
```typescript
const unusedVariable = 42; // ✖ Error: Variable declared but never used
```

**Quick Fixes Disponibles:**
1. ⭐ **Remove unused variable** ← Recomendado
2. 💡 Prefix with underscore (`_unusedVariable`)
3. 💡 Add `// eslint-disable-next-line`

**Después (opción 1):**
```typescript
// Variable removida automáticamente
```

---

### **Ejemplo 2: Import Faltante**

**Antes:**
```typescript
function MyComponent() {
  return <div>Hello</div>; // ✖ Error: Cannot find name 'React'
}
```

**Quick Fixes Disponibles:**
1. ⭐ **Import React from 'react'** ← Recomendado
2. 💡 Add `/* @jsxImportSource react */`

**Después (opción 1):**
```typescript
import React from 'react'; // ← Agregado automáticamente

function MyComponent() {
  return <div>Hello</div>; // ✅ Sin errores
}
```

---

### **Ejemplo 3: Typo en Propiedad**

**Antes:**
```typescript
const user = { name: 'John', age: 30 };
console.log(user.nam); // ✖ Error: Property 'nam' does not exist
```

**Quick Fixes Disponibles:**
1. ⭐ **Change spelling to 'name'** ← Recomendado
2. 💡 Add property 'nam' to object

**Después (opción 1):**
```typescript
const user = { name: 'John', age: 30 };
console.log(user.name); // ✅ Corregido
```

---

### **Ejemplo 4: Tipo Incorrecto**

**Antes:**
```typescript
function greet(name: string) {
  return `Hello, ${name}`;
}
greet(123); // ✖ Error: Argument of type 'number' is not assignable
```

**Quick Fixes Disponibles:**
1. ⭐ **Convert to string: greet('123')** ← Recomendado
2. 💡 Change parameter type to `string | number`
3. 💡 Remove type annotation

**Después (opción 1):**
```typescript
function greet(name: string) {
  return `Hello, ${name}`;
}
greet('123'); // ✅ Corregido
```

---

## 🎨 **Tipos de Quick Fixes**

El sistema soporta varios tipos de correcciones:

### **1. Quick Fix (Corrección Rápida)**
- Corrige errores específicos
- Ejemplo: Agregar import, remover variable no usada

### **2. Refactor (Refactorización)**
- Mejora la estructura del código
- Ejemplo: Extraer función, inline variable

### **3. Refactor Extract (Extraer)**
- Extrae código a una nueva función/variable/constante
- Ejemplo: Extract to constant, Extract to function

### **4. Refactor Inline (Inline)**
- Reemplaza referencias con el valor inline
- Ejemplo: Inline variable, Inline function

### **5. Source Action (Acción de Código)**
- Operaciones a nivel de archivo
- Ejemplo: Organize imports, Fix all errors

### **6. Organize Imports**
- Ordena y limpia los imports
- Ejemplo: Alfabetizar, remover duplicados

### **7. Fix All (Corregir Todos)**
- Aplica la misma corrección a múltiples instancias
- Ejemplo: Corregir todos los errores de tipo similar

---

## 🛠️ **Configuración**

### **Settings del Sistema**

Puedes configurar el comportamiento del sistema:

```typescript
// src/stores/settingsStore.ts
interface ProblemsSettings {
  // Mostrar problema actual en status bar
  showCurrentInStatus: boolean;

  // Orden de clasificación en ProblemsPanel
  sortOrder: 'severity' | 'position' | 'name';

  // Auto-scroll al problema actual
  autoReveal: boolean;
}
```

### **Cambiar Configuración**

**Opción 1: Via Settings UI**
```
Settings → Problems → Configure...
```

**Opción 2: Via Código**
```typescript
import { settingsActions } from '@/stores/settingsStore';

// Habilitar indicador de problema actual
settingsActions.updateSetting('problems.showCurrentInStatus', true);

// Cambiar orden a "severidad"
settingsActions.updateSetting('problems.sortOrder', 'severity');

// Habilitar auto-reveal
settingsActions.updateSetting('problems.autoReveal', true);
```

### **Configuraciones por Defecto**

```typescript
const defaultSettings = {
  'problems.showCurrentInStatus': true,  // Mostrar en status bar
  'problems.sortOrder': 'severity',      // Ordenar por severidad
  'problems.autoReveal': true,           // Auto-scroll activado
};
```

---

## 🐛 **Troubleshooting**

### **Problema 1: No aparece la bombilla 💡**

**Causas posibles:**
1. ❌ No hay Quick Fixes disponibles para ese error
2. ❌ Monaco no ha cargado completamente
3. ❌ El archivo no tiene errores reales

**Soluciones:**
```typescript
// 1. Verificar que Monaco esté cargado
console.log('Editor loaded:', !!editorState.view);

// 2. Verificar que hay markers
import { getMarkerService } from '@/services/markerService';
const markers = getMarkerService().read();
console.log('Markers:', markers);

// 3. Verificar Quick Fixes manualmente
import { getCodeActionService } from '@/services/codeActionService';
const service = getCodeActionService();
const result = await service.getCodeActionsForMarker(marker);
console.log('Available actions:', result.actions);
```

---

### **Problema 2: "No quick fixes available"**

**Causas:**
1. ✅ **Mensaje correcto** - No hay correcciones para este error específico
2. ❌ Monaco no ha detectado el error aún

**Verificar:**
```typescript
// Forzar re-análisis del archivo
const editor = editorState.view;
if (editor) {
  const model = editor.getModel();
  if (model) {
    // Trigger validation
    model.setValue(model.getValue());
  }
}
```

---

### **Problema 3: El menú no se abre**

**Causas posibles:**
1. ❌ Click handler no está funcionando
2. ❌ Z-index del menú es bajo
3. ❌ Posición del menú fuera de la pantalla

**Verificar:**
```typescript
// Verificar en consola
console.log('[QuickFixMenu] Opening menu for marker:', marker);
```

**Solución:**
```css
/* Asegurar que el menú esté visible */
.quick-fix-menu {
  z-index: 9999 !important;
  position: fixed !important;
}
```

---

### **Problema 4: El fix no se aplica**

**Causas:**
1. ❌ Edit operation falló
2. ❌ Model es read-only
3. ❌ Comando no existe

**Debug:**
```typescript
// Ver detalles del error
const service = getCodeActionService();
service.applyCodeAction(action).catch((error) => {
  console.error('Failed to apply fix:', error);
});
```

---

## 📊 **Estados del Sistema**

### **Estado 1: Sin Errores**
```
┌─────────────────────────────────────────────────┐
│ Problems                            0 problems  │
├─────────────────────────────────────────────────┤
│ No problems to display                         │
└─────────────────────────────────────────────────┘
```

### **Estado 2: Errores Sin Quick Fixes**
```
┌─────────────────────────────────────────────────┐
│ Problems                            3 problems  │
├─────────────────────────────────────────────────┤
│ ✖ Syntax error: Unexpected token               │
│   typescript  Ln 10, Col 5  Error               │ ← Sin bombilla
└─────────────────────────────────────────────────┘
```

### **Estado 3: Errores Con Quick Fixes**
```
┌─────────────────────────────────────────────────┐
│ Problems                            5 problems  │
├─────────────────────────────────────────────────┤
│ ✖ Variable 'foo' is declared but never used 💡 │ ← Con bombilla
│   typescript  Ln 8, Col 7  Error                │
└─────────────────────────────────────────────────┘
```

### **Estado 4: Menú Abierto**
```
┌─────────────────────────────────────────────────┐
│ 💡 Quick Fixes                      ↑↓ Navigate│
├─────────────────────────────────────────────────┤
│ ⭐ Remove unused variable               [Pref]  │
│ 💡 Prefix with underscore                       │
│ 💡 Add disable comment                          │
└─────────────────────────────────────────────────┘
```

---

## 🎯 **Atajos de Teclado**

### **En ProblemsPanel**

| Tecla | Acción |
|-------|--------|
| **↑ / ↓** | Navegar entre problemas |
| **Enter** | Saltar al código del problema |
| **Esc** | Cerrar panel |
| **Home** | Primer problema |
| **End** | Último problema |

### **En QuickFixMenu**

| Tecla | Acción |
|-------|--------|
| **↑ / ↓** | Navegar entre fixes |
| **Enter** | Aplicar fix seleccionado |
| **Esc** | Cerrar menú |

### **En Editor**

| Tecla | Acción |
|-------|--------|
| **Ctrl+.** | Abrir Quick Fixes en cursor |
| **Ctrl+Shift+M** | Toggle ProblemsPanel |
| **Ctrl+Z** | Deshacer fix aplicado |

---

## 📝 **Archivo de Prueba**

Para probar el sistema, abre el archivo:

```
QUICK_FIX_DEMO.tsx
```

Este archivo contiene **8 ejemplos** de errores con Quick Fixes disponibles:

1. Variable no usada
2. Import faltante
3. Typo en propiedad
4. Tipo incorrecto
5. Semicolon faltante
6. Parámetro no usado
7. Variable no declarada
8. Expresión incompleta

**Instrucciones:**
1. Abre `QUICK_FIX_DEMO.tsx` en el editor
2. Abre el ProblemsPanel (`Ctrl+Shift+M`)
3. Verás las bombillas 💡 en los errores
4. Click en una bombilla
5. Selecciona un fix
6. ¡Ve la magia! ✨

---

## 🚀 **Próximos Pasos**

El sistema está en **Fase 4 de 5** del plan de implementación.

**Funcionalidades pendientes (Fase 5):**
- Badges de actividad en el icono del panel
- Animaciones mejoradas
- Temas completos para Quick Fix menu
- Accesibilidad avanzada

**Ver más en:**
- `docs/errors/ERROR_SYSTEM_IMPLEMENTATION_PLAN.md`
- `docs/errors/ERROR_SYSTEM_OF_VS_CODE.md`

---

¿Necesitas ayuda? Revisa la sección de [Troubleshooting](#troubleshooting) o reporta un issue en el repositorio.
