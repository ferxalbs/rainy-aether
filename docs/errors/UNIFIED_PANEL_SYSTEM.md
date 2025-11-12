# Sistema de Panel Unificado - Implementación Final

## 🎯 El Problema

El sistema anterior tenía tabs separados que se abrían/cerraban independientemente:
- Terminal se abría/cerraba con `Ctrl+` `
- Problems se abría/cerraba con `Ctrl+Shift+M`
- Ambos competían por el mismo espacio

**Esto NO es como funciona en VS Code, Cursor, y otros IDEs profesionales.**

---

## ✅ La Solución: Panel Unificado

En VS Code y otros IDEs, el panel inferior es **UN SOLO PANEL** que contiene múltiples tabs:
- Terminal
- Problems
- Output
- Debug Console

**Nuestro sistema ahora funciona igual:**
- Un solo panel inferior
- Dos tabs siempre disponibles: Terminal y Problems
- Los shortcuts ACTIVAN el tab correspondiente, no abren/cierran paneles separados

---

## 🔧 Implementación

### 1. Estado Simplificado

**ANTES - Dos estados separados:**
```typescript
const [isProblemsPanelOpen, setIsProblemsPanelOpen] = useState(false);
// + terminalVisible desde terminalStore
```

**AHORA - Un solo panel unificado:**
```typescript
const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true); // Panel siempre disponible
const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'problems'>('terminal');
```

### 2. Shortcuts Actualizados

**ANTES - Toggle on/off:**
```typescript
// Ctrl+Shift+MTogglaba el panel de Problems
setIsProblemsPanelOpen((prev) => !prev);

// Ctrl+` Togglaba el terminal
terminalActions.toggle();
```

**AHORA - Activa el tab correspondiente:**
```typescript
// Ctrl+Shift+M → Abre panel y activa tab Problems
if (ctrl && shift && key === "m") {
  event.preventDefault();
  setIsBottomPanelOpen(true);
  setActiveBottomTab('problems');
  return;
}

// Ctrl+` → Abre panel y activa tab Terminal
attachListener("shortcut/toggle-terminal", () => {
  setIsBottomPanelOpen(true);
  setActiveBottomTab('terminal');
});
```

### 3. UI con Tabs Controlados

**Tabs siempre visibles (no condicionales):**
```typescript
<Tabs
  value={activeBottomTab}
  onValueChange={(value) => setActiveBottomTab(value as 'terminal' | 'problems')}
  className="h-full flex flex-col gap-0"
>
  <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 p-0 h-8">
    {/* AMBOS tabs SIEMPRE renderizados */}
    <TabsTrigger value="terminal">
      Terminal
    </TabsTrigger>
    <TabsTrigger value="problems">
      Problems
    </TabsTrigger>
  </TabsList>

  {/* Contenido SIEMPRE montado */}
  <TabsContent value="terminal" className="flex-1 m-0 h-full">
    <TerminalPanel />
  </TabsContent>

  <TabsContent value="problems" className="flex-1 m-0 h-full">
    <ProblemsPanel onClose={() => setIsBottomPanelOpen(false)} />
  </TabsContent>
</Tabs>
```

---

## 📊 Comparación: Antes vs Ahora

### Sistema Anterior (Separado)

| Acción | Resultado |
|--------|-----------|
| `Ctrl+` ` | Toggle Terminal panel (abre/cierra) |
| `Ctrl+Shift+M` | Toggle Problems panel (abre/cierra) |
| Terminal visible | Problems NO disponible (conflicto) |
| Problems visible | Terminal NO disponible (conflicto) |
| Estado | Dos estados separados, confuso |

**Problema:** Paneles competían por espacio, usuario confundido sobre cuál estaba abierto.

### Sistema Actual (Unificado)

| Acción | Resultado |
|--------|-----------|
| `Ctrl+` ` | Abre panel + activa tab Terminal |
| `Ctrl+Shift+M` | Abre panel + activa tab Problems |
| Panel visible | Ambos tabs SIEMPRE disponibles |
| Click en tab | Cambia de contenido instantáneamente |
| Estado | Un solo estado, claro y simple |

**Ventaja:** Como VS Code - un panel, múltiples tabs, siempre accesible.

---

## 🎨 Experiencia de Usuario

### Flujo 1: Usuario presiona Ctrl+`

