"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { parseContent } from "@/lib/docs/parser";
import { Callout } from "./callout";
import { StepsBlock } from "./steps";
import { CardsBlock } from "./cards";
import { DiagramBlock } from "./diagram";
import { ExampleBlock } from "./example";
import { OutputRefBlock } from "./output-ref";
import { NodeListBlock } from "./node-list";
import { CopyButton } from "./copy-button";
import { MarkdownBlock } from "./markdown-block";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Main markdown renderer that handles custom blocks and full-page content
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parts = useMemo(() => parseContent(content), [content]);

  return (
    <>
      {parts.map((part, index) => {
        switch (part.type) {
          case "callout":
            return (
              <Callout key={index} type={part.calloutType}>
                <MarkdownBlock content={part.content} />
              </Callout>
            );
          case "steps":
            return <StepsBlock key={index} steps={part.steps} />;
          case "cards":
            return <CardsBlock key={index} cards={part.cards} />;
          case "diagram":
            return <DiagramBlock key={index} parts={part.parts} />;
          case "example":
            return <ExampleBlock key={index} content={part.content} />;
          case "outputref":
            return <OutputRefBlock key={index} lines={part.lines} />;
          case "nodelist":
            return <NodeListBlock key={index} nodes={part.nodes} />;
          case "markdown":
            return (
              <ReactMarkdown
                key={index}
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold tracking-tight mb-4">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => {
                    const text = String(children);
                    const id = text
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "");
                    return (
                      <h2
                        id={id}
                        className="text-xl font-semibold mt-12 mb-4 pt-4 border-t scroll-mt-20"
                      >
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children }) => {
                    const text = String(children);
                    const id = text
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "");
                    return (
                      <h3
                        id={id}
                        className="text-lg font-semibold mt-8 mb-3 scroll-mt-20"
                      >
                        {children}
                      </h3>
                    );
                  },
                  h4: ({ children }) => (
                    <h4 className="font-semibold mt-6 mb-2">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="leading-7 mb-4 text-muted-foreground">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7">{children}</li>
                  ),
                  a: ({ href, children }) => {
                    const isExternal = href?.startsWith("http");
                    if (isExternal) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-4 hover:text-primary/80 inline-flex items-center gap-1"
                        >
                          {children}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    }
                    return (
                      <Link
                        href={href || "#"}
                        className="text-primary underline underline-offset-4 hover:text-primary/80"
                      >
                        {children}
                      </Link>
                    );
                  },
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm text-foreground">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="text-zinc-100 text-sm">{children}</code>
                    );
                  },
                  pre: ({ children }) => {
                    let codeText = "";
                    React.Children.forEach(children, (child) => {
                      if (
                        React.isValidElement(child) &&
                        typeof child.props === "object" &&
                        child.props !== null
                      ) {
                        const props = child.props as {
                          children?: React.ReactNode;
                        };
                        if (props.children) {
                          codeText = String(props.children).replace(/\n$/, "");
                        }
                      }
                    });

                    return (
                      <div className="group relative my-4">
                        <pre className="overflow-x-auto rounded-lg bg-zinc-950 dark:bg-zinc-900 p-4 border border-zinc-800">
                          {children}
                        </pre>
                        <CopyButton text={codeText} />
                      </div>
                    );
                  },
                  table: ({ children }) => (
                    <div className="my-6 overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50 border-b">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left font-medium">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 border-t">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-8 border-border" />,
                }}
              >
                {part.content}
              </ReactMarkdown>
            );
        }
      })}
    </>
  );
}
