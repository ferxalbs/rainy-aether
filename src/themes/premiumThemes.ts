
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
        // Additional common scopes
        { token: 'delimiter', foreground: colors.variable },
        { token: 'operator', foreground: colors.keyword },
    ];

/**
 * DRACULA (Official Palette)
 * https://draculatheme.com/contribute
 */
export const draculaTheme: Theme = {
    name: 'dracula-night',
    mode: 'night',
    displayName: 'Dracula (Night)',
    variables: {
        '--bg-primary': '#282A36',
        '--bg-secondary': '#282A36',
        '--bg-tertiary': '#44475A',
        '--bg-sidebar': '#282A36',
        '--bg-editor': '#282A36',
        '--bg-status': '#191A21',
        '--text-primary': '#F8F8F2',
        '--text-secondary': '#6272A4',
        '--text-editor': '#F8F8F2',
        '--accent-primary': '#BD93F9',    // Purple
        '--accent-secondary': '#FF79C6',  // Pink
        '--border-color': '#44475A',
        '--diff-added': '#50FA7B',
        '--diff-removed': '#FF5555',
        '--diff-hunk': '#BD93F9',

        // Status Bar
        '--statusBarItem-activeBackground': '#FFFFFF20',
        '--statusBarItem-hoverBackground': '#FFFFFF10',
        '--statusBarItem-errorForeground': '#F8F8F2',
        '--statusBarItem-errorBackground': '#FF5555',
        '--statusBarItem-warningForeground': '#282A36',
        '--statusBarItem-warningBackground': '#F1FA8C',
        '--statusBarItem-prominentBackground': '#BD93F9',
        '--statusBarItem-remoteBackground': '#50FA7B',
    },
    monacoRules: commonRules({
        comment: '6272A4',
        keyword: 'FF79C6',
        string: 'F1FA8C',
        number: 'BD93F9',
        function: '50FA7B',
        class: '8BE9FD',
        variable: 'F8F8F2'
    })
};

/**
 * DRACULA PRO (Light/Day Variant - Alucard-inspired)
 */
export const draculaDayTheme: Theme = {
    name: 'dracula-day',
    mode: 'day',
    displayName: 'Dracula (Day)',
    variables: {
        '--bg-primary': '#F8F8F2',
        '--bg-secondary': '#EAEAE0',
        '--bg-tertiary': '#DCDCDC',
        '--bg-sidebar': '#F8F8F2',
        '--bg-editor': '#FFFFFF',
        '--bg-status': '#EAEAE0',
        '--text-primary': '#282A36',
        '--text-secondary': '#6272A4',
        '--text-editor': '#282A36',
        '--accent-primary': '#BD93F9',
        '--accent-secondary': '#FF79C6',
        '--border-color': '#DCDCDC',
        '--diff-added': '#50FA7B',
        '--diff-removed': '#FF5555',
        '--diff-hunk': '#BD93F9',

        // Status Bar
        '--statusBarItem-activeBackground': '#00000020',
        '--statusBarItem-hoverBackground': '#00000010',
        '--statusBarItem-errorForeground': '#FFFFFF',
        '--statusBarItem-errorBackground': '#FF5555',
        '--statusBarItem-warningForeground': '#282A36',
        '--statusBarItem-warningBackground': '#F1FA8C',
        '--statusBarItem-prominentBackground': '#BD93F9',
        '--statusBarItem-remoteBackground': '#50FA7B',
    },
    monacoRules: commonRules({
        comment: '6272A4',
        keyword: 'FF79C6',
        string: 'B38800', // Darker yellow for readability on light
        number: '7D50A8', // Darker purple
        function: '008500', // Darker green
        class: '00758F', // Darker cyan
        variable: '282A36'
    })
};

/**
 * ONE DARK PRO (Official Palette)
 */
export const oneDarkProTheme: Theme = {
    name: 'onedark-night',
    mode: 'night',
    displayName: 'One Dark Pro (Night)',
    variables: {
        '--bg-primary': '#282C34',
        '--bg-secondary': '#21252B',
        '--bg-tertiary': '#2C313A',
        '--bg-sidebar': '#21252B',
        '--bg-editor': '#282C34',
        '--bg-status': '#21252B',
        '--text-primary': '#ABB2BF',
        '--text-secondary': '#5C6370',
        '--text-editor': '#ABB2BF',
        '--accent-primary': '#61AFEF',
        '--accent-secondary': '#C678DD',
        '--border-color': '#181A1F',
        '--diff-added': '#98C379',
        '--diff-removed': '#E06C75',
        '--diff-hunk': '#61AFEF',

        // Status Bar
        '--statusBarItem-activeBackground': '#FFFFFF20',
        '--statusBarItem-hoverBackground': '#FFFFFF10',
        '--statusBarItem-errorForeground': '#FFFFFF',
        '--statusBarItem-errorBackground': '#E06C75',
        '--statusBarItem-warningForeground': '#282C34',
        '--statusBarItem-warningBackground': '#E5C07B',
        '--statusBarItem-prominentBackground': '#61AFEF',
        '--statusBarItem-remoteBackground': '#98C379',
    },
    monacoRules: commonRules({
        comment: '5C6370',
        keyword: 'C678DD',
        string: '98C379',
        number: 'D19A66',
        function: '61AFEF',
        class: 'E5C07B',
        variable: 'E06C75'
    })
};

