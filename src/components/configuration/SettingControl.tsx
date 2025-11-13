/**
 * Base Setting Control Component
 *
 * Provides the layout and common functionality for all setting types.
 * Displays label, description, control, reset button, and validation errors.
 */

import React from 'react';
import { RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export interface SettingControlProps {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Modified indicator */
  isModified: boolean;

  /** Control component to render */
  children: React.ReactNode;

  /** Called when reset button clicked */
  onReset?: () => void;

  /** Validation error message */
  error?: string;

  /** Additional CSS classes */
  className?: string;
}

export const SettingControl: React.FC<SettingControlProps> = ({
  property,
  isModified,
  children,
  onReset,
  error,
  className
}) => {
  const description = property.markdownDescription || property.description || '';
  const isDeprecated = !!property.deprecationMessage || !!property.markdownDeprecationMessage;
  const deprecationMessage = property.markdownDeprecationMessage || property.deprecationMessage;

  return (
    <div className={cn('space-y-3 p-4 rounded-lg border border-border bg-card', className)}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Label
              htmlFor={property.key}
              className="font-mono text-sm font-medium text-foreground truncate"
              title={property.key}
            >
              {property.key}
            </Label>

            {isModified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Modified from default</p>
                    <p className="text-xs text-muted-foreground">
                      Default: {JSON.stringify(property.default)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {isDeprecated && (
              <Badge variant="destructive" className="text-xs">
                Deprecated
              </Badge>
            )}

            {property.requiresRestart && (
              <Badge variant="outline" className="text-xs">
                Requires Restart
              </Badge>
            )}
          </div>

          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {isModified && onReset && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReset}
                  aria-label="Reset to default"
                  className="flex-shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to default value</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Deprecation Warning */}
      {isDeprecated && deprecationMessage && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <Info className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{deprecationMessage}</p>
        </div>
      )}

      {/* Control Component */}
      <div className="space-y-2">
        {children}
      </div>

      {/* Validation Error */}
      {error && (
        <div
          role="alert"
          className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20"
        >
          {error}
        </div>
      )}

      {/* Metadata Row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Scope: {property.scope || 'User'}</span>
        <span>•</span>
        <span>Default: {JSON.stringify(property.default)}</span>
        {property.isBuiltIn && (
          <>
            <span>•</span>
            <span>Built-in</span>
          </>
        )}
      </div>
    </div>
  );
};
