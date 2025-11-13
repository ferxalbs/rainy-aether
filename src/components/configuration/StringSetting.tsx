/**
 * String Setting Component
 *
 * Renders a text input or textarea for string-type configuration properties.
 * Supports pattern validation, min/max length, and multiline editing.
 */

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingControl } from './SettingControl';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface StringSettingProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Current value */
  value: string;

  /** Called when value changes */
  onChange: (value: string) => void;

  /** Called when reset button clicked */
  onReset?: () => void;
}

export const StringSetting: React.FC<StringSettingProps> = ({
  property,
  value,
  onChange,
  onReset
}) => {
  const [error, setError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState(value);

  const isMultiline = property.editPresentation === 'multilineText';
  const placeholder = property.default?.toString() || '';

  const validateValue = useCallback((newValue: string): string | null => {
    // Pattern validation
    if (property.pattern) {
      try {
        const regex = new RegExp(property.pattern);
        if (!regex.test(newValue)) {
          return property.patternErrorMessage || 'Invalid format';
        }
      } catch {
        return 'Invalid regex pattern in schema';
      }
    }

    // Min length validation
    if (property.minLength !== undefined && newValue.length < property.minLength) {
      return `Minimum length is ${property.minLength} characters`;
    }

    // Max length validation
    if (property.maxLength !== undefined && newValue.length > property.maxLength) {
      return `Maximum length is ${property.maxLength} characters`;
    }

    return null;
  }, [property]);

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);

    const validationError = validateValue(newValue);
    setError(validationError);

    if (!validationError) {
      onChange(newValue);
    }
  }, [validateValue, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const handleBlur = () => {
    // Validate on blur
    const validationError = validateValue(localValue);
    if (validationError) {
      setError(validationError);
    }
  };

  const isModified = value !== property.default;

  return (
    <SettingControl
      property={property}
      value={value}
      isModified={isModified}
      onReset={onReset}
      error={error || undefined}
    >
      {isMultiline ? (
        <Textarea
          id={property.key}
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${property.key}-error` : undefined}
          className={error ? 'border-destructive' : ''}
          rows={4}
        />
      ) : (
        <Input
          id={property.key}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${property.key}-error` : undefined}
          className={error ? 'border-destructive' : ''}
        />
      )}
    </SettingControl>
  );
};
