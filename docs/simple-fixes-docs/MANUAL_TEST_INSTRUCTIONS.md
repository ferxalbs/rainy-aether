# Manual Testing Instructions - Configuration System

## 🚨 CRITICAL: Follow these steps EXACTLY

### Step 1: Start the Application

```bash
cd c:\Projects\rainy-aether-2
pnpm tauri dev
```

**Wait for the app to fully load.** You should see the IDE interface.

---

### Step 2: Open Browser DevTools

1. In the app window, press **F12** or **Ctrl+Shift+I**
2. Click the **Console** tab
3. **LOOK FOR THESE LOGS** (they should appear automatically):

```
[ConfigurationStore] Starting initialization...
[ConfigurationService] Initializing...
[ConfigurationService] Loading core schemas...
[ConfigurationBridge] Registering IDE configuration schemas
[ConfigurationBridge] Registered IDE configuration schemas
[ConfigurationStore] Loaded properties: XX
[ConfigurationStore] Sample properties: [...]
[ConfigurationStore] ✅ Initialized successfully with XX properties
```

**❌ If you DON'T see these logs:**
- The configuration system is NOT initializing
- Check `App.tsx` - `configurationActions.initialize()` should be called
- There's a critical bug in initialization

---

### Step 3: Open Settings UI

1. Press **`Ctrl+,`** (or **`Cmd+,`** on Mac)
2. You should see the "Quick Settings" page
3. In the left sidebar, click **"All Settings"** button (at the bottom)

**Expected Result:**
- You should see the ConfigurationSettings UI
- Left sidebar with categories (Workbench, Explorer, Editor, Files, Problems)
- Right side with a search bar
- Settings listed below

**❌ If you DON'T see settings:**
- Check console for errors
- The UI is rendering but `configState.properties` is empty
- Bug in `getAllProperties()` or schema registration

---

### Step 4: Verify Settings Appear

In the settings list, **look for these specific settings:**

1. **`editor.fontSize`**
   - Should show a **number input**
   - Default value: **14**
   - NOT undefined, NOT empty

2. **`editor.fontFamily`**
   - Should show a **text input**
   - Default value: **"Consolas, "Courier New", monospace"**

3. **`editor.minimap.enabled`**
   - Should show a **toggle switch**
   - Default value: **ON (true)**

4. **`workbench.colorTheme`**
   - Should show a **dropdown**
   - Default value: **"navy-day"** or your current theme

**❌ If values show as "undefined" or controls are empty:**
- Bug in `property.value` resolution
- Check `configurationService.getAllProperties()` in console:
  ```javascript
  // In console, run:
  window.__configState = configurationState; // We need to expose this
  ```

---

### Step 5: Test CHANGING a Value

1. Find **`editor.fontSize`**
2. Click on the number input
3. Change the value to **20**
4. Press **Enter** or **Tab** to commit the change

**WATCH THE CONSOLE for these logs:**

```
[ConfigurationStore] 💾 Setting value: { key: 'editor.fontSize', value: 20, scope: 'user' }
[ConfigurationService] Setting value: editor.fontSize = 20
[ConfigurationManager] Saving user configuration...  (Rust backend)
[ConfigurationStore] ✅ Value set successfully
[ConfigurationStore] 🔄 Configuration changed: { changedKeys: ['editor.fontSize'], ... }
[EditorConfigurationService] Editor configuration changed: ['editor.fontSize']
[EditorConfigurationService] Applied configuration to editor: { fontSize: 20 ... }
```

**VISUAL RESULT:**
- The Monaco editor font should **immediately get bigger**
- You should see text in the editor grow
- The setting should show a **blue dot** indicator (modified)

**❌ If nothing happens:**
- Check if logs appear
- If no logs: UI is not calling `configurationActions.set()`
- If logs appear but Monaco doesn't change: `editorActions.getCurrentEditor()` is null
- If "editor not found" in logs: Monaco instance not registered

---

### Step 6: Test PERSISTENCE

1. Change `editor.fontSize` to **22**
2. **Close the app** completely (X button)
3. **Restart** the app (`pnpm tauri dev`)
4. Press **`Ctrl+,`** → **"All Settings"**
5. Find `editor.fontSize` again

**Expected Result:**
- Value should STILL be **22**
- NOT reverted to 14

**Check the file system:**
- Windows: `C:\Users\<YourUsername>\.rainy-aether\settings.json`
- Mac/Linux: `~/.rainy-aether/settings.json`

**File should contain:**
```json
{
  "editor.fontSize": 22
}
```

**❌ If file doesn't exist:**
- Rust backend is NOT saving
- Check Tauri logs for errors
- Check file permissions

**❌ If file exists but value doesn't persist on reload:**
- Bug in `load_user_configuration` command
- Check `configurationService.initialize()` loads from file

---

### Step 7: Test RESET

1. Find `editor.fontSize` (which should be modified, showing blue dot)
2. Click the **reset button** (rotate/refresh icon on the right)

**Expected Result:**
- Value should revert to **14**
- Blue dot indicator should **disappear**
- Monaco editor font should **shrink back** to 14px

**Console should show:**
```
[ConfigurationStore] Resetting value: { key: 'editor.fontSize', scope: 'user' }
[ConfigurationService] Resetting value: editor.fontSize
[ConfigurationManager] Deleting configuration value...
[ConfigurationStore] 🔄 Configuration changed: { changedKeys: ['editor.fontSize'], ... }
[EditorConfigurationService] Applied configuration to editor: { fontSize: 14 ... }
```

