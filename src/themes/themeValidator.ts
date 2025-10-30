/**
 * Theme validation utilities for Rainy Coder
 * Ensures WCAG compliance and consistent color usage
 */

export interface ContrastRatio {
  primaryText: number;
  secondaryText: number;
  editorText: number;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex color to relative luminance
 * @param hex - Hex color string
 * @returns Relative luminance (0-1)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB array
 * @param hex - Hex color string
 * @returns RGB array or null if invalid
 */
function hexToRgb(hex: string): number[] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns True if compliant
 */
export function isWCAGAACompliant(ratio: number, isLargeText = false): boolean {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns True if compliant
 */
export function isWCAGAAACompliant(ratio: number, isLargeText = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Validate theme colors for accessibility compliance
 * @param variables - Theme CSS variables
 * @returns Validation result with contrast ratios and compliance status
 */
export function validateThemeAccessibility(variables: Record<string, string>): {
  contrastRatios: ContrastRatio;
  isWCAGAACompliant: boolean;
  isWCAGAAACompliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const bgPrimary = variables['--bg-primary'];
  const bgEditor = variables['--bg-editor'];
  const textPrimary = variables['--text-primary'];
  const textSecondary = variables['--text-secondary'];
  const textEditor = variables['--text-editor'];

  if (!bgPrimary || !textPrimary || !bgEditor || !textEditor) {
    issues.push('Missing required color variables');
    return {
      contrastRatios: { primaryText: 0, secondaryText: 0, editorText: 0 },
      isWCAGAACompliant: false,
      isWCAGAAACompliant: false,
      issues
    };
  }

  const primaryRatio = calculateContrastRatio(textPrimary, bgPrimary);
  const secondaryRatio = calculateContrastRatio(textSecondary || textPrimary, bgPrimary);
  const editorRatio = calculateContrastRatio(textEditor, bgEditor);

  const contrastRatios: ContrastRatio = {
    primaryText: primaryRatio,
    secondaryText: secondaryRatio,
    editorText: editorRatio
  };

  // Check primary text contrast
  if (!isWCAGAACompliant(primaryRatio)) {
    issues.push(`Primary text contrast ratio (${primaryRatio.toFixed(2)}) fails WCAG AA (requires ≥4.5)`);
  }

  // Check secondary text contrast (more lenient for secondary text)
  if (secondaryRatio < 3.0) {
    issues.push(`Secondary text contrast ratio (${secondaryRatio.toFixed(2)}) is too low (recommended ≥3.0)`);
  }

  // Check editor text contrast
  if (!isWCAGAACompliant(editorRatio)) {
    issues.push(`Editor text contrast ratio (${editorRatio.toFixed(2)}) fails WCAG AA (requires ≥4.5)`);
  }

  const aaCompliant = issues.length === 0;
  const aaaCompliant = aaCompliant && isWCAGAAACompliant(primaryRatio) && isWCAGAAACompliant(editorRatio);

  return {
    contrastRatios,
    isWCAGAACompliant: aaCompliant,
    isWCAGAAACompliant: aaaCompliant,
    issues
  };
}

/**
 * Validate theme consistency across day/night variants
 * @param dayTheme - Day theme variables
 * @param nightTheme - Night theme variables
 * @returns Consistency validation results
 */
export function validateThemeConsistency(
  dayTheme: Record<string, string>,
  nightTheme: Record<string, string>
): {
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const requiredVars = [
    '--bg-primary', '--bg-secondary', '--bg-tertiary',
    '--text-primary', '--text-secondary', '--text-editor',
    '--accent-primary', '--accent-secondary', '--border-color'
  ];

  // Check that both themes have all required variables
  for (const varName of requiredVars) {
    if (!dayTheme[varName]) {
      issues.push(`Day theme missing variable: ${varName}`);
    }
    if (!nightTheme[varName]) {
      issues.push(`Night theme missing variable: ${varName}`);
    }
  }

  // Check that editor backgrounds are appropriately different
  const dayEditorBg = dayTheme['--bg-editor'];
  const nightEditorBg = nightTheme['--bg-editor'];

  if (dayEditorBg && nightEditorBg) {
    const dayLuminance = getLuminance(dayEditorBg);
    const nightLuminance = getLuminance(nightEditorBg);

    // Day theme should generally be lighter than night theme
    if (dayLuminance <= nightLuminance) {
      issues.push('Day theme editor background should be lighter than night theme');
    }
  }

  return {
    isConsistent: issues.length === 0,
    issues
  };
}