```
1. Panel se abre (si estaba cerrado)
2. Tab "Terminal" se activa automáticamente
3. Usuario ve el terminal
4. Tab "Problems" SIGUE VISIBLE en la barra de tabs
5. Click en "Problems" → Cambia instantáneamente
```

### Flujo 2: Usuario presiona Ctrl+Shift+M

```
1. Panel se abre (si estaba cerrado)
2. Tab "Problems" se activa automáticamente
3. Usuario ve la lista de problemas
4. Tab "Terminal" SIGUE VISIBLE en la barra de tabs
5. Click en "Terminal" → Cambia instantáneamente
```

### Flujo 3: Usuario trabaja con ambos

```
1. Ctrl+` → Terminal visible
2. Ejecuta comando: npm run build
3. Click en tab "Problems" → Ve errores de compilación
4. Click en tab "Terminal" → Vuelve a ver output del build
5. Repite cuantas veces quiera, sin abrir/cerrar nada
```

---

## 🔑 Beneficios del Sistema Unificado

### 1. Consistencia con IDEs Profesionales

✅ **VS Code:** Panel inferior con Terminal, Problems, Output, Debug Console
✅ **Cursor:** Mismo sistema
✅ **WebStorm:** Mismo sistema
✅ **Rainy Aether:** Ahora igual!

### 2. Flujo de Trabajo Natural

**Escenario común:**
```
Usuario está debuggeando:
1. Ve error en código
2. Ctrl+Shift+M → Revisa lista de problemas
3. Click en problema → Salta al código
4. Intenta fix
5. Ctrl+` → Ejecuta test en terminal
6. Click en "Problems" → Verifica que error desapareció
7. Todo sin abrir/cerrar paneles constantemente
```

### 3. Siempre Disponible

- ❌ **Antes:** "¿Dónde está el panel de Problems?" → Tenía que recordar cerrarlo primero
- ✅ **Ahora:** Ambos tabs siempre visibles → Un click y cambias

### 4. Estado Mental Claro

- ❌ **Antes:** "¿Tengo el terminal abierto? ¿O el Problems? ¿Por qué no veo ninguno?"
- ✅ **Ahora:** "El panel está abierto, veo ambos tabs, sé exactamente dónde estoy"

### 5. Menos Shortcuts para Recordar

- ❌ **Antes:** Ctrl+` para terminal, Ctrl+Shift+M para problems, luego cerrar cada uno...
- ✅ **Ahora:** Presiona el shortcut del tab que quieres ver, eso es todo

---

## 🛠️ Detalles Técnicos

### Control de Tabs

```typescript
// Tabs controlados (value + onValueChange)
<Tabs
  value={activeBottomTab}
  onValueChange={(value) => setActiveBottomTab(value as 'terminal' | 'problems')}
>
```

**Ventajas:**
- Podemos cambiar tab programáticamente con `setActiveBottomTab()`
- Shortcuts funcionan correctamente
- Usuario puede hacer click en tabs
- Estado sincronizado con React

### Radix UI ForceMount Pattern

⚠️ **IMPORTANTE**: Por defecto, Radix Tabs **UNMOUNTS** el contenido de tabs inactivos, lo que destruye el estado del componente. Para mantener los componentes montados (esencial para preservar PTY sessions del terminal), debemos usar `forceMount` + visibilidad manual con CSS:

```tsx
<TabsContent value="terminal" className="flex-1 m-0 h-full" forceMount>
  <div
    style={{ display: activeBottomTab === 'terminal' ? 'flex' : 'none' }}
    className="h-full flex-col"
  >
    <TerminalPanel />
  </div>
</TabsContent>

<TabsContent value="problems" className="flex-1 m-0 h-full" forceMount>
  <div
    style={{ display: activeBottomTab === 'problems' ? 'flex' : 'none' }}
    className="h-full flex-col"
  >
    <ProblemsPanel onClose={() => setIsBottomPanelOpen(false)} />
  </div>
</TabsContent>
```

**Comportamiento con `forceMount`:**
- ✅ Componentes SIEMPRE montados (no se unmount al cambiar tabs)
- ✅ PTY sessions preservadas (xterm.js no se destruye)
- ✅ Scroll positions preservadas
- ✅ Estado preservado completamente
- ✅ Cambio instantáneo de tabs sin re-renderizado
- ✅ Visibilidad controlada con CSS (`display: none` cuando inactivo)

**Sin `forceMount` (comportamiento por defecto - ❌ NO USAR):**
- ❌ Tabs inactivos se unmount del DOM
- ❌ `TerminalInstance.useEffect` cleanup se ejecuta
- ❌ `terminalRef.current?.dispose()` destruye xterm.js
- ❌ PTY connection se pierde
- ❌ Terminal aparece "congelado" al volver

### Panel Collapse

```typescript
<ResizablePanel
  id="bottom-panel"
  order={2}
  defaultSize={30}
  minSize={20}
  collapsedSize={0}
  collapsible  // ← Usuario puede colapsar panel
  className="min-h-[160px]"
