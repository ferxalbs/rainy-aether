import { Theme } from './index';

// Helper to standard Monaco tokens
const commonRules = (colors: {
    comment: string;
    keyword: string;
    string: string;
    number: string;
    function: string;
    class: string;
    variable: string;
}) => [
        { token: 'comment', foreground: colors.comment, fontStyle: 'italic' },
        { token: 'keyword', foreground: colors.keyword, fontStyle: 'bold' },
        { token: 'string', foreground: colors.string },
        { token: 'number', foreground: colors.number },
        { token: 'identifier.function', foreground: colors.function },
        { token: 'type', foreground: colors.class },
        { token: 'class', foreground: colors.class },
        { token: 'variable', foreground: colors.variable },
        { token: 'delimiter', foreground: colors.variable },
        { token: 'operator', foreground: colors.keyword },
    ];

/**
 * CHRISTMAS 2025 (Night)
 * Aesthetic: Deep Pine Green, Festive Accents
 */
export const christmasNightTheme: Theme = {
    name: 'christmas-night',
    mode: 'night',
    displayName: 'Christmas (Night)',
    variables: {
        '--bg-primary': '#0f291e', // Deep Pine Green
        '--bg-secondary': '#0b2017',
        '--bg-tertiary': '#1a3c2f',
        '--bg-sidebar': '#0b2017', // Integrated header/sidebar look
        '--bg-editor': '#0f291e',
        '--bg-status': '#0b2017',
        '--text-primary': '#e2f5ec', // Snowy White/Green
        '--text-secondary': '#a8c7bb',
        '--text-editor': '#e2f5ec',
        '--accent-primary': '#ff3b30', // Christmas Red
        '--accent-secondary': '#ffcc00', // Gold
        '--border-color': '#1a3c2f',
        '--diff-added': '#32cd32',
        '--diff-removed': '#ff3b30',
        '--diff-hunk': '#ffcc00',

        // Status Bar
        '--statusBarItem-activeBackground': '#ffffff20',
        '--statusBarItem-hoverBackground': '#ffffff10',
        '--statusBarItem-errorForeground': '#ffffff',
        '--statusBarItem-errorBackground': '#d32f2f',
        '--statusBarItem-warningForeground': '#000000',
        '--statusBarItem-warningBackground': '#ffcc00',
        '--statusBarItem-prominentBackground': '#2e8b57', // Sea Green
        '--statusBarItem-remoteBackground': '#d32f2f',
    },
    monacoRules: commonRules({
        comment: '758a7e',
        keyword: 'ff3b30', // Red keywords
        string: 'ffd700', // Gold strings
        number: 'bb86fc', // Purple ornaments
        function: '32cd32', // Green functions
        class: '66d9ef', // Icy Blue
        variable: 'f8f8f2'
    })
};

/**
 * CHRISTMAS 2025 (Day)
 * Aesthetic: Snowy White, Pine Green & Red Accents
 */
export const christmasDayTheme: Theme = {
    name: 'christmas-day',
    mode: 'day',
    displayName: 'Christmas (Day)',
    variables: {
        '--bg-primary': '#f8fbf9', // Snowy White
        '--bg-secondary': '#eef6f2',
        '--bg-tertiary': '#deede5',
        '--bg-sidebar': '#eef6f2',
        '--bg-editor': '#ffffff',
        '--bg-status': '#deede5',
        '--text-primary': '#0b2017', // Deep Pine Text
        '--text-secondary': '#2e5c4d',
        '--text-editor': '#0b2017',
        '--accent-primary': '#d32f2f', // Christmas Red
        '--accent-secondary': '#228b22', // Forest Green
        '--border-color': '#cce3d8',
        '--diff-added': '#228b22',
        '--diff-removed': '#d32f2f',
        '--diff-hunk': '#ffaa00', // Gold

        // Status Bar
        '--statusBarItem-activeBackground': '#00000010',
        '--statusBarItem-hoverBackground': '#00000005',
        '--statusBarItem-errorForeground': '#ffffff',
        '--statusBarItem-errorBackground': '#d32f2f',
        '--statusBarItem-warningForeground': '#000000',
        '--statusBarItem-warningBackground': '#ffcc00',
        '--statusBarItem-prominentBackground': '#d32f2f',
        '--statusBarItem-remoteBackground': '#228b22',
    },
    monacoRules: commonRules({
        comment: '8faaa0',
        keyword: 'd32f2f', // Red
        string: '228b22', // Green
        number: '9932cc', // Purple
        function: '006400', // Dark Green
        class: '00008b', // Dark Blue
        variable: '0b2017'
    })
};

/**
 * NEW YEAR 2026 (Day)
 * Aesthetic: Light Yellow, Festive, Champagne, Gold
 */
export const newYearDayTheme: Theme = {
    name: 'newyear-day',
    mode: 'day',
    displayName: 'New Year (Day)',
    variables: {
        '--bg-primary': '#fffdf5', // Very Light Champagne/Yellow
        '--bg-secondary': '#fff9e6',
        '--bg-tertiary': '#fff0c2',
        '--bg-sidebar': '#fff9e6',
        '--bg-editor': '#fffdf5',
        '--bg-status': '#fff0c2',
        '--text-primary': '#423605', // Dark Gold/Brown
        '--text-secondary': '#8a760a',
        '--text-editor': '#423605',
        '--accent-primary': '#e6ac00', // Gold
        '--accent-secondary': '#d9534f', // Festive Red pop
        '--border-color': '#ffe699',
        '--diff-added': '#228b22',
        '--diff-removed': '#d32f2f',
        '--diff-hunk': '#e6ac00',

        // Status Bar
        '--statusBarItem-activeBackground': '#00000010',
        '--statusBarItem-hoverBackground': '#00000005',
        '--statusBarItem-errorForeground': '#ffffff',
        '--statusBarItem-errorBackground': '#d32f2f',
        '--statusBarItem-warningForeground': '#423605',
        '--statusBarItem-warningBackground': '#ffcc00',
        '--statusBarItem-prominentBackground': '#e6ac00',
        '--statusBarItem-remoteBackground': '#d9534f',
    },
    monacoRules: commonRules({
        comment: 'aa9955',
        keyword: 'd9534f', // Festive Red
        string: '008000', // Green
        number: '800080', // Purple (Confetti)
        function: 'e6ac00', // Gold
        class: '0000ff', // Blue (Confetti)
        variable: '423605'
    })
};

/**
 * NEW YEAR 2026 (Night)
 * Aesthetic: Dark, Gold, Fireworks, Celebration
 */
export const newYearNightTheme: Theme = {
    name: 'newyear-night',
    mode: 'night',
    displayName: 'New Year (Night)',
    variables: {
        '--bg-primary': '#1a1810', // Dark Gold/Black
        '--bg-secondary': '#262214',
        '--bg-tertiary': '#332d19',
        '--bg-sidebar': '#1a1810',
        '--bg-editor': '#262214',
        '--bg-status': '#1a1810',
        '--text-primary': '#f7eeb0', // Pale Gold
        '--text-secondary': '#d4c275',
        '--text-editor': '#f7eeb0',
        '--accent-primary': '#ffcc00', // Bright Gold
        '--accent-secondary': '#ff0055', // Firework Red
        '--border-color': '#332d19',
        '--diff-added': '#32cd32',
        '--diff-removed': '#ff0055',
        '--diff-hunk': '#ffcc00',

        // Status Bar
        '--statusBarItem-activeBackground': '#ffffff20',
        '--statusBarItem-hoverBackground': '#ffffff10',
        '--statusBarItem-errorForeground': '#ffffff',
        '--statusBarItem-errorBackground': '#ff0055',
        '--statusBarItem-warningForeground': '#000000',
        '--statusBarItem-warningBackground': '#ffcc00',
        '--statusBarItem-prominentBackground': '#ffcc00',
        '--statusBarItem-remoteBackground': '#00aaff', // Firework Blue
    },
    monacoRules: commonRules({
        comment: '7d7452',
        keyword: 'ff0055', // Red
        string: 'ffcc00', // Gold
        number: '00aaff', // Cyan
        function: '32cd32', // Green
        class: 'aa88ff', // Purple
        variable: 'f7eeb0'
    })
};

