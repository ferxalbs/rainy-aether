/**
 * Boolean Setting Component
 *
 * Renders a switch for boolean-type configuration properties.
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingControl } from './SettingControl';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface BooleanSettingProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Current value */
  value: boolean;

  /** Called when value changes */
  onChange: (value: boolean) => void;

  /** Called when reset button clicked */
  onReset?: () => void;
}

export const BooleanSetting: React.FC<BooleanSettingProps> = ({
  property,
  value,
  onChange,
  onReset
}) => {
  const isModified = value !== property.default;

  return (
    <SettingControl
      property={property}
      isModified={isModified}
      onReset={onReset}
    >
      <div className="flex items-center space-x-3">
        <Switch
          id={property.key}
          checked={value}
          onCheckedChange={onChange}
          aria-label={property.description || property.key}
        />
        <Label
          htmlFor={property.key}
          className="text-sm font-normal cursor-pointer"
        >
          {value ? 'Enabled' : 'Disabled'}
        </Label>
      </div>
    </SettingControl>
  );
};
