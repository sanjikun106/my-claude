"use client";

import {
  KeyRound,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  apiKey: string;
  isDark: boolean;
  onToggleDark: () => void;
  onChangeKey: () => void;
  onClearAllChats: () => void;
  onSignOut: () => void;
}

function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 14) return k;
  return `${k.slice(0, 10)}…${k.slice(-4)}`;
}

export function SettingsMenu({
  apiKey,
  isDark,
  onToggleDark,
  onChangeKey,
  onClearAllChats,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-panel dark:hover:bg-panel-dark text-ink-muted dark:text-ink-mutedDark transition-colors"
        title="Settings"
      >
        <Settings size={17} />
      </button>

      {open && (
        <div className="absolute z-50 right-0 top-full mt-1.5 w-72 rounded-xl border border-border dark:border-border-dark bg-bg dark:bg-panel-dark shadow-xl py-1.5 animate-fade-in">
          <div className="px-3 py-2 border-b border-border dark:border-border-dark">
            <div className="text-[11px] uppercase tracking-wider text-ink-muted dark:text-ink-mutedDark mb-1">
              API key
            </div>
            <div className="flex items-center gap-2 text-[13px] font-mono truncate">
              <KeyRound size={13} className="text-accent shrink-0" />
              <span className="truncate">{maskKey(apiKey)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              onChangeKey();
            }}
            className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-panel dark:hover:bg-bg-dark flex items-center gap-2"
          >
            <KeyRound size={14} />
            <span>Change API key</span>
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onToggleDark();
            }}
            className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-panel dark:hover:bg-bg-dark flex items-center gap-2"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>

          <div className="my-1 border-t border-border dark:border-border-dark" />

          <button
            onClick={() => {
              if (
                confirm("Delete ALL chats? This cannot be undone.")
              ) {
                onClearAllChats();
                setOpen(false);
              }
            }}
            className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-panel dark:hover:bg-bg-dark flex items-center gap-2 text-red-600 dark:text-red-400"
          >
            <Trash2 size={14} />
            <span>Clear all chats</span>
          </button>

          <button
            onClick={() => {
              if (
                confirm(
                  "Sign out and remove API key from this browser? Your chats will remain.",
                )
              ) {
                onSignOut();
                setOpen(false);
              }
            }}
            className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-panel dark:hover:bg-bg-dark flex items-center gap-2 text-red-600 dark:text-red-400"
          >
            <LogOut size={14} />
            <span>Sign out (remove key)</span>
          </button>
        </div>
      )}
    </div>
  );
}
