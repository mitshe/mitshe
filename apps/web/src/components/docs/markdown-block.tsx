import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBlockProps {
  content: string;
}

/**
 * Simple markdown renderer for nested content (inside examples, callouts, etc.)
 */
export function MarkdownBlock({ content }: MarkdownBlockProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-3 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground">
                {children}
              </code>
            );
          }
          return <code className="text-zinc-100 text-xs">{children}</code>;
        },
        a: ({ href, children }) => (
          <Link
            href={href || "#"}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </Link>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto rounded-lg border my-3">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50 border-b">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-medium">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 border-t">{children}</td>
        ),
        pre: ({ children }) => (
          <div className="group relative my-3">
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 dark:bg-zinc-900 p-4 text-sm border border-zinc-800">
              {children}
            </pre>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