/**
 * RAINY AETHER (Day)
 * Aesthetic: Icy Blue, White, Fresh, "Comet" Light
 */
export const rainyAetherDayTheme: Theme = {
    name: 'rainyaether-day',
    mode: 'day',
    displayName: 'Rainy Aether (Day)',
    variables: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f0f4f8',
        '--bg-tertiary': '#e1e8ed',
        '--bg-sidebar': '#f0f4f8',
        '--bg-editor': '#ffffff',
        '--bg-status': '#e1e8ed',
        '--text-primary': '#102a43', // Deep Navy
        '--text-secondary': '#486581',
        '--text-editor': '#102a43',
        '--accent-primary': '#334e68', // Steel Blue
        '--accent-secondary': '#627d98',
        '--border-color': '#bcccdc',
        '--diff-added': '#107c10',
        '--diff-removed': '#d13438',
        '--diff-hunk': '#334e68',

        // Status Bar
        '--statusBarItem-activeBackground': '#00000010',
        '--statusBarItem-hoverBackground': '#00000005',
        '--statusBarItem-errorForeground': '#ffffff',
        '--statusBarItem-errorBackground': '#d13438',
        '--statusBarItem-warningForeground': '#102a43',
        '--statusBarItem-warningBackground': '#ffcb00',
        '--statusBarItem-prominentBackground': '#334e68',
        '--statusBarItem-remoteBackground': '#0078d4',
    },
    monacoRules: commonRules({
        comment: '829ab1',
        keyword: '0078d4', // Blue
        string: '008000', // Green
        number: 'd13438', // Red
        function: '6f42c1', // Purple
        class: '005a9e', // Dark Blue
        variable: '102a43'
    })
};

/**
 * RAINY AETHER (Night)
 * Aesthetic: Dark, Neon Blue, Deep Purple, "Comet" Dark
 */
export const rainyAetherNightTheme: Theme = {
    name: 'rainyaether-night',
    mode: 'night',
    displayName: 'Rainy Aether (Night)',
    variables: {
        '--bg-primary': '#0b0c15',
        '--bg-secondary': '#131422',
        '--bg-tertiary': '#1c1e33',
        '--bg-sidebar': '#0b0c15',
        '--bg-editor': '#131422',
        '--bg-status': '#0b0c15',
        '--text-primary': '#e0e6ed',
        '--text-secondary': '#7f8ea3',
        '--text-editor': '#e0e6ed',
        '--accent-primary': '#00f2ff', // Neon Cyan
        '--accent-secondary': '#5d3fd3', // Deep Purple
        '--border-color': '#1c1e33',
        '--diff-added': '#00ff9d',
        '--diff-removed': '#ff0055',
        '--diff-hunk': '#5d3fd3',

        // Status Bar
        '--statusBarItem-activeBackground': '#ffffff20',
        '--statusBarItem-hoverBackground': '#ffffff10',
        '--statusBarItem-errorForeground': '#ffffff',
        '--statusBarItem-errorBackground': '#ff0055',
        '--statusBarItem-warningForeground': '#ffffff',
        '--statusBarItem-warningBackground': '#ffaa00',
        '--statusBarItem-prominentBackground': '#5d3fd3',
        '--statusBarItem-remoteBackground': '#00f2ff',
    },
    monacoRules: commonRules({
        comment: '5c677d',
        keyword: 'bb9af7', // Soft Purple
        string: '00f2ff', // Brand Cyan
        number: 'ff9e64', // Orange
        function: '7aa2f7', // Blue
        class: 'c0caf5',
        variable: 'c0caf5'
    })
};
