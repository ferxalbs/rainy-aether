/**
 * VS Code Theme Type Definitions
 *
 * Based on official VS Code theme structure:
 * https://github.com/microsoft/vscode/tree/main/extensions/theme-defaults/themes
 */

/**
 * VS Code theme JSON structure
 */
export interface VSCodeTheme {
  /** Schema reference (optional) */
  $schema?: string;

  /** Theme name */
  name?: string;

  /** Theme type: dark, light, or hc (high contrast) */
  type?: 'dark' | 'light' | 'hc';

  /** Include another theme file as base (e.g., "./dark_vs.json") */
  include?: string;

  /** UI color tokens (200+ available) */
  colors?: Record<string, string>;

  /** Syntax highlighting rules */
  tokenColors?: VSCodeTokenColor[] | string;

  /** Semantic token colors (optional) */
  semanticTokenColors?: Record<string, any>;

  /** Semantic highlighting enabled (optional) */
  semanticHighlighting?: boolean;
}

/**
 * Token color rule for syntax highlighting
 */
export interface VSCodeTokenColor {
  /** Rule name (descriptive, optional) */
  name?: string;

  /** TextMate scope(s) to apply this rule to */
  scope: string | string[];

  /** Visual settings for matched tokens */
  settings: {
    /** Foreground color (hex) */
    foreground?: string;
    /** Background color (hex) */
    background?: string;
    /** Font style: italic, bold, underline, strikethrough */
    fontStyle?: string;
  };
}

/**
 * Theme contribution in package.json
 */
export interface VSCodeThemeContribution {
  /** Display name in theme picker */
  label: string;

  /** Base UI theme: vs (light), vs-dark (dark), or hc-black (high contrast) */
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';

  /** Path to theme JSON file (relative to extension root) */
  path: string;

  /** Optional theme ID (generated if not provided) */
  id?: string;
}

/**
 * VS Code color token categories
 * Based on: https://code.visualstudio.com/api/references/theme-color
 */
export interface VSCodeColorTokens {
  // Editor colors
  'editor.background'?: string;
  'editor.foreground'?: string;
  'editorLineNumber.foreground'?: string;
  'editorCursor.foreground'?: string;
  'editor.selectionBackground'?: string;
  'editor.inactiveSelectionBackground'?: string;
  'editor.selectionHighlightBackground'?: string;
  'editor.wordHighlightBackground'?: string;
  'editor.findMatchBackground'?: string;
  'editor.findMatchHighlightBackground'?: string;

  // Sidebar colors
  'sideBar.background'?: string;
  'sideBar.foreground'?: string;
  'sideBar.border'?: string;
  'sideBarTitle.foreground'?: string;
  'sideBarSectionHeader.background'?: string;
  'sideBarSectionHeader.foreground'?: string;
  'sideBarSectionHeader.border'?: string;

  // Activity Bar colors
  'activityBar.background'?: string;
  'activityBar.foreground'?: string;
  'activityBar.inactiveForeground'?: string;
  'activityBar.border'?: string;
  'activityBarBadge.background'?: string;
  'activityBarBadge.foreground'?: string;

  // Status Bar colors
  'statusBar.background'?: string;
  'statusBar.foreground'?: string;
  'statusBar.border'?: string;
  'statusBar.debuggingBackground'?: string;
  'statusBar.debuggingForeground'?: string;
  'statusBar.noFolderBackground'?: string;
  'statusBarItem.activeBackground'?: string;
  'statusBarItem.hoverBackground'?: string;
  'statusBarItem.remoteBackground'?: string;
  'statusBarItem.remoteForeground'?: string;

  // Panel colors
  'panel.background'?: string;
  'panel.border'?: string;
  'panelTitle.activeBorder'?: string;
  'panelTitle.activeForeground'?: string;
  'panelTitle.inactiveForeground'?: string;

  // Tab colors
  'tab.activeBackground'?: string;
  'tab.activeForeground'?: string;
  'tab.inactiveBackground'?: string;
  'tab.inactiveForeground'?: string;
  'tab.border'?: string;
  'tab.activeBorder'?: string;
  'tab.unfocusedActiveBorder'?: string;
  'tab.activeBorderTop'?: string;

  // Editor Group & Border colors
  'editorGroup.border'?: string;
  'editorGroup.dropBackground'?: string;
  'editorGroupHeader.tabsBackground'?: string;
  'editorGroupHeader.tabsBorder'?: string;
  'editorGroupHeader.noTabsBackground'?: string;

  // Terminal colors
  'terminal.background'?: string;
  'terminal.foreground'?: string;
  'terminal.ansiBlack'?: string;
  'terminal.ansiRed'?: string;
  'terminal.ansiGreen'?: string;
  'terminal.ansiYellow'?: string;
  'terminal.ansiBlue'?: string;
  'terminal.ansiMagenta'?: string;
  'terminal.ansiCyan'?: string;
  'terminal.ansiWhite'?: string;
  'terminal.ansiBrightBlack'?: string;
  'terminal.ansiBrightRed'?: string;
  'terminal.ansiBrightGreen'?: string;
  'terminal.ansiBrightYellow'?: string;
  'terminal.ansiBrightBlue'?: string;
  'terminal.ansiBrightMagenta'?: string;
  'terminal.ansiBrightCyan'?: string;
  'terminal.ansiBrightWhite'?: string;
  'terminal.selectionBackground'?: string;
  'terminalCursor.foreground'?: string;