---

### Step 8: Test SEARCH

1. In the search bar at the top, type **"font"**
2. Press Enter or wait

**Expected Result:**
- Only font-related settings appear:
  - `editor.fontSize`
  - `editor.fontFamily`
- Other settings are hidden
- Count should show "2 results" (or similar)

3. Clear the search (click X button)

**Expected Result:**
- All settings reappear
- Count resets

---

### Step 9: Test ENUM (Dropdown)

1. Search for **"workbench.colorTheme"**
2. Click the dropdown

**Expected Result:**
- Dropdown shows theme options:
  - navy-day, navy-night
  - dark-day, dark-night
  - light-day, light-night
  - etc.
- Each option has a description

3. Select **"monokai-night"**

**Expected Result:**
- IDE theme changes **immediately** to Monokai Night
- Dark background, colorful syntax
- Setting shows modified indicator (blue dot)

---

### Step 10: Test BOOLEAN (Toggle)

1. Find **`editor.minimap.enabled`**
2. Click the toggle switch

**Expected Result:**
- Switch animates to OFF
- Monaco editor **minimap disappears** (right side of editor)
- Label changes from "Enabled" to "Disabled"

3. Click toggle again

**Expected Result:**
- Switch animates to ON
- Monaco editor **minimap reappears**

---

## 🐛 Debugging Commands

If anything fails, run these in the browser console:

### Check Configuration Service State

```javascript
// Check if service is initialized
console.log('Service initialized:', !!window.__configurationService);

// Get all properties
const service = window.__configurationService || configurationService;
console.log('All properties:', service?.getAllProperties());

// Get specific value
console.log('editor.fontSize:', service?.get('editor.fontSize'));
```

### Check Store State

```javascript
// You may need to add this to App.tsx:
// window.__configState = configurationState;

console.log('Store state:', window.__configState);
console.log('Properties count:', window.__configState?.properties?.length);
console.log('Is loading:', window.__configState?.isLoading);
console.log('Errors:', window.__configState?.error);
```

### Check Tauri Commands

```javascript
// Check if Tauri is available
console.log('Tauri available:', !!window.__TAURI__);

// Try loading user config
const config = await window.__TAURI__.invoke('load_user_configuration');
console.log('User config:', config);

// Try getting a value
const fontSize = await window.__TAURI__.invoke('get_configuration_value', {
  key: 'editor.fontSize'
});
console.log('editor.fontSize from Rust:', fontSize);

// Try setting a value
await window.__TAURI__.invoke('set_configuration_value', {
  key: 'editor.fontSize',
  value: 16,
  scope: 'User'
});
console.log('Set fontSize to 16');
```

### Check Monaco Editor

```javascript
// Check if editor is registered
import { editorActions } from '@/stores/editorStore';
const editor = editorActions.getCurrentEditor();
console.log('Monaco editor:', editor);

// Check current font size
console.log('Current font size:', editor?.getOption(monaco.editor.EditorOption.fontSize));
```

---

## ✅ Success Criteria

All of these must work:

- ✅ App starts without errors
- ✅ Configuration logs appear in console
- ✅ Settings UI opens with `Ctrl+,` → "All Settings"
- ✅ At least 15+ settings appear (editor, workbench, files, etc.)
- ✅ All values show correctly (not undefined)
- ✅ Changing `editor.fontSize` updates Monaco immediately
- ✅ Values persist after restart
- ✅ Reset button works
- ✅ Search works
- ✅ Enum dropdown works
- ✅ Boolean toggle works
- ✅ No errors in console

---

## ❌ Common Failures & Solutions

### "No settings appear"
- **Cause**: Schemas not registered
- **Fix**: Check `registerIDEConfigurations()` is called in `initializeConfigurationBridge()`
- **Fix**: Check `App.tsx` calls `initializeConfigurationBridge()`

### "Values show as undefined"
- **Cause**: `property.value` not resolved
- **Fix**: Check `getAllProperties()` calls `this.get(key)` for each property
- **Fix**: Check `get()` returns default if no user value exists

### "Changes don't persist"
- **Cause**: Rust backend not saving
- **Fix**: Check Tauri command `save_user_configuration` is registered
- **Fix**: Check file permissions for `.rainy-aether` directory
- **Fix**: Check `set_configuration_value` actually calls save

### "Monaco doesn't update"
- **Cause**: Editor not registered or listener not set up
- **Fix**: Check `MonacoEditor.tsx` calls `editorActions.registerView()`
- **Fix**: Check `initializeEditorConfigurationService()` is called in `App.tsx`
- **Fix**: Check `applyEditorConfiguration()` is called after editor creation

### "Console shows errors"
- Read the error carefully
- Check the stack trace
- Common errors:
  - `Cannot read property 'get' of undefined` → Service not initialized
  - `invoke error` → Tauri command not registered or failing
  - `TypeError: properties.map is not a function` → properties is not an array

---

## 📋 Report Format

If you find bugs, report them like this:

```
BUG: [Short description]

STEPS:
1. Open app
2. Press Ctrl+,
3. Click "All Settings"
4. ...

EXPECTED: [What should happen]

ACTUAL: [What actually happened]

CONSOLE LOGS: [Copy relevant logs]

SCREENSHOT: [If applicable]
```

---

**Now go test it and report back what ACTUALLY happens!** 🚀
