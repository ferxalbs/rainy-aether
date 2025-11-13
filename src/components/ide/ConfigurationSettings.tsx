/**
 * Configuration Settings UI Component
 *
 * Main interface for browsing and editing IDE configuration.
 * VS Code-compatible settings UI with search, filters, and categorization.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Settings2, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useConfigurationState,
  configurationActions
} from '@/stores/configurationStore';
import { StringSetting } from '@/components/configuration/StringSetting';
import { NumberSetting } from '@/components/configuration/NumberSetting';
import { BooleanSetting } from '@/components/configuration/BooleanSetting';
import { EnumSetting } from '@/components/configuration/EnumSetting';
import { ArraySetting } from '@/components/configuration/ArraySetting';
import { ObjectSetting } from '@/components/configuration/ObjectSetting';
import type { ResolvedConfigurationProperty } from '@/types/configuration';

export const ConfigurationSettings: React.FC = () => {
  const configState = useConfigurationState();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get categories from properties
  const categories = useMemo(() => {
    const cats = configurationActions.getCategories();
    return Array.from(cats.keys()).sort();
  }, [configState.properties]);

  // Filter properties based on search and filters
  const filteredProperties = useMemo(() => {
    let properties = configState.properties;

    // Category filter
    if (selectedCategory !== 'all') {
      properties = properties.filter(p => p.key.startsWith(selectedCategory + '.'));
    }

    // Modified only filter
    if (showModifiedOnly) {
      properties = properties.filter(p => p.isModified);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      properties = properties.filter(p => {
        const keyMatch = p.key.toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const tagsMatch = p.tags?.some(t => t.toLowerCase().includes(query));
        return keyMatch || descMatch || tagsMatch;
      });
    }

    return properties;
  }, [configState.properties, selectedCategory, showModifiedOnly, searchQuery]);

  // Group filtered properties by category
  const groupedProperties = useMemo(() => {
    const groups = new Map<string, ResolvedConfigurationProperty[]>();

    filteredProperties.forEach(property => {
      const category = property.key.split('.')[0];
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(property);
    });

    return groups;
  }, [filteredProperties]);

  // Handle property value change
  const handlePropertyChange = useCallback(async (property: ResolvedConfigurationProperty, newValue: any) => {
    try {
      await configurationActions.set({
        key: property.key,
        value: newValue,
        scope: 'user' // TODO: Allow selecting scope
      });
    } catch (error: any) {
      console.error('Failed to update configuration:', error);
      // TODO: Show error toast
    }
  }, []);

  // Handle property reset
  const handlePropertyReset = useCallback(async (property: ResolvedConfigurationProperty) => {
    try {
      await configurationActions.reset({
        key: property.key,
        scope: 'user' // TODO: Allow selecting scope
      });
    } catch (error: any) {
      console.error('Failed to reset configuration:', error);
      // TODO: Show error toast
    }
  }, []);

  // Render setting control based on type
  const renderSettingControl = useCallback((property: ResolvedConfigurationProperty) => {
    const value = property.value ?? property.default;

    // Enum type (has enum values)
    if (property.enum && property.enum.length > 0) {
      return (
        <EnumSetting
          key={property.key}
          property={property}
          value={value}
          onChange={(newValue) => handlePropertyChange(property, newValue)}
          onReset={() => handlePropertyReset(property)}
        />
      );
    }

    // Type-based rendering
    switch (property.type) {
      case 'string':
        return (
          <StringSetting
            key={property.key}
            property={property}
            value={value || ''}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'number':
      case 'integer':
        return (
          <NumberSetting
            key={property.key}
            property={property}
            value={value || 0}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'boolean':
        return (
          <BooleanSetting
            key={property.key}
            property={property}
            value={value || false}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'array':
        return (
          <ArraySetting
            key={property.key}
            property={property}
            value={value || []}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'object':
        return (
          <ObjectSetting
            key={property.key}
            property={property}
            value={value || {}}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      default:
        return (
          <div key={property.key} className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              Unsupported type: {property.type}
            </p>
          </div>
        );
    }
  }, [handlePropertyChange, handlePropertyReset]);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5" />
            <h2 className="font-semibold">Settings</h2>
          </div>

          {/* Modified Only Filter */}
          <div className="flex items-center space-x-2 mb-4 p-3 rounded-lg bg-muted/50">
            <Switch
              id="modified-only"
              checked={showModifiedOnly}
              onCheckedChange={setShowModifiedOnly}
            />
            <Label htmlFor="modified-only" className="text-sm cursor-pointer">
              Modified only
            </Label>
          </div>

          <Separator className="my-4" />

          {/* Category List */}
          <div className="space-y-1">
            <Button
              variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory('all')}
            >
              All Settings
              <Badge variant="outline" className="ml-auto">
                {configState.properties.length}
              </Badge>
            </Button>

            {categories.map(category => {
              const categoryProps = groupedProperties.get(category) || [];
              const count = categoryProps.length;

              if (count === 0 && selectedCategory !== 'all') return null;

              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'secondary' : 'ghost'}
                  className="w-full justify-start capitalize"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                  <Badge variant="outline" className="ml-auto">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Result Count */}
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredProperties.length} result{filteredProperties.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Settings List */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {configState.isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading settings...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No settings found matching your search'
                    : 'No settings to display'}
                </p>
              </div>
            ) : selectedCategory === 'all' ? (
              // Grouped by category
              Array.from(groupedProperties.entries()).map(([category, properties]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-semibold capitalize sticky top-0 bg-background py-2">
                    {category}
                  </h3>
                  <div className="space-y-4">
                    {properties.map(property => renderSettingControl(property))}
                  </div>
                </div>
              ))
            ) : (
              // Single category
              <div className="space-y-4">
                {filteredProperties.map(property => renderSettingControl(property))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
