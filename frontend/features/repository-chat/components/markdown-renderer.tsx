"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-content text-sm leading-relaxed overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1({ children }) {
            return (
              <h1 className="mt-4 mb-2 text-xl font-bold tracking-tight border-b pb-1">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="mt-3 mb-2 text-lg font-semibold tracking-tight border-b pb-1">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="mt-3 mb-1 text-base font-semibold">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="mt-2 mb-1 text-sm font-semibold">
                {children}
              </h4>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 border-l-4 border-muted-foreground/30 pl-3 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 w-full overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs md:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="border-b bg-muted/50 font-medium">
                {children}
              </thead>
            );
          },
          tbody({ children }) {
            return <tbody className="divide-y">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="transition-colors hover:bg-muted/30">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-3 py-2 font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2">{children}</td>;
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  className="rounded bg-muted-foreground/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : "text";

            return (
              <div className="my-3 overflow-hidden rounded-lg border bg-zinc-950 font-mono text-xs shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400">
                  <span>{language}</span>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "0.75rem 1rem",
                    fontSize: "0.8125rem",
                    lineHeight: "1.5",
                    backgroundColor: "transparent",
                  }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