  // Button colors
  'button.background'?: string;
  'button.foreground'?: string;
  'button.hoverBackground'?: string;

  // Input colors
  'input.background'?: string;
  'input.border'?: string;
  'input.foreground'?: string;
  'input.placeholderForeground'?: string;
  'inputOption.activeBackground'?: string;
  'inputOption.activeBorder'?: string;

  // Dropdown colors
  'dropdown.background'?: string;
  'dropdown.foreground'?: string;
  'dropdown.border'?: string;

  // List colors
  'list.activeSelectionBackground'?: string;
  'list.activeSelectionForeground'?: string;
  'list.inactiveSelectionBackground'?: string;
  'list.inactiveSelectionForeground'?: string;
  'list.hoverBackground'?: string;
  'list.hoverForeground'?: string;
  'list.focusBackground'?: string;
  'list.focusForeground'?: string;
  'list.highlightForeground'?: string;

  // Menu colors
  'menu.background'?: string;
  'menu.foreground'?: string;
  'menu.selectionBackground'?: string;
  'menu.selectionForeground'?: string;
  'menu.separatorBackground'?: string;
  'menu.border'?: string;

  // Title Bar colors
  'titleBar.activeBackground'?: string;
  'titleBar.activeForeground'?: string;
  'titleBar.inactiveBackground'?: string;
  'titleBar.inactiveForeground'?: string;
  'titleBar.border'?: string;

  // Git decoration colors
  'gitDecoration.addedResourceForeground'?: string;
  'gitDecoration.modifiedResourceForeground'?: string;
  'gitDecoration.deletedResourceForeground'?: string;
  'gitDecoration.untrackedResourceForeground'?: string;
  'gitDecoration.ignoredResourceForeground'?: string;
  'gitDecoration.conflictingResourceForeground'?: string;

  // Diff editor colors
  'diffEditor.insertedTextBackground'?: string;
  'diffEditor.insertedTextBorder'?: string;
  'diffEditor.removedTextBackground'?: string;
  'diffEditor.removedTextBorder'?: string;
  'diffEditor.border'?: string;

  // Widget colors
  'widget.shadow'?: string;
  'widget.border'?: string;

  // Badge colors
  'badge.background'?: string;
  'badge.foreground'?: string;

  // Progress bar
  'progressBar.background'?: string;

  // Notification colors
  'notificationCenter.border'?: string;
  'notificationCenterHeader.foreground'?: string;
  'notificationCenterHeader.background'?: string;
  'notificationToast.border'?: string;
  'notifications.foreground'?: string;
  'notifications.background'?: string;
  'notifications.border'?: string;
  'notificationLink.foreground'?: string;

  // Peek view colors
  'peekView.border'?: string;
  'peekViewEditor.background'?: string;
  'peekViewEditor.matchHighlightBackground'?: string;
  'peekViewResult.background'?: string;
  'peekViewResult.fileForeground'?: string;
  'peekViewResult.lineForeground'?: string;
  'peekViewResult.matchHighlightBackground'?: string;
  'peekViewResult.selectionBackground'?: string;
  'peekViewResult.selectionForeground'?: string;
  'peekViewTitle.background'?: string;
  'peekViewTitleDescription.foreground'?: string;
  'peekViewTitleLabel.foreground'?: string;

  // Breadcrumb colors
  'breadcrumb.foreground'?: string;
  'breadcrumb.background'?: string;
  'breadcrumb.focusForeground'?: string;
  'breadcrumb.activeSelectionForeground'?: string;
  'breadcrumbPicker.background'?: string;

  // Scrollbar colors
  'scrollbar.shadow'?: string;
  'scrollbarSlider.background'?: string;
  'scrollbarSlider.hoverBackground'?: string;
  'scrollbarSlider.activeBackground'?: string;

  // Minimap colors
  'minimap.findMatchHighlight'?: string;
  'minimap.selectionHighlight'?: string;
  'minimap.errorHighlight'?: string;
  'minimap.warningHighlight'?: string;
  'minimapGutter.addedBackground'?: string;
  'minimapGutter.modifiedBackground'?: string;
  'minimapGutter.deletedBackground'?: string;

  // Bracket matching
  'editorBracketMatch.background'?: string;
  'editorBracketMatch.border'?: string;

  // Error/Warning/Info colors
  'editorError.foreground'?: string;
  'editorError.border'?: string;
  'editorWarning.foreground'?: string;
  'editorWarning.border'?: string;
  'editorInfo.foreground'?: string;
  'editorInfo.border'?: string;
  'editorHint.foreground'?: string;
  'editorHint.border'?: string;

  // Focus border
  'focusBorder'?: string;

  // Contrast borders
  'contrastActiveBorder'?: string;
  'contrastBorder'?: string;

  // Additional tokens (extensible)
  [key: string]: string | undefined;
}
