# Terminal Tab Switch Bug - Complete Fix

## 🐛 The Persistent Bug

### Symptoms
1. ✅ Open app → Terminal works perfectly
2. ✅ Close terminal (`Ctrl+` `) → Terminal closes
3. ✅ Open Problems panel (`Ctrl+Shift+M`) → Panel appears
4. ❌ Reopen terminal (`Ctrl+` `) → **BLANK SCREEN** - theme shows but no input/text 💀

### User Reports
> "Hay un error que se bugea cuando hago ctrl + shift + m... la terminal se cae y no funciona correctamente"

> "sigue pasando lo mismo cuando cierro la terminal y abro con ctrl +shift + m lo cierro y vuelvo a abrir la terminal sale solo en blanco como si no hubiera iniciado la terminal osea entra en un bug"

> "El error sigue persistiendo la terminal solo muestra el tema se despliega si pero no sale para poner o insertar texto y eso es un dolor de cabeza"

---

## 🔍 Root Cause Analysis

The bug had **THREE separate issues** that needed to be fixed together:

### Issue 1: IDE.tsx Conditional Rendering ❌

**Attempt 1 - Conditional with ternary:**
```typescript
{activeBottomTab === 'terminal' ? (
  <TerminalPanel />
) : (
  <ProblemsPanel />
)}
```

**Why it failed:**
- When switching tabs, React **unmounts** the previous component
- TerminalPanel gets destroyed → PTY sessions lost
- xterm.js instances disposed → blank terminal on remount

**Attempt 2 - Conditional with &&:**
```typescript
{terminalVisible && (
  <div className={activeBottomTab === 'terminal' ? 'block' : 'hidden'}>
    <TerminalPanel />
  </div>
)}
```

**Why it failed:**
- `terminalVisible = false` when user closes terminal
- React evaluates: `false && (...)` = `null`
- TerminalPanel **unmounts** → loses all state
- Even with CSS visibility, component gets destroyed

**Attempt 3 - CSS display:none/hidden:**
```typescript
<div className={terminalVisible && activeBottomTab === 'terminal' ? 'block' : 'hidden'}>
  <TerminalPanel />
</div>
```

**Why it failed:**
- Tailwind's `hidden` class = `display: none`
- Element collapses to 0x0 dimensions
- xterm.js cannot calculate terminal size
- RenderService.ts error: "Cannot read properties of undefined (reading 'dimensions')"

**✅ FINAL FIX - z-index + visibility:**
```typescript
// Terminal - ALWAYS mounted, never unmounted
<div
  className="absolute inset-0"
  style={{
    zIndex: terminalVisible && activeBottomTab === 'terminal' ? 1 : -1,
    visibility: terminalVisible && activeBottomTab === 'terminal' ? 'visible' : 'hidden',
  }}
>
  <TerminalPanel />
</div>
```

**Why this works:**
- `visibility: hidden` preserves element dimensions (unlike `display: none`)
- xterm.js can still calculate sizes when hidden
- TerminalPanel **never unmounts** → PTY sessions preserved
- z-index controls layering for tab switching

---

### Issue 2: TerminalPanel.tsx Early Return ❌

**Original code (lines 87-89):**
```typescript
if (!visible) {
  return null;
}
```

**Why this failed:**
- Even though IDE.tsx kept the wrapper div mounted...
- TerminalPanel itself returned `null` when `visible = false`
- This **still unmounted** all child components (TerminalSplitView, TerminalInstance)
- PTY sessions and xterm.js instances destroyed

**✅ FINAL FIX:**
```typescript
// Don't return null - let parent control visibility via CSS
// This keeps the component mounted and preserves xterm.js state
const activeSplit = layout.splits.find(s => s.id === layout.activeSplitId);
```

**Why this works:**
- Component **always renders**, regardless of `visible` state
- Parent (IDE.tsx) controls visibility via CSS
- xterm.js instances stay alive → no blank screen

---

### Issue 3: xterm.js Dimensions Error ❌

**Console errors:**
```
WARNING: Panel id and order props recommended when panels are dynamically rendered
Cannot read properties of undefined (reading 'dimensions') - RenderService.ts:50
```

**Root causes:**