/**
 * ONE LIGHT PRO (Light Variant)
 */
export const oneLightProTheme: Theme = {
    name: 'onedark-day',
    mode: 'day',
    displayName: 'One Dark Pro (Day)',
    variables: {
        '--bg-primary': '#FAFAFA',
        '--bg-secondary': '#F0F0F1',
        '--bg-tertiary': '#DBDBDC',
        '--bg-sidebar': '#FAFAFA',
        '--bg-editor': '#FAFAFA',
        '--bg-status': '#F0F0F1',
        '--text-primary': '#383A42',
        '--text-secondary': '#A0A1A7',
        '--text-editor': '#383A42',
        '--accent-primary': '#4078F2',
        '--accent-secondary': '#A626A4',
        '--border-color': '#E5E5E6',
        '--diff-added': '#50A14F',
        '--diff-removed': '#E45649',
        '--diff-hunk': '#4078F2',

        // Status Bar
        '--statusBarItem-activeBackground': '#00000015',
        '--statusBarItem-hoverBackground': '#00000010',
        '--statusBarItem-errorForeground': '#FFFFFF',
        '--statusBarItem-errorBackground': '#E45649',
        '--statusBarItem-warningForeground': '#383A42',
        '--statusBarItem-warningBackground': '#C18401',
        '--statusBarItem-prominentBackground': '#4078F2',
        '--statusBarItem-remoteBackground': '#50A14F',
    },
    monacoRules: commonRules({
        comment: 'A0A1A7',
        keyword: 'A626A4',
        string: '50A14F',
        number: '986801',
        function: '4078F2',
        class: 'C18401',
        variable: 'E45649'
    })
};

/**
 * GITHUB DARK
 */
export const githubDarkTheme: Theme = {
    name: 'github-night',
    mode: 'night',
    displayName: 'GitHub Dark',
    variables: {
        '--bg-primary': '#0D1117',
        '--bg-secondary': '#010409',
        '--bg-tertiary': '#161B22',
        '--bg-sidebar': '#010409',
        '--bg-editor': '#0D1117',
        '--bg-status': '#0D1117',
        '--text-primary': '#C9D1D9',
        '--text-secondary': '#8B949E',
        '--text-editor': '#C9D1D9',
        '--accent-primary': '#58A6FF',
        '--accent-secondary': '#3FB950',
        '--border-color': '#30363D',
        '--diff-added': '#3FB950',
        '--diff-removed': '#F85149',
        '--diff-hunk': '#58A6FF',

        // Status Bar
        '--statusBarItem-activeBackground': '#C9D1D920',
        '--statusBarItem-hoverBackground': '#C9D1D910',
        '--statusBarItem-errorForeground': '#F85149',
        '--statusBarItem-errorBackground': '#300E0E', // Subtle error bg
        '--statusBarItem-warningForeground': '#D29922',
        '--statusBarItem-warningBackground': '#302008',
        '--statusBarItem-prominentBackground': '#1F6FEB',
        '--statusBarItem-remoteBackground': '#238636',
    },
    monacoRules: commonRules({
        comment: '8B949E',
        keyword: 'FF7B72',
        string: 'A5D6FF',
        number: '79C0FF',
        function: 'D2A8FF',
        class: '79C0FF',
        variable: '79C0FF'
    })
};

/**
 * GITHUB LIGHT
 */
export const githubLightTheme: Theme = {
    name: 'github-day',
    mode: 'day',
    displayName: 'GitHub Light',
    variables: {
        '--bg-primary': '#FFFFFF',
        '--bg-secondary': '#F6F8FA',
        '--bg-tertiary': '#EAEAEB',
        '--bg-sidebar': '#F6F8FA',
        '--bg-editor': '#FFFFFF',
        '--bg-status': '#FFFFFF',
        '--text-primary': '#24292F',
        '--text-secondary': '#57606A',
        '--text-editor': '#24292F',
        '--accent-primary': '#0969DA',
        '--accent-secondary': '#1A7F37',
        '--border-color': '#D0D7DE',
        '--diff-added': '#1A7F37',
        '--diff-removed': '#CF222E',
        '--diff-hunk': '#0969DA',

        // Status Bar
        '--statusBarItem-activeBackground': '#00000015',
        '--statusBarItem-hoverBackground': '#00000010',
        '--statusBarItem-errorForeground': '#CF222E',
        '--statusBarItem-errorBackground': '#FFEBE9',
        '--statusBarItem-warningForeground': '#9A6700',
        '--statusBarItem-warningBackground': '#FFF8C5',
        '--statusBarItem-prominentBackground': '#0969DA',
        '--statusBarItem-remoteBackground': '#1A7F37',
    },
    monacoRules: commonRules({
        comment: '6E7781',
        keyword: 'CF222E',
        string: '0A3069',
        number: '0550AE',
        function: '8250DF',
        class: '0550AE',
        variable: '0550AE'
    })
};
