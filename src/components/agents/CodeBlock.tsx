import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
    language: string;
    value: string;
    filename?: string;
    className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, filename, className }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("rounded-md overflow-hidden border border-[#27272a] bg-[#1e1e1e] my-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                    {/* Language Icon Placeholder or specific icon based on language */}
                    <span className="text-xs font-medium text-muted-foreground uppercase">{language || 'text'}</span>
                    {filename && (
                        <span className="text-xs text-muted-foreground/60 ml-2">{filename}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-[#3f3f46] text-muted-foreground"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                </div>
            </div>

            {/* Code Content */}
            <div className="relative">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                    }}
                    wrapLines={true}
                    showLineNumbers={true}
                    lineNumberStyle={{ minWidth: '2em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};