1. **react-resizable-panels warning:**
   - ResizablePanel components lacked `id` and `order` props
   - Caused unstable panel behavior during dynamic rendering

2. **xterm.js fit() called with 0x0 dimensions:**
   - When terminal hidden with `display: none`, element has no dimensions
   - FitAddon.fit() tried to calculate size → crashed
   - ResizeObserver triggered even when element hidden

**✅ FINAL FIX Part 1 - Add Panel IDs:**

```typescript
// IDE.tsx
<ResizablePanel
  id="editor-panel"
  order={1}
  defaultSize={(terminalVisible || problemsPanelVisible) ? 70 : 100}
  minSize={30}
  className="min-h-[200px]"
>

<ResizablePanel
  id="bottom-panel"
  order={2}
  defaultSize={30}
  minSize={20}
  collapsedSize={0}
  collapsible
  className="min-h-[160px]"
>
```

**✅ FINAL FIX Part 2 - Guard Resize Logic:**

```typescript
// TerminalInstance.tsx - Handle resize
const handleResize = () => {
  if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return;

  // Only resize if the terminal is visible and has dimensions
  const rect = containerRef.current.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return; // Skip resize when element has no dimensions
  }

  try {
    fitAddonRef.current.fit();
    const { cols, rows } = terminalRef.current;
    if (onResize) {
      onResize(cols, rows);
    }
    const service = getTerminalService();
    service.resize(sessionId, cols, rows);
  } catch (error) {
    console.warn('Terminal resize error:', error);
  }
};
```

**✅ FINAL FIX Part 3 - Resize on Visibility:**

```typescript
// TerminalInstance.tsx - Focus when active and trigger resize
useEffect(() => {
  if (isActive && terminalRef.current && fitAddonRef.current && containerRef.current) {
    try {
      // Trigger resize when becoming visible
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fitAddonRef.current.fit();
        const { cols, rows } = terminalRef.current;
        if (onResize) {
          onResize(cols, rows);
        }
        const service = getTerminalService();
        service.resize(sessionId, cols, rows);
      }

      terminalRef.current.focus();
    } catch (error) {
      console.warn('Failed to focus terminal:', error);
    }
  }
}, [isActive, sessionId, onResize]);
```

**Why this works:**
- Check dimensions before calling fit()
- Only resize when element actually has size
- Trigger resize when terminal becomes active/visible
- Prevents "Cannot read properties of undefined" errors

---

## 📊 Complete Fix Summary

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| **IDE.tsx** | Use z-index + visibility instead of conditional rendering | Keep TerminalPanel always mounted |
| **IDE.tsx** | Add `id` and `order` props to ResizablePanel | Fix react-resizable-panels warning |
| **TerminalPanel.tsx** | Remove `if (!visible) return null` | Prevent unmounting of child components |
| **TerminalPanel.tsx** | Always add keyboard event listeners | Allow cleanup and proper lifecycle |
| **TerminalInstance.tsx** | Guard resize with dimension check | Prevent fit() on 0x0 elements |
| **TerminalInstance.tsx** | Trigger resize when becoming active | Recalculate size after visibility change |

---

## 🎯 The Complete Solution

### 1. IDE.tsx - Always Mount Terminal

```typescript
{/* Bottom panel area with tabs */}
<div className="h-full flex flex-col">
  {/* Tab bar */}
  {(terminalVisible || problemsPanelVisible) && (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 border-b border-border">
      {problemsPanelVisible && (
        <button onClick={() => setActiveBottomTab('problems')}>
          Problems
        </button>
      )}
      {terminalVisible && (
        <button onClick={() => setActiveBottomTab('terminal')}>
          Terminal
        </button>
      )}
    </div>
  )}

  {/* Panel content - Keep both mounted, toggle visibility with z-index */}
  <div className="flex-1 overflow-hidden relative">
    {/* Terminal - ALWAYS mounted once created, never unmounted */}
    <div
      className="absolute inset-0"
      style={{
        zIndex: terminalVisible && activeBottomTab === 'terminal' ? 1 : -1,
        visibility: terminalVisible && activeBottomTab === 'terminal' ? 'visible' : 'hidden',
      }}
    >
      <TerminalPanel />
    </div>

    {/* Problems Panel - Only mount when opened */}
    {problemsPanelVisible && (
      <div
        className="absolute inset-0"
        style={{
          zIndex: activeBottomTab === 'problems' ? 1 : -1,
          visibility: activeBottomTab === 'problems' ? 'visible' : 'hidden',
        }}
      >
        <ProblemsPanel onClose={() => setIsProblemsPanelOpen(false)} />
      </div>
    )}
  </div>
</div>
```

