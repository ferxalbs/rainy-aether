/**
 * Centralized theme management system for Rainy Coder
 * Provides validation, consistency checks, and theme operations
 */

import { Theme, allThemes, validateThemeConsistency } from '../themes';
import { validateThemeAccessibility, ContrastRatio } from '../themes/themeValidator';
import { ThemeMode } from './themeStore';

export interface ThemeValidationResult {
  isValid: boolean;
  accessibility: {
    isWCAGAACompliant: boolean;
    isWCAGAAACompliant: boolean;
    contrastRatios: ContrastRatio;
    issues: string[];
  };
  consistency: {
    isConsistent: boolean;
    issues: string[];
  };
}

export interface ThemeRecommendation {
  theme: Theme;
  score: number; // 0-100, higher is better
  reasons: string[];
}

/**
 * Validate a single theme comprehensively
 * @param theme - Theme to validate
 * @returns Detailed validation results
 */
export function validateTheme(theme: Theme): ThemeValidationResult {
  const accessibility = validateThemeAccessibility(theme.variables);

  // For consistency validation, we need to find the counterpart theme
  const counterpartName = theme.name.replace(
    theme.mode === 'day' ? '-day' : '-night',
    theme.mode === 'day' ? '-night' : '-day'
  );
  const counterpartTheme = allThemes.find(t => t.name === counterpartName);

  let consistency = { isConsistent: true, issues: [] as string[] };
  if (counterpartTheme) {
    consistency = validateThemeConsistency(theme.variables, counterpartTheme.variables);
  }

  return {
    isValid: accessibility.isWCAGAACompliant && consistency.isConsistent,
    accessibility: {
      isWCAGAACompliant: accessibility.isWCAGAACompliant,
      isWCAGAAACompliant: accessibility.isWCAGAAACompliant,
      contrastRatios: accessibility.contrastRatios,
      issues: accessibility.issues
    },
    consistency
  };
}

/**
 * Validate all themes in the system
 * @returns Map of theme names to validation results
 */
export function validateAllThemes(): Map<string, ThemeValidationResult> {
  const results = new Map<string, ThemeValidationResult>();

  for (const theme of allThemes) {
    results.set(theme.name, validateTheme(theme));
  }

  return results;
}

/**
 * Get themes that pass accessibility standards
 * @param requireAAA - Whether to require WCAG AAA compliance
 * @returns Array of accessible themes
 */
export function getAccessibleThemes(requireAAA = false): Theme[] {
  return allThemes.filter(theme => {
    const validation = validateTheme(theme);
    return requireAAA
      ? validation.accessibility.isWCAGAAACompliant
      : validation.accessibility.isWCAGAACompliant;
  });
}

/**
 * Recommend themes based on user preferences and system state
 * @param preferences - User theme preferences
 * @param systemMode - Current system theme mode
 * @param requireAccessibility - Whether to only recommend accessible themes
 * @returns Array of theme recommendations sorted by score
 */
export function recommendThemes(
  preferences: { mode?: ThemeMode; baseTheme?: string },
  systemMode: 'day' | 'night',
  requireAccessibility = true
): ThemeRecommendation[] {
  const recommendations: ThemeRecommendation[] = [];

  for (const theme of allThemes) {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Validate accessibility
    const validation = validateTheme(theme);
    if (requireAccessibility && !validation.accessibility.isWCAGAACompliant) {
      continue; // Skip inaccessible themes
    }

    // Prefer themes that match user mode preference
    if (preferences.mode === 'system' && theme.mode === systemMode) {
      score += 20;
      reasons.push(`Matches system ${systemMode} mode`);
    } else if (preferences.mode === 'day' && theme.mode === 'day') {
      score += 15;
      reasons.push('Matches day preference');
    } else if (preferences.mode === 'night' && theme.mode === 'night') {
      score += 15;
      reasons.push('Matches night preference');
    }

    // Prefer user's base theme choice
    if (preferences.baseTheme) {
      const themeBase = theme.name.split('-')[0];
      if (themeBase === preferences.baseTheme) {
        score += 25;
        reasons.push(`Preferred ${preferences.baseTheme} theme`);
      }
    }

    // Bonus for AAA compliance
    if (validation.accessibility.isWCAGAAACompliant) {
      score += 10;
      reasons.push('WCAG AAA compliant');
    }

    // Bonus for good contrast ratios
    if (validation.accessibility.contrastRatios.primaryText >= 7.0) {
      score += 5;
      reasons.push('Excellent contrast ratio');
    }

    recommendations.push({
      theme,
      score: Math.min(score, 100), // Cap at 100
      reasons
    });
  }

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get theme statistics for monitoring
 * @returns Statistics about theme accessibility and consistency
 */
export function getThemeStatistics(): {
  totalThemes: number;
  accessibleThemes: number;
  aaaCompliantThemes: number;
  consistencyIssues: number;
  averageContrastRatio: number;
} {
  const validations = validateAllThemes();
  let accessibleCount = 0;
  let aaaCount = 0;
  let consistencyIssues = 0;
  let totalContrastRatio = 0;

  for (const validation of validations.values()) {
    if (validation.accessibility.isWCAGAACompliant) accessibleCount++;
    if (validation.accessibility.isWCAGAAACompliant) aaaCount++;
    if (!validation.consistency.isConsistent) consistencyIssues++;

    totalContrastRatio += validation.accessibility.contrastRatios.primaryText;
  }

  return {
    totalThemes: allThemes.length,
    accessibleThemes: accessibleCount,
    aaaCompliantThemes: aaaCount,
    consistencyIssues,
    averageContrastRatio: totalContrastRatio / allThemes.length
  };
}

/**
 * Find themes with accessibility issues
 * @returns Array of themes with issues and their problems
 */
export function getThemesWithIssues(): Array<{ theme: Theme; issues: string[] }> {
  const issues: Array<{ theme: Theme; issues: string[] }> = [];

  for (const theme of allThemes) {
    const validation = validateTheme(theme);
    const allIssues = [
      ...validation.accessibility.issues,
      ...validation.consistency.issues
    ];

    if (allIssues.length > 0) {
      issues.push({ theme, issues: allIssues });
    }
  }

  return issues;
}

/**
 * Export theme configuration for debugging
 * @param theme - Theme to export
 * @returns Formatted theme configuration
 */
export function exportThemeConfig(theme: Theme): string {
  const validation = validateTheme(theme);

  return `
Theme: ${theme.displayName} (${theme.name})
Mode: ${theme.mode}

Variables:
${Object.entries(theme.variables)
  .map(([key, value]) => `  ${key}: ${value}`)
  .join('\n')}

Accessibility:
  WCAG AA Compliant: ${validation.accessibility.isWCAGAACompliant}
  WCAG AAA Compliant: ${validation.accessibility.isWCAGAAACompliant}
  Primary Text Contrast: ${validation.accessibility.contrastRatios.primaryText.toFixed(2)}:1
  Secondary Text Contrast: ${validation.accessibility.contrastRatios.secondaryText.toFixed(2)}:1
  Editor Text Contrast: ${validation.accessibility.contrastRatios.editorText.toFixed(2)}:1

Issues:
${validation.accessibility.issues.concat(validation.consistency.issues)
  .map(issue => `  - ${issue}`)
  .join('\n') || '  None'}
  `.trim();
}