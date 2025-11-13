/**
 * Object Setting Component
 *
 * Renders a JSON editor for object-type configuration properties.
 * Simplified version - displays JSON for now, can be enhanced later with nested editors.
 */

import React, { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { SettingControl } from './SettingControl';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface ObjectSettingProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Current value */
  value: Record<string, any>;

  /** Called when value changes */
  onChange: (value: Record<string, any>) => void;

  /** Called when reset button clicked */
  onReset?: () => void;
}

export const ObjectSetting: React.FC<ObjectSettingProps> = ({
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

      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Value must be an object');
        return;
      }

      setError(null);
      onChange(parsed);
    } catch (e: any) {
      setError('Invalid JSON: ' + e.message);
    }
  }, [onChange]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const isModified = JSON.stringify(value) !== JSON.stringify(property.default);

  return (
    <SettingControl
      property={property}
      isModified={isModified}
      onReset={onReset}
      error={error || undefined}
    >
      <Textarea
        id={property.key}
        value={localValue}
        onChange={handleTextareaChange}
        placeholder={JSON.stringify(property.default, null, 2) || '{}'}
        aria-invalid={!!error}
        aria-describedby={error ? `${property.key}-error` : undefined}
        className={error ? 'border-destructive font-mono text-sm' : 'font-mono text-sm'}
        rows={10}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Enter a valid JSON object
      </p>
    </SettingControl>
  );
};
