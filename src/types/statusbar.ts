import type React from 'react';

/**
 * StatusBar entry kind determines visual styling
 */
export type StatusBarEntryKind =
  | 'standard'   // Default appearance
  | 'warning'    // Yellow background
  | 'error'      // Red background
  | 'prominent'  // Highlighted
  | 'remote'     // Remote development indicator
  | 'offline';   // Offline mode indicator

export const StatusBarEntryKinds: StatusBarEntryKind[] = [
  'standard',
  'warning',
  'error',
  'prominent',
  'remote',
  'offline',
];

/**
 * StatusBar entry interface
 */
export interface IStatusBarEntry {
  id: string;
  name: string; // Accessible name for screen readers
  text: string; // Display text (supports icons)
  ariaLabel?: string; // ARIA label
  tooltip?: string | React.ReactNode; // Hover tooltip
  command?: string; // Command to execute on click
  onClick?: () => void; // Click handler
  kind?: StatusBarEntryKind; // Visual styling
  backgroundColor?: string; // Custom background (overrides kind)
  color?: string; // Custom foreground (overrides kind)
  order: number; // Display order
  position: 'left' | 'right'; // Alignment
}

/**
 * StatusBar item component props
 */
export interface IStatusBarItemProps {
  entry: IStatusBarEntry;
  onClick?: (entry: IStatusBarEntry) => void;
}
