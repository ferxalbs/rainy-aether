/**
 * Extensions Manifest Types
 *
 * VS Code-compatible extensions.json manifest structure
 * Tracks all installed extensions with their metadata
 */

/**
 * Extension identifier structure
 */
export interface ExtensionIdentifier {
  /** Full ID (e.g., "PKief.material-icon-theme") */
  id: string;
  /** Unique UUID (optional, for compatibility) */
  uuid?: string;
}

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
  /** Timestamp when extension was installed (milliseconds since epoch) */
  installed_timestamp?: number;
  /** Whether the extension is enabled */
  is_enabled: boolean;
  /** Whether the extension is pre-installed/built-in */
  is_builtin?: boolean;
  /** Whether the extension is a system extension */
  is_system?: boolean;
  /** Last updated timestamp (milliseconds since epoch) */
  updated_timestamp?: number;
  /** Pre-release version flag */
  pre_release_version?: boolean;
  /** Extension display name */
  display_name?: string;
  /** Extension description */
  description?: string;
}

/**
 * Individual extension entry in the manifest
 */
export interface ExtensionManifestEntry {
  /** Extension identifier (publisher.name) */
  identifier: ExtensionIdentifier;
  /** Version of the extension */
  version: string;
  /** Installation path relative to extensions directory */
  relative_path: string;
  /** Extension metadata */
  metadata: ExtensionMetadata;
}

/**
 * VS Code-compatible extensions.json manifest structure
 * Tracks all installed extensions with their metadata
 */
export interface ExtensionsManifest {
  /** List of installed extension entries */
  extensions: ExtensionManifestEntry[];
}
