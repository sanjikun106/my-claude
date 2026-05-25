"use client";

import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ImageAttachment } from "@/lib/types";
import { newId } from "@/lib/storage";
import { ModelSelector } from "./ModelSelector";
import type { ModelId } from "@/lib/models";

interface Props {
  model: ModelId;
  onModelChange: (m: ModelId) => void;
  onSend: (text: string, attachments: ImageAttachment[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
}

export function Composer({
  model,
  onModelChange,
  onSend,
  onStop,
  isStreaming,
  placeholder,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height =
        Math.min(taRef.current.scrollHeight, 260) + "px";
    }
  }, [text]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isStreaming) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const next: ImageAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      next.push({
        id: newId(),
        name: file.name,
        mediaType: file.type,
        dataUrl,
      });
    }
    setAttachments((a) => [...a, ...next]);
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="rounded-3xl border border-border dark:border-border-dark bg-bg dark:bg-panel-dark shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] transition-shadow focus-within:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.12)]">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="relative group rounded-lg overflow-hidden border border-border dark:border-border-dark"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.dataUrl}
                  alt={a.name}
                  className="h-16 w-16 object-cover"
                />
                <button
                  onClick={() =>
                    setAttachments((arr) => arr.filter((x) => x.id !== a.id))
                  }
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder ?? "Reply to Claude..."}
          className="w-full resize-none bg-transparent outline-none px-5 pt-4 pb-2 text-[15.5px] leading-relaxed placeholder:text-ink-muted dark:placeholder:text-ink-mutedDark"
        />

        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-lg text-ink-muted dark:text-ink-mutedDark hover:bg-panel dark:hover:bg-bg-dark transition-colors"
              title="Attach image"
            >
              <Paperclip size={17} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <ModelSelector
              value={model}
              onChange={onModelChange}
              placement="up"
            />
          </div>

          {isStreaming ? (
            <button
              onClick={() => onStop?.()}
              className="h-9 w-9 rounded-full bg-ink dark:bg-ink-dark text-bg dark:text-bg-dark flex items-center justify-center hover:opacity-80 transition-opacity"
              title="Stop"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!text.trim() && attachments.length === 0}
              className="h-9 w-9 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:bg-ink-muted/40 dark:disabled:bg-ink-mutedDark/30 disabled:cursor-not-allowed transition-colors"
              title="Send"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-center text-ink-muted dark:text-ink-mutedDark mt-2">
        Claude can make mistakes. Verify important information.
      </p>
    </div>
  );
}
