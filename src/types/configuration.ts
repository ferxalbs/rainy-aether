/**
 * VS Code-compatible Configuration Schema Types
 * Based on VS Code's contributes.configuration schema
 * @see https://code.visualstudio.com/api/references/contribution-points#contributes.configuration
 */

/**
 * Configuration scope determines where a setting can be applied
 */
export enum ConfigurationScope {
  /** Application-level setting (applies globally) */
  Application = 'application',
  /** Machine-level setting (applies to the machine) */
  Machine = 'machine',
  /** Machine-overridable setting */
  MachineOverridable = 'machine-overridable',
  /** Window-level setting (applies to the IDE window) */
  Window = 'window',
  /** Resource-level setting (applies to workspace/files) */
  Resource = 'resource',
  /** Language-specific setting */
  LanguageOverridable = 'language-overridable'
}

/**
 * Configuration property types supported by VS Code
 */
export type ConfigurationPropertyType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object';

/**
 * Configuration property definition
 * Maps to a single setting key in package.json
 */
export interface ConfigurationProperty {
  /** Property type (string, number, boolean, etc.) */
  type: ConfigurationPropertyType | ConfigurationPropertyType[];

  /** Default value for the property */
  default?: any;

  /** Human-readable description of the property */
  description?: string;

  /** Markdown description (supports rich formatting) */
  markdownDescription?: string;

  /** Deprecation message (if property is deprecated) */
  deprecationMessage?: string;

  /** Markdown deprecation message */
  markdownDeprecationMessage?: string;

  /** Configuration scope */
  scope?: ConfigurationScope;

  /** Enum values (for dropdown selection) */
  enum?: any[];

  /** Human-readable descriptions for enum values */
  enumDescriptions?: string[];

  /** Markdown descriptions for enum values */
  markdownEnumDescriptions?: string[];

  /** Minimum value (for numbers) */
  minimum?: number;

  /** Maximum value (for numbers) */
  maximum?: number;

  /** Step value (for number inputs) */
  multipleOf?: number;

  /** Pattern for string validation (regex) */
  pattern?: string;

  /** Pattern error message */
  patternErrorMessage?: string;

  /** Min length (for strings) */
  minLength?: number;

  /** Max length (for strings) */
  maxLength?: number;

  /** Min items (for arrays) */
  minItems?: number;

  /** Max items (for arrays) */
  maxItems?: number;

  /** Item type for arrays */
  items?: ConfigurationProperty;

  /** Unique items constraint (for arrays) */
  uniqueItems?: boolean;

  /** Properties for object type */
  properties?: Record<string, ConfigurationProperty>;

  /** Additional properties allowed (for objects) */
  additionalProperties?: boolean | ConfigurationProperty;

  /** Order hint for UI display */
  order?: number;

  /** Tags for categorization and search */
  tags?: string[];

  /** Whether the setting is ignored in synchronization */
  ignoreSync?: boolean;

  /** Whether the setting requires restart */
  requiresRestart?: boolean;

  /** Edit presentation (singlelineText, multilineText) */
  editPresentation?: 'singlelineText' | 'multilineText';
}

/**
 * Configuration section (group of related settings)
 */
export interface ConfigurationSection {
  /** Unique ID for the section */
  id: string;

  /** Section title */
  title: string;

  /** Section description */
  description?: string;

  /** Order hint for UI display */
  order?: number;

  /** Properties in this section */
  properties: Record<string, ConfigurationProperty>;
}

/**
 * Configuration contribution from an extension
 * Maps to contributes.configuration in package.json
 */
export interface ConfigurationContribution {
  /** Configuration title */
  title?: string;

  /** Configuration properties */
  properties: Record<string, ConfigurationProperty>;
}

/**
 * Complete extension manifest configuration
 */
export interface ExtensionConfiguration {
  /** Extension ID (publisher.name) */
  extensionId: string;

  /** Extension display name */
  extensionName: string;

  /** Is this a built-in (core) configuration? */
  isBuiltIn: boolean;

  /** Configuration contributions */
  configuration: ConfigurationContribution | ConfigurationContribution[];
}

/**
 * Resolved configuration property with metadata
 * Enhanced version of ConfigurationProperty with runtime info
 */
export interface ResolvedConfigurationProperty extends ConfigurationProperty {
  /** Full configuration key (e.g., "editor.fontSize") */
  key: string;

  /** Extension that contributed this property */
  extensionId: string;

  /** Extension display name */
  extensionName: string;

  /** Is this a built-in property? */
  isBuiltIn: boolean;

  /** Current effective value (may differ from default) */
  value?: any;

  /** Is the current value modified from default? */
  isModified: boolean;

  /** Category/group for UI organization */
  category?: string;
}

/**
 * Configuration value with scope information
 */
export interface ScopedConfigurationValue {
  /** Configuration key */
  key: string;

  /** Value at this scope */
  value: any;

  /** Scope where this value is defined */
  scope: 'user' | 'workspace' | 'default';

  /** Timestamp when the value was set */
  timestamp?: number;
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  /** Keys that changed */
  changedKeys: string[];

  /** Scope where changes occurred */
  scope: 'user' | 'workspace';

  /** Old values (before change) */
  oldValues: Record<string, any>;

  /** New values (after change) */
  newValues: Record<string, any>;

  /** Timestamp of change */
  timestamp: number;
}

/**
 * Configuration validation error
 */
export interface ConfigurationValidationError {
  /** Configuration key with error */
  key: string;

  /** Error message */
  message: string;

  /** Expected type/format */
  expected?: string;

  /** Actual value that failed validation */
  actual?: any;

  /** Path to the error (for nested objects/arrays) */
  path?: string[];
}

/**
 * Configuration search result
 */
export interface ConfigurationSearchResult {
  /** Configuration property */
  property: ResolvedConfigurationProperty;

  /** Match score (0-1) */
  score: number;

  /** Matched fields (key, description, tags, etc.) */
  matchedFields: string[];

  /** Highlighted key (with search term emphasized) */
  highlightedKey?: string;

  /** Highlighted description */
  highlightedDescription?: string;
}

/**
 * Configuration filter options
 */
export interface ConfigurationFilterOptions {
  /** Search query */
  query?: string;

  /** Filter by extension ID */
  extensionId?: string;

  /** Filter by category */
  category?: string;

  /** Show only modified settings */
  modifiedOnly?: boolean;

  /** Filter by scope */
  scope?: ConfigurationScope;

  /** Filter by tags */
  tags?: string[];
}

/**
 * Configuration update request
 */
export interface ConfigurationUpdateRequest {
  /** Configuration key to update */
  key: string;

  /** New value */
  value: any;

  /** Target scope (user or workspace) */
  scope: 'user' | 'workspace';

  /** Optional comment for the change */
  comment?: string;
}

/**
 * Configuration reset request
 */
export interface ConfigurationResetRequest {
  /** Configuration key to reset */
  key: string;

  /** Scope to reset from */
  scope: 'user' | 'workspace';
}

/**
 * Configuration export/import format
 */
export interface ConfigurationExport {
  /** Version of the export format */
  version: string;

  /** Timestamp of export */
  timestamp: number;

  /** User-scope configurations */
  user: Record<string, any>;

  /** Workspace-scope configurations (optional) */
  workspace?: Record<string, any>;

  /** Metadata */
  metadata?: {
    /** IDE version */
    ideVersion?: string;
    /** Platform */
    platform?: string;
    /** Exported extensions */
    extensions?: string[];
  };
}
