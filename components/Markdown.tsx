"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  children: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#1f1d1b]">
      <div className="flex items-center justify-between px-3.5 py-1.5 text-xs text-white/60 border-b border-white/5">
        <span className="font-mono lowercase">{language || "text"}</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0">
        <code className={`language-${language || "text"}`}>{children}</code>
      </pre>
    </div>
  );
}

interface Props {
  text: string;
  streaming?: boolean;
}

function MarkdownInner({ text, streaming }: Props) {
  return (
    <div
      className={`prose-claude break-words ${streaming ? "streaming-caret" : ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre({ children }) {
            const codeEl = Array.isArray(children) ? children[0] : children;
            if (
              codeEl &&
              typeof codeEl === "object" &&
              "props" in codeEl &&
              (codeEl as { props?: Record<string, unknown> }).props
            ) {
              const props = (codeEl as { props: Record<string, unknown> }).props;
              const lang =
                (props.className as string | undefined)
                  ?.split(" ")
                  .find((c) => c.startsWith("language-"))
                  ?.replace("language-", "") ?? "";
              const raw = String(props.children ?? "").replace(/\n$/, "");
              return <CodeBlock language={lang}>{raw}</CodeBlock>;
            }
            return <pre>{children}</pre>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownInner);
