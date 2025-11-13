/**
 * Enum Setting Component
 *
 * Renders a select dropdown for enum-type configuration properties.
 */

import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingControl } from './SettingControl';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface EnumSettingProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Current value */
  value: string | number;

  /** Called when value changes */
  onChange: (value: string | number) => void;

  /** Called when reset button clicked */
  onReset?: () => void;
}

export const EnumSetting: React.FC<EnumSettingProps> = ({
  property,
  value,
  onChange,
  onReset
}) => {
  const enumValues = property.enum || [];
  const enumDescriptions = property.enumDescriptions || property.markdownEnumDescriptions || [];

  const isModified = value !== property.default;

  const handleValueChange = (newValue: string) => {
    // Try to parse as number if original enum values are numbers
    const firstEnumValue = enumValues[0];
    if (typeof firstEnumValue === 'number') {
      onChange(parseFloat(newValue));
    } else {
      onChange(newValue);
    }
  };

  return (
    <SettingControl
      property={property}
      value={value}
      isModified={isModified}
      onReset={onReset}
    >
      <Select value={value.toString()} onValueChange={handleValueChange}>
        <SelectTrigger
          id={property.key}
          className="w-full"
          aria-label={property.description || property.key}
        >
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {enumValues.map((enumValue, index) => {
              const enumValueStr = enumValue.toString();
              const description = enumDescriptions[index];

              return (
                <SelectItem key={enumValueStr} value={enumValueStr}>
                  <div className="flex flex-col">
                    <span className="font-medium">{enumValueStr}</span>
                    {description && (
                      <span className="text-xs text-muted-foreground">{description}</span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SettingControl>
  );
};