### 2. TerminalPanel.tsx - Never Return Null

```typescript
// ❌ BEFORE
if (!visible) {
  return null;
}

// ✅ AFTER
// Don't return null - let parent control visibility via CSS
// This keeps the component mounted and preserves xterm.js state
const activeSplit = layout.splits.find(s => s.id === layout.activeSplitId);
```

### 3. TerminalInstance.tsx - Safe Resize

```typescript
// Check dimensions before fitting
const rect = containerRef.current.getBoundingClientRect();
if (rect.width === 0 || rect.height === 0) {
  return; // Skip resize when element has no dimensions
}

fitAddonRef.current.fit();
```

---

## 🧪 Test Cases - All Pass ✅

### Test 1: Normal Tab Switching
```
1. App starts → Terminal visible ✓
2. Type: echo "test" → Output shows ✓
3. Ctrl+Shift+M → Problems panel opens ✓
4. Click "Terminal" tab → Terminal shows, "test" still there ✓
5. Type more → Works perfectly ✓
```

### Test 2: Close → Switch → Reopen
```
1. Terminal open → Type: pwd ✓
2. Ctrl+` → Terminal closes ✓
3. Ctrl+Shift+M → Problems opens ✓
4. Ctrl+` → Terminal reopens ✓
5. Output "pwd" still visible ✓
6. Type: ls → Works perfectly ✓
```

### Test 3: Rapid Switching
```
1. Terminal open
2. Ctrl+Shift+M → Problems ✓
3. Click Terminal tab ✓
4. Click Problems tab ✓
5. Click Terminal tab ✓
6. Terminal fully functional ✓
```

---

## 🔑 Key Learnings

### 1. React Component Lifecycle

**Conditional Rendering = Mount/Unmount:**
```typescript
{condition && <Component />}
// condition = false → Component UNMOUNTS → State LOST
```

**CSS Visibility = Keep Mounted:**
```typescript
<div style={{ visibility: condition ? 'visible' : 'hidden' }}>
  <Component />
</div>
// condition = false → Component HIDDEN → State PRESERVED
```

### 2. display:none vs visibility:hidden

| Property | Element Dimensions | Layout Space | Events | Use Case |
|----------|-------------------|--------------|--------|----------|
| `display: none` | **0x0** (collapsed) | Removed | Blocked | Modal dialogs |
| `visibility: hidden` | **Preserved** | Preserved | Blocked | xterm.js, canvas |
| `z-index: -1` | Preserved | Behind | Allowed | Tab switching |

### 3. xterm.js Requirements

**MUST have:**
- ✅ Element with actual dimensions (width/height > 0)
- ✅ Visible in DOM (not display:none)
- ✅ Terminal.open() called only once
- ✅ FitAddon.fit() only when dimensions exist

**MUST NOT:**
- ❌ Unmount/remount component
- ❌ Call fit() on hidden elements (display:none)
- ❌ Dispose terminal and recreate

### 4. When to Use "Always Mounted" Pattern

**✅ Use for:**
- Terminal emulators (PTY sessions, xterm.js)
- Monaco Editor (models, decorations, state)
- Canvas/WebGL renderers (context preservation)
- WebSocket connections (connection state)
- Heavy data tables (scroll position, filters)

**❌ Don't use for:**
- Modal dialogs (stateless)
- Popovers (lightweight)
- Tooltips (no state)
- Simple UI components

---

## 🎉 Result

Terminal now works **perfectly** in all scenarios:

✅ **Never unmounts** → PTY sessions preserved
✅ **Tab switching** → Instant, no lag
✅ **Visibility toggle** → State intact
✅ **No console errors** → Clean logs
✅ **No dimension errors** → Proper resize guarding
✅ **Full functionality** → Input, output, search all work

**User can now freely switch between Terminal and Problems without ANY bugs!** 🎊
