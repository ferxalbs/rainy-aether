/**
 * Icon Theme API for Extensions
 *
 * Provides VS Code-compatible API for extensions to register and manage icon themes.
 */

import { iconThemeActions, type IconTheme } from '@/stores/iconThemeStore';

/**
 * Icon Theme Contribution Point
 *
 * Extensions can contribute icon themes via their package.json:
 * ```json
 * {
 *   "contributes": {
 *     "iconThemes": [
 *       {
 *         "id": "material-icon-theme",
 *         "label": "Material Icon Theme",
 *         "path": "./icons/material-icon-theme.json"
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export interface IconThemeContribution {
  id: string;
  label: string;
  path: string;
}

/**
 * Register an icon theme from an extension
 */
export const registerIconTheme = (theme: IconTheme): void => {
  console.log(`[IconThemeAPI] Registering icon theme: ${theme.label} (${theme.id})`);
  iconThemeActions.registerTheme(theme);
};

/**
 * Unregister an icon theme
 */
export const unregisterIconTheme = (themeId: string): void => {
  console.log(`[IconThemeAPI] Unregistering icon theme: ${themeId}`);
  iconThemeActions.unregisterTheme(themeId);
};

/**
 * Set the active icon theme
 */
export const setActiveIconTheme = (themeId: string): void => {
  console.log(`[IconThemeAPI] Setting active icon theme: ${themeId}`);
  iconThemeActions.setActiveTheme(themeId);
};

/**
 * Get all available icon themes
 */
export const getIconThemes = () => {
  return iconThemeActions.getAllThemes();
};

/**
 * Get the currently active icon theme
 */
export const getActiveIconTheme = () => {
  return iconThemeActions.getActiveTheme();
};

/**
 * VS Code-compatible icon theme API
 * Exposed to extensions via the vscode module
 */
export const iconThemeAPI = {
  registerIconTheme,
  unregisterIconTheme,
  setActiveIconTheme,
  getIconThemes,
  getActiveIconTheme,
};
