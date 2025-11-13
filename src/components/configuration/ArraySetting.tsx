/**
 * Array Setting Component
 *
 * Renders a list editor for array-type configuration properties.
 * Simplified version - displays JSON for now, can be enhanced later.
 */

import React, { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { SettingControl } from './SettingControl';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface ArraySettingProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Current value */
  value: any[];

  /** Called when value changes */
  onChange: (value: any[]) => void;

  /** Called when reset button clicked */
  onReset?: () => void;
}

export const ArraySetting: React.FC<ArraySettingProps> = ({
  property,
  value,
  onChange,
  onReset
}) => {
  const [error, setError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState(JSON.stringify(value, null, 2));

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);

    try {
      const parsed = JSON.parse(newValue);

      if (!Array.isArray(parsed)) {
        setError('Value must be an array');
        return;
      }

      // Min items validation
      if (property.minItems !== undefined && parsed.length < property.minItems) {
        setError(`Array must have at least ${property.minItems} items`);
        return;
      }

      // Max items validation
      if (property.maxItems !== undefined && parsed.length > property.maxItems) {
        setError(`Array must have at most ${property.maxItems} items`);
        return;
      }

      setError(null);
      onChange(parsed);
    } catch (e: any) {
      setError('Invalid JSON: ' + e.message);
    }
  }, [property, onChange]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const isModified = JSON.stringify(value) !== JSON.stringify(property.default);

  return (
    <SettingControl
      property={property}
      value={value}
      isModified={isModified}
      onReset={onReset}
      error={error || undefined}
    >
      <Textarea
        id={property.key}
        value={localValue}
        onChange={handleTextareaChange}
        placeholder={JSON.stringify(property.default, null, 2) || '[]'}
        aria-invalid={!!error}
        aria-describedby={error ? `${property.key}-error` : undefined}
        className={error ? 'border-destructive font-mono text-sm' : 'font-mono text-sm'}
        rows={8}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Enter a valid JSON array
      </p>
    </SettingControl>
  );
};
