# Test Plan: Configuration System

## Prerequisite: Start the app
```bash
pnpm tauri dev
```

## Test 1: Check if core schemas are registered
1. Open browser console
2. Look for logs:
   - `[ConfigurationService] Initializing...`
   - `[ConfigurationService] Registered core IDE configuration schema...`
   - `[ConfigurationBridge] Registered IDE configuration schemas`
3. In console, run:
   ```javascript
   // Access the configuration service via window (we'll add this)
   // Or check React DevTools for configurationState
   ```

## Test 2: Open Settings UI
1. Press `Ctrl+,` (or `Cmd+,` on Mac)
2. Click "All Settings" button in sidebar
3. **Expected**: Should see ConfigurationSettings UI with:
   - Search bar at top
   - Sidebar with categories (editor, workbench, files, terminal, explorer, problems)
   - Settings grouped by category

## Test 3: Verify settings appear
1. In "All Settings", look for:
   - `editor.fontSize` - Should show number input with value 14
   - `editor.fontFamily` - Should show text input
   - `editor.tabSize` - Should show number input with value 4
   - `editor.minimap.enabled` - Should show toggle switch
   - `workbench.colorTheme` - Should show dropdown
2. **Expected**: All controls should show current values, not undefined

## Test 4: Change a value
1. Find `editor.fontSize`
2. Change value from 14 to 18
3. Check browser console for:
   - `[ConfigurationStore] Configuration changed: ...`
   - `[EditorConfigurationService] Editor configuration changed: ...`
   - `[EditorConfigurationService] Applied configuration to editor: { fontSize: 18 ... }`
4. **Expected**: Monaco editor font size should change immediately

## Test 5: Verify persistence
1. Change `editor.fontSize` to 20
2. Close and restart the app (`pnpm tauri dev`)
3. Open Settings again
4. **Expected**: `editor.fontSize` should still be 20
5. Check file exists: `~/.rainy-aether/settings.json` or `%USERPROFILE%\.rainy-aether\settings.json` on Windows
6. File should contain: `{"editor.fontSize": 20}`

## Test 6: Reset to default
1. Find a modified setting (should have blue dot indicator)
2. Click reset button (rotate icon)
3. **Expected**: Value should revert to default

## Test 7: Search functionality
1. Type "font" in search bar
2. **Expected**: Only font-related settings should appear (fontSize, fontFamily)
3. Clear search
4. **Expected**: All settings should appear again

## Test 8: Modified only filter
1. Change a few settings
2. Toggle "Modified only" switch
3. **Expected**: Only modified settings should appear
4. Each should have blue dot indicator

## Test 9: Category filtering
1. Click "editor" in sidebar
2. **Expected**: Only editor.* settings should appear
3. Click "workbench"
4. **Expected**: Only workbench.* settings should appear

## Test 10: Enum dropdown
1. Find `workbench.colorTheme`
2. Click dropdown
3. **Expected**: Should see all theme options with descriptions
4. Select a different theme
5. **Expected**: IDE theme should change immediately

## Test 11: Boolean toggle
1. Find `editor.minimap.enabled`
2. Click toggle switch
3. **Expected**:
   - Switch should animate
   - Monaco editor minimap should appear/disappear immediately

## Test 12: Validation
1. Find `editor.fontSize`
2. Try to enter invalid value (e.g., 1 or 100)
3. **Expected**:
   - Error message should appear (minimum 8, maximum 72)
   - Value should not be saved

## Debugging Commands

If tests fail, run these in browser console:

```javascript
// Check if configuration service is initialized
console.log(window.__configurationService);

// Check store state
// (Access via React DevTools or add to window in App.tsx)

// Check Tauri commands
await __TAURI__.invoke('load_user_configuration');
await __TAURI__.invoke('get_configuration_value', { key: 'editor.fontSize' });
```

## Expected Files

After changing settings, these files should exist:

- **Windows**: `C:\Users\<username>\.rainy-aether\settings.json`
- **macOS**: `~/.rainy-aether/settings.json`
- **Linux**: `~/.rainy-aether/settings.json`

Content example:
```json
{
  "editor.fontSize": 18,
  "editor.tabSize": 2,
  "workbench.colorTheme": "monokai-night"
}
```

## Common Issues

### Issue: Settings not appearing
- **Check**: Console for errors
- **Check**: `configurationService.getAllProperties()` returns empty array
- **Fix**: Ensure `initializeConfigurationBridge()` is called in App.tsx

### Issue: Changes not persisting
- **Check**: Console for "save" errors
- **Check**: File permissions for `.rainy-aether` directory
- **Fix**: Run app with proper permissions

### Issue: UI controls show undefined
- **Check**: `property.value` in React DevTools
- **Check**: `configurationService.get('editor.fontSize')` in console
- **Fix**: Ensure schemas are registered before loading values

### Issue: Monaco not updating
- **Check**: Console for `[EditorConfigurationService]` logs
- **Check**: `editorActions.getCurrentEditor()` returns editor instance
- **Fix**: Ensure `initializeEditorConfigurationService()` is called

## Success Criteria

All tests should pass with:
- ✅ Settings appear in UI
- ✅ Current values are displayed correctly
- ✅ Changes persist to disk
- ✅ Changes apply immediately (Monaco font size, theme, etc.)
- ✅ Reset works
- ✅ Search works
- ✅ Validation works
- ✅ No console errors
