# Configuration Type → Component Mapping Contract

**Version:** 1.0.0
**Last Updated:** 2025-11-13
**Status:** ✅ Complete

## Overview

This document defines the contract for mapping VS Code configuration schema types to shadcn UI components in Rainy Aether. Each configuration property type maps to a specific React component with appropriate validation, accessibility, and UX patterns.

## Design Principles

1. **VS Code Compatibility**: Follow VS Code's settings UI patterns
2. **Accessibility First**: Full keyboard navigation, ARIA labels, screen reader support
3. **Type Safety**: Strict TypeScript typing throughout
4. **Validation**: Inline validation with clear error messages
5. **Performance**: Lazy rendering, virtualization for large lists
6. **Composability**: Components can be reused and extended

---

## Type Mappings

### 1. String Type

**Schema:**

```json
{
  "type": "string",
  "default": "Hello World",
  "description": "A text value"
}
```

**Component:** `Input` (shadcn/ui)

**Props:**

```typescript
interface StringSettingProps {
  value: string;
  property: ConfigurationProperty;
  onChange: (value: string) => void;
  onValidate?: (value: string) => string | null; // null = valid
}
```

**Features:**

- Single-line text input
- Pattern validation (regex)
- Min/max length constraints
- Placeholder from description
- Clear button when not empty

**Variations:**

- **Multiline**: Use `Textarea` when `editPresentation: 'multilineText'`
- **Enum**: Use `Select` when `enum` property is present

**Accessibility:**

- `aria-label`: Property description
- `aria-invalid`: true when validation fails
- `aria-describedby`: Error message ID

---

### 2. Number / Integer Type

**Schema:**

```json
{
  "type": "number",
  "default": 14,
  "minimum": 8,
  "maximum": 72,
  "description": "Font size in pixels"
}
```

**Component:** `Input[type="number"]` (shadcn/ui)

**Props:**

```typescript
interface NumberSettingProps {
  value: number;
  property: ConfigurationProperty;
  onChange: (value: number) => void;
  onValidate?: (value: number) => string | null;
}
```

**Features:**

- Number input with spinner controls
- Min/max validation
- Step value support (`multipleOf`)
- Integer vs float handling
- Unit display (optional)

**Validation:**

- Range constraints (min/max)
- Integer validation (when type is 'integer')
- Step validation

**Accessibility:**

