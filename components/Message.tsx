"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { Markdown } from "./Markdown";
import type { ChatMessage } from "@/lib/types";

interface Props {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
}

export function Message({ message, onRegenerate, isLastAssistant }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  if (message.role === "user") {
    return (
      <div className="w-full flex justify-end animate-slide-up">
        <div className="max-w-[85%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-2">
              {message.attachments.map((a) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={a.id}
                  src={a.dataUrl}
                  alt={a.name}
                  className="max-h-48 rounded-lg border border-border dark:border-border-dark object-cover"
                />
              ))}
            </div>
          )}
          {message.content && (
            <div className="rounded-3xl bg-bubble-user dark:bg-bubble-userDark px-4 py-2.5 text-[15.5px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-slide-up group">
      {message.error ? (
        <div className="rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 px-4 py-3 text-sm">
          {message.error}
        </div>
      ) : message.pending && !message.content ? (
        <div className="flex items-center text-ink-muted dark:text-ink-mutedDark py-2">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
      ) : (
        <Markdown text={message.content} streaming={message.pending} />
      )}

      {!message.pending && !message.error && (
        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-ink-muted dark:text-ink-mutedDark hover:bg-panel dark:hover:bg-panel-dark transition-colors"
            title="Copy"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          {isLastAssistant && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-ink-muted dark:text-ink-mutedDark hover:bg-panel dark:hover:bg-panel-dark transition-colors"
              title="Regenerate"
            >
              <RotateCcw size={13} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
