import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Terminal, FileCode } from 'lucide-react';
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
        <div className={cn(
            "rounded-xl overflow-hidden border border-primary/20 bg-background/10 backdrop-blur-3xl backdrop-saturate-150 my-6 self-stretch shadow-2xl shadow-primary/5 group/code",
            className
        )}>
            {/* Premium Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-white/5">
                <div className="flex items-center gap-4">
                    {/* macOS Style Controls */}
                    <div className="flex gap-1.5 px-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80 shadow-[0_0_8px_rgba(255,95,87,0.3)]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80 shadow-[0_0_8px_rgba(254,188,46,0.3)]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80 shadow-[0_0_8px_rgba(40,200,64,0.3)]"></div>
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-1"></div>

                    <div className="flex items-center gap-2">
                        {language?.toLowerCase() === 'terminal' || language?.toLowerCase() === 'bash' || language?.toLowerCase() === 'sh' ? (
                            <Terminal className="h-3.5 w-3.5 text-primary/60" />
                        ) : (
                            <FileCode className="h-3.5 w-3.5 text-primary/60" />
                        )}
                        <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest font-mono italic">
                            {language || 'text'}
                        </span>
                        {filename && (
                            <span className="text-[10px] text-muted-foreground/40 font-mono ml-1 truncate max-w-[200px]">
                                {filename}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 translate-x-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-primary/20 hover:text-primary transition-all duration-300 opacity-40 group-hover/code:opacity-100"
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <Check className="h-3.5 w-3.5 text-green-400 animate-in zoom-in-50 duration-300" />
                        ) : (
                            <Copy className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Code Content */}
            <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1.25rem 1rem',
                        background: 'transparent',
                        fontSize: '0.85rem',
                        lineHeight: '1.6',
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}
                    wrapLines={true}
                    showLineNumbers={true}
                    lineNumberStyle={{
                        minWidth: '2.5em',
                        paddingRight: '1.25em',
                        color: 'rgba(255,255,255,0.15)',
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        userSelect: 'none'
                    }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};
