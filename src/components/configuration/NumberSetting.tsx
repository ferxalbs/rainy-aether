/**
 * Number Setting Component
 *
 * Renders a number input for number/integer-type configuration properties.
 * Supports min/max validation and step values.
 */

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { SettingControl } from './SettingControl';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface NumberSettingProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Current value */
  value: number;

  /** Called when value changes */
  onChange: (value: number) => void;

  /** Called when reset button clicked */
  onReset?: () => void;
}

export const NumberSetting: React.FC<NumberSettingProps> = ({
  property,
  value,
  onChange,
  onReset
}) => {
  const [error, setError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState(value.toString());

  const isInteger = property.type === 'integer';
  const min = property.minimum;
  const max = property.maximum;
  const step = property.multipleOf || (isInteger ? 1 : 0.1);

  const validateValue = useCallback((newValue: number): string | null => {
    // Integer check
    if (isInteger && !Number.isInteger(newValue)) {
      return 'Value must be an integer';
    }

    // Min validation
    if (min !== undefined && newValue < min) {
      return `Value must be at least ${min}`;
    }

    // Max validation
    if (max !== undefined && newValue > max) {
      return `Value must be at most ${max}`;
    }

    return null;
  }, [isInteger, min, max]);

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);

    const numValue = parseFloat(newValue);
    if (isNaN(numValue)) {
      setError('Invalid number');
      return;
    }

    const validationError = validateValue(numValue);
    setError(validationError);

    if (!validationError) {
      onChange(numValue);
    }
  }, [validateValue, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.value);
  };

  const handleBlur = () => {
    const numValue = parseFloat(localValue);
    if (!isNaN(numValue)) {
      const validationError = validateValue(numValue);
      if (validationError) {
        setError(validationError);
      }
    }
  };

  const isModified = value !== property.default;

  return (
    <SettingControl
      property={property}
      isModified={isModified}
      onReset={onReset}
      error={error || undefined}
    >
      <Input
        id={property.key}
        type="number"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        aria-invalid={!!error}
        aria-describedby={error ? `${property.key}-error` : undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className={error ? 'border-destructive' : ''}
      />
    </SettingControl>
  );
};
