"use client";

import {
  DollarSign,
  KeyRound,
  LogOut,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/pricing";

interface Props {
  apiKey: string;
  isDark: boolean;
  onToggleDark: () => void;
  onChangeKey: () => void;
  onClearAllChats: () => void;
  onSignOut: () => void;
  creditBudgetUsd: number | null;
  onCreditBudgetChange: (usd: number | null) => void;
  lifetimeSpentUsd: number;
  onResetLifetimeSpend: () => void;
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
  creditBudgetUsd,
  onCreditBudgetChange,
  lifetimeSpentUsd,
  onResetLifetimeSpend,
}: Props) {
  const [open, setOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    creditBudgetUsd != null ? String(creditBudgetUsd) : "",
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBudgetInput(creditBudgetUsd != null ? String(creditBudgetUsd) : "");
  }, [creditBudgetUsd, open]);

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

          <div className="px-3 py-2.5 border-t border-border dark:border-border-dark">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-muted dark:text-ink-mutedDark mb-2">
              <DollarSign size={12} />
              <span>Credit budget (USD)</span>
            </div>
            <p className="text-[11px] text-ink-muted dark:text-ink-mutedDark mb-2 leading-relaxed">
              Enter prepaid balance from{" "}
              <a
                href="https://console.anthropic.com/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Console → Billing
              </a>
              . Anthropic does not expose remaining credits via API.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25.00"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-[13px] rounded-lg bg-bg dark:bg-bg-dark border border-border dark:border-border-dark outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => {
                  const n = parseFloat(budgetInput);
                  if (!budgetInput.trim() || Number.isNaN(n) || n <= 0) {
                    onCreditBudgetChange(null);
                    setBudgetInput("");
                  } else {
                    onCreditBudgetChange(n);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium shrink-0"
              >
                Save
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-mutedDark">
              <span>Tracked spend: {formatUsd(lifetimeSpentUsd)}</span>
              <button
                type="button"
                onClick={() => {
                  onResetLifetimeSpend();
                }}
                className="inline-flex items-center gap-1 hover:text-ink dark:hover:text-ink-dark"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </div>
          </div>

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