- `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Keyboard: Arrow keys for increment/decrement
- Clear feedback on validation errors

---

### 3. Boolean Type

**Schema:**

```json
{
  "type": "boolean",
  "default": true,
  "description": "Enable feature"
}
```

**Component:** `Switch` (shadcn/ui)

**Props:**

```typescript
interface BooleanSettingProps {
  value: boolean;
  property: ConfigurationProperty;
  onChange: (value: boolean) => void;
}
```

**Features:**

- Toggle switch (primary)
- Checkbox (alternative, for compact layouts)
- Clear on/off states
- Immediate visual feedback

**Accessibility:**

- `role="switch"`
- `aria-checked`: true/false
- `aria-label`: Property description
- Keyboard: Space/Enter to toggle

---

### 4. Enum Type

**Schema:**

```json
{
  "type": "string",
  "enum": ["auto", "on", "off"],
  "enumDescriptions": ["Automatic", "Always on", "Always off"],
  "default": "auto",
  "description": "Control feature behavior"
}
```

**Component:** `Select` (shadcn/ui)

**Props:**

```typescript
interface EnumSettingProps {
  value: string | number;
  property: ConfigurationProperty;
  onChange: (value: string | number) => void;
}
```

**Features:**

- Dropdown selection
- Descriptions for each option
- Search/filter (for long lists)
- Keyboard navigation

**Variations:**

- **Radio Group**: For 2-4 options, use `RadioGroup` for better UX
- **Combobox**: For 10+ options, use `Combobox` with search

**Accessibility:**

- `role="combobox"` or `role="radiogroup"`
- `aria-label`: Property description
- Arrow keys for navigation
- Type-to-search

---

### 5. Array Type

**Schema:**

```json
{
  "type": "array",
  "items": { "type": "string" },
  "default": ["item1", "item2"],
  "description": "List of items"
}
```

**Component:** `ArrayEditor` (custom component)

**Props:**

```typescript
interface ArraySettingProps {
  value: any[];
  property: ConfigurationProperty;
  onChange: (value: any[]) => void;
  onValidate?: (value: any[]) => string | null;
}
```

**Features:**

- Add/remove items
- Reorder via drag-and-drop
- Item validation (based on `items` schema)
- Min/max items constraints
- Unique items enforcement

**UI Structure:**

```
[Item 1]         [× Remove]
[Item 2]         [× Remove]
[Item 3]         [× Remove]
[+ Add Item]
```

**Accessibility:**

- Each item has delete button
- Add button clearly labeled
- Drag handles for reordering (optional)
- Screen reader announces count

---

### 6. Object Type

**Schema:**

```json
{
  "type": "object",
  "properties": {
    "host": { "type": "string" },
    "port": { "type": "number" }
  },
  "default": { "host": "localhost", "port": 3000 },
  "description": "Server configuration"
}
```

**Component:** `ObjectEditor` (custom component)

**Props:**

```typescript
interface ObjectSettingProps {
  value: Record<string, any>;
  property: ConfigurationProperty;
  onChange: (value: Record<string, any>) => void;
  onValidate?: (value: Record<string, any>) => string | null;
}
```

**Features:**

- Nested property editors
- Schema-based validation
- Collapsible sections for nested objects
- JSON view toggle (read-only)

**UI Variations:**

1. **Inline Editor**: For simple objects (2-3 properties)
2. **Modal Editor**: For complex objects (4+ properties)
3. **JSON Editor**: Fallback for arbitrary objects

**Accessibility:**

- Each nested property labeled
- Clear hierarchy with indentation
- Expand/collapse keyboard controls

---

## Component States

All setting components support these states:

### 1. Default State

- Clean, unmodified appearance
- Shows default value

### 2. Modified State

- Visual indicator (e.g., blue dot or border)
- "Reset to Default" button visible
- Tooltip shows default value

### 3. Error State

- Red border or underline
- Error message below input
- `aria-invalid="true"`

### 4. Disabled State

- Grayed out appearance
- Not interactive
- Tooltip explains why disabled

### 5. Deprecated State

- Warning icon
- Deprecation message displayed
- Link to replacement setting (if any)

---

## Setting Control Layout

Each setting follows this layout structure:

```
┌─────────────────────────────────────────────────────┐
│  [Icon] Configuration Key                 [Modified]│
│  Description text goes here                         │
│                                                      │
│  [Control Component]                  [Reset Button]│
│                                                      │
│  ⚠️ Deprecation warning (if deprecated)             │
│  ❌ Error message (if validation fails)             │
│                                                      │
│  Scope: User | Default: "value"                     │
└─────────────────────────────────────────────────────┘
```

**Elements:**

1. **Header Row**:
   - Icon (based on type)
   - Configuration key (e.g., "editor.fontSize")
   - Modified indicator (if value ≠ default)

2. **Description**:
   - Markdown-rendered description
   - Links are clickable

3. **Control Row**:
   - Main input component
   - Reset button (if modified)

4. **Status Row** (optional):
   - Deprecation warning
   - Validation error
   - Additional hints

5. **Metadata Row**:
   - Scope badge (User/Workspace)
   - Default value display
   - "Requires restart" badge (if applicable)

---

## Search & Filtering

### Search Matching

Settings can be found by searching:

1. **Configuration key**: `editor.fontSize`
2. **Title/Description**: "font size", "text size"
3. **Tags**: `#editor`, `#appearance`
4. **Extension name**: "Built-in", "Material Icon Theme"
5. **Category**: "Editor", "Workbench"

### Highlighting

Matched terms are highlighted in:

- Configuration key
- Description text
- Tags

**Example:**

```
Search: "font"

Results:
┌─────────────────────────────────────────┐
│ editor.fontSize                          │  ← "font" highlighted
│ Controls the font size in pixels         │  ← "font" highlighted
└─────────────────────────────────────────┘
```

---

## Validation

### Client-Side Validation

**Triggered on:**

- Value change (debounced)
- Blur event
- Form submission

**Validation Rules:**

- Type checking
- Range constraints (min/max)
- Pattern matching (regex)
- Custom validators (from schema)

**Error Display:**

```typescript
interface ValidationError {
  message: string;      // Human-readable error
  path?: string[];      // Path to error (for nested values)
  expected?: string;    // Expected format/type
  actual?: any;         // Actual invalid value
}
```

### Server-Side Validation

