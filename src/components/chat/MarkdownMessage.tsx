/**
 * MarkdownMessage Component
 *
 * Renders AI agent messages with full markdown support including:
 * - Headers, lists, tables, blockquotes
 * - Inline code and code blocks with syntax highlighting
 * - Links, images, and emphasis
 * - GitHub-flavored markdown (tables, task lists, strikethrough)
 * - Copy-to-clipboard for code blocks
 *
 * @example
 * ```tsx
 * <MarkdownMessage content={`
 *   # Hello World
 *
 *   Here's some \`inline code\` and a code block:
 *
 *   \`\`\`typescript
 *   function greet() {
 *     console.log('Hello!');
 *   }
 *   \`\`\`
 * `} />
 * ```
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/cn';

/**
 * Props for MarkdownMessage component
 */
export interface MarkdownMessageProps {
  /** Markdown content to render */
  content: string;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show copy buttons on code blocks */
  showCopyButtons?: boolean;

  /** Callback when code is inserted at cursor */
  onInsertCode?: (code: string, language: string) => void;

  /** Whether to enable code insertion buttons */
  enableCodeInsertion?: boolean;
}

/**
 * MarkdownMessage component
 */
export function MarkdownMessage({
  content,
  className,
  showCopyButtons = true,
  onInsertCode,
  enableCodeInsertion = false,
}: MarkdownMessageProps) {
  return (
    <div className={cn('markdown-message', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            return !inline && language ? (
              <CodeBlock
                language={language}
                code={codeString}
                showCopyButton={showCopyButtons}
                showInsertButton={enableCodeInsertion}
                onInsert={onInsertCode}
              />
            ) : (
              <code
                className={cn(
                  'inline-code px-1.5 py-0.5 rounded-md text-sm font-mono',
                  'bg-muted border border-border text-foreground'
                )}
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headers
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground border-b border-border pb-2">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold mt-5 mb-3 text-foreground border-b border-border pb-1.5">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">
                {children}
              </h4>
            );
          },
          h5({ children }) {
            return (
              <h5 className="text-sm font-semibold mt-2 mb-1.5 text-foreground">
                {children}
              </h5>
            );
          },
          h6({ children }) {
            return (
              <h6 className="text-sm font-medium mt-2 mb-1.5 text-muted-foreground">
                {children}
              </h6>
            );
          },

          // Paragraphs
          p({ children }) {
            return <p className="mb-4 text-sm text-foreground leading-relaxed">{children}</p>;
          },

          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside mb-4 space-y-1.5 text-sm">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-4 space-y-1.5 text-sm">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-foreground leading-relaxed">{children}</li>;
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-muted/30 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },

          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-border border border-border rounded-md">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-border bg-background">{children}</tbody>;
          },
          tr({ children }) {
            return <tr>{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-4 py-2 text-sm text-foreground">{children}</td>;
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-primary hover:text-primary/80 underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },

          // Horizontal rule
          hr() {
            return <hr className="my-6 border-border" />;
          },

          // Emphasis
          strong({ children }) {
            return <strong className="font-bold text-foreground">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-foreground">{children}</em>;
          },
          del({ children }) {
            return <del className="line-through text-muted-foreground">{children}</del>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