>
```

**Usuario puede:**
- Arrastrar borde superior para resize
- Doble click en borde para colapsar
- Usar handle para expandir/colapsar

---

## 🧪 Testing Scenarios

### Test 1: Shortcuts

```
1. Ctrl+` → Panel abre, Terminal activo ✓
2. Ctrl+Shift+M → Tab cambia a Problems ✓
3. Ctrl+` → Tab cambia a Terminal ✓
4. Panel sigue abierto todo el tiempo ✓
```

### Test 2: Click en Tabs

```
1. Panel abierto, Terminal activo
2. Click en "Problems" → Cambia a Problems ✓
3. Click en "Terminal" → Cambia a Terminal ✓
4. Cambio instantáneo, sin lag ✓
```

### Test 3: Terminal Preservado

```
1. Terminal activo
2. Type: echo "test"
3. Output: "test" ✓
4. Click en "Problems" → Tab cambia
5. Click en "Terminal" → "test" sigue ahí ✓
6. Terminal funcional ✓
```

### Test 4: Problems Panel

```
1. Abrir archivo con errores
2. Ctrl+Shift+M → Problems muestra errores ✓
3. Click en error → Salta al código ✓
4. Arreglar error
5. Panel muestra error desaparecido ✓
```

### Test 5: Resize & Collapse

```
1. Panel abierto
2. Arrastrar borde superior → Resize funciona ✓
3. Doble click en borde → Panel colapsa ✓
4. Click en handle → Panel expande ✓
5. Tabs siguen funcionando ✓
```

---

## 🎉 Resultado Final

El panel inferior ahora funciona **exactamente como VS Code:**

✅ **Un solo panel unificado**
✅ **Dos tabs siempre disponibles**
✅ **Shortcuts activan tabs, no abren/cierran**
✅ **Cambio instantáneo entre tabs**
✅ **Componentes siempre montados (estado preservado)**
✅ **UX profesional y consistente**
✅ **Menos confusión para el usuario**

---

## 🚀 Próximos Pasos (Futuro)

### 1. Agregar Más Tabs

```typescript
const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'problems' | 'output' | 'debug'>('terminal');

<TabsList>
  <TabsTrigger value="terminal">Terminal</TabsTrigger>
  <TabsTrigger value="problems">Problems</TabsTrigger>
  <TabsTrigger value="output">Output</TabsTrigger>
  <TabsTrigger value="debug">Debug Console</TabsTrigger>
</TabsList>
```

### 2. Iconos en Tabs

```typescript
import { Terminal, AlertCircle, FileText, Bug } from 'lucide-react';

<TabsTrigger value="terminal">
  <Terminal size={14} />
  <span>Terminal</span>
</TabsTrigger>
```

### 3. Counters en Tabs

```typescript
<TabsTrigger value="problems">
  <AlertCircle size={14} />
  <span>Problems</span>
  {errorCount > 0 && (
    <span className="ml-2 px-1.5 rounded-full bg-red-500/20 text-red-500 text-xs">
      {errorCount}
    </span>
  )}
</TabsTrigger>
```

### 4. Persistencia

```typescript
// Guardar tab activo en localStorage
useEffect(() => {
  localStorage.setItem('activeBottomTab', activeBottomTab);
}, [activeBottomTab]);

// Restaurar al inicio
const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'problems'>(
  (localStorage.getItem('activeBottomTab') as 'terminal' | 'problems') || 'terminal'
);
```

---

## 📚 Referencias

- [VS Code Panel Documentation](https://code.visualstudio.com/docs/getstarted/userinterface#_panel)
- [Radix UI Tabs](https://www.radix-ui.com/primitives/docs/components/tabs)
- [ResizablePanel Documentation](https://github.com/bvaughn/react-resizable-panels)

---

**El sistema ahora es profesional, intuitivo, y consistente con los IDEs líderes!** 🎊