Before persisting, the Rust backend validates:

- Schema compliance
- Cross-setting dependencies
- Platform-specific constraints

---

## Performance Optimizations

### 1. Lazy Rendering

- Only render visible settings (virtualized scrolling)
- Render settings on-demand as user scrolls

### 2. Debouncing

- Input changes debounced (300ms)
- Validation triggered after debounce
- Prevent excessive re-renders

### 3. Memoization

- Component props memoized with `React.memo`
- Callbacks wrapped in `useCallback`
- Values cached with `useMemo`

### 4. Virtualization

- Use `react-window` or `react-virtual` for large lists (100+ settings)
- Only render 20-30 items at a time
- Smooth scrolling performance

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

**Keyboard Navigation:**

- ✅ Tab through all controls
- ✅ Arrow keys for selections
- ✅ Enter/Space for actions
- ✅ Escape to close modals

**Screen Reader Support:**

- ✅ Proper ARIA labels
- ✅ Live regions for validation errors
- ✅ Descriptive role attributes
- ✅ State announcements (checked, invalid, etc.)

**Visual Accessibility:**

- ✅ Minimum 4.5:1 contrast ratio
- ✅ Focus indicators visible
- ✅ No color-only indicators
- ✅ Resizable text (up to 200%)

**Motor Accessibility:**

- ✅ Large click targets (44x44px minimum)
- ✅ No time-dependent interactions
- ✅ Undo/redo support

---

## Testing Strategy

### Unit Tests

**For each component type:**

```typescript
describe('StringSetting', () => {
  it('renders with default value', () => { ... });
  it('calls onChange when value changes', () => { ... });
  it('validates pattern constraint', () => { ... });
  it('displays error message on validation failure', () => { ... });
  it('resets to default when reset button clicked', () => { ... });
  it('supports keyboard navigation', () => { ... });
  it('has proper ARIA attributes', () => { ... });
});
```

### Integration Tests

**Settings UI flow:**

```typescript
describe('SettingsUI', () => {
  it('loads settings from backend', () => { ... });
  it('filters settings by search query', () => { ... });
  it('persists changes to backend', () => { ... });
  it('displays modified indicator', () => { ... });
  it('resets settings to default', () => { ... });
  it('handles validation errors gracefully', () => { ... });
});
```

### Snapshot Tests

- Capture component states
- Detect unintended UI changes
- Visual regression testing

---

## Code Examples

### Example: String Setting Component

```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface StringSettingProps {
  configKey: string;
  property: ConfigurationProperty;
  value: string;
  isModified: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}

export const StringSetting: React.FC<StringSettingProps> = ({
  configKey,
  property,
  value,
  isModified,
  onChange,
  onReset
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Validate pattern
    if (property.pattern) {
      const regex = new RegExp(property.pattern);
      if (!regex.test(newValue)) {
        setError(property.patternErrorMessage || 'Invalid format');
        return;
      }
    }

    setError(null);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={configKey} className="font-mono text-sm">
          {configKey}
          {isModified && <span className="ml-2 text-blue-500">●</span>}
        </Label>
        {isModified && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            aria-label="Reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {property.description}
      </p>

      <Input
        id={configKey}
        value={value}
        onChange={handleChange}
        placeholder={property.default?.toString()}
        aria-invalid={!!error}
        aria-describedby={error ? `${configKey}-error` : undefined}
        className={error ? 'border-destructive' : ''}
      />

      {error && (
        <p
          id={`${configKey}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Scope: User</span>
        <span>•</span>
        <span>Default: {property.default}</span>
      </div>
    </div>
  );
};
```

---

## Implementation Checklist

- [x] Define TypeScript types
- [x] Create mapping contract documentation
- [ ] Implement StringSetting component
- [ ] Implement NumberSetting component
- [ ] Implement BooleanSetting component
- [ ] Implement EnumSetting component
- [ ] Implement ArraySetting component
- [ ] Implement ObjectSetting component
- [ ] Add validation logic
- [ ] Add accessibility features
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization

---

## References

- [VS Code Settings Editor](https://code.visualstudio.com/docs/getstarted/settings)
- [VS Code Extension API: Configuration](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration)
- [shadcn/ui Components](https://ui.shadcn.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [JSON Schema](https://json-schema.org/)

---

*Last updated: 2025-11-13*
*Author: Rainy Aether Development Team*
