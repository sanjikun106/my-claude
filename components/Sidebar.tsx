"use client";

import {
  Check,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, UsageTotals } from "@/lib/types";
import { Logo } from "./Logo";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  sessionUsage: UsageTotals;
}

function groupByDate(convs: Conversation[]) {
  const now = Date.now();
  const buckets: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    "Previous 30 days": [],
    Older: [],
  };
  for (const c of convs) {
    const diff = (now - c.updatedAt) / (1000 * 60 * 60 * 24);
    if (diff < 1) buckets.Today.push(c);
    else if (diff < 2) buckets.Yesterday.push(c);
    else if (diff < 7) buckets["Previous 7 days"].push(c);
    else if (diff < 30) buckets["Previous 30 days"].push(c);
    else buckets.Older.push(c);
  }
  return buckets;
}

function fmtTok(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + "k";
  return (n / 1_000_000).toFixed(1) + "M";
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  collapsed,
  onToggleCollapsed,
  sessionUsage,
}: Props) {
  const activeConv = conversations.find((c) => c.id === activeId);
  const activeUsage = activeConv?.usage;
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, query]);

  const buckets = groupByDate(filtered);

  if (collapsed) {
    return (
      <aside className="hidden md:flex h-screen w-[60px] shrink-0 flex-col items-center py-3 gap-2 bg-panel dark:bg-panel-dark border-r border-border dark:border-border-dark">
        <button
          onClick={onToggleCollapsed}
          className="p-2 rounded-lg hover:bg-bg dark:hover:bg-bg-dark text-ink-muted dark:text-ink-mutedDark transition-colors"
          title="Open sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
        <button
          onClick={onNew}
          className="p-2 rounded-lg hover:bg-bg dark:hover:bg-bg-dark text-ink-muted dark:text-ink-mutedDark transition-colors"
          title="New chat"
        >
          <Plus size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex h-screen w-[260px] shrink-0 flex-col bg-panel dark:bg-panel-dark border-r border-border dark:border-border-dark">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-1">
          <Logo size={22} />
          <span className="font-semibold text-[15px] font-serif italic">Laude</span>
        </div>
        <button
          onClick={onToggleCollapsed}
          className="p-1.5 rounded-md hover:bg-bg dark:hover:bg-bg-dark text-ink-muted dark:text-ink-mutedDark transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="px-3 py-1.5">
        <button
          onClick={onNew}
          className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13.5px] font-medium text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus size={16} />
          <span>New chat</span>
        </button>
      </div>

      <div className="px-3 pt-1 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-mutedDark"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full pl-8 pr-7 py-1.5 text-[13px] rounded-lg bg-bg dark:bg-bg-dark border border-transparent focus:border-border dark:focus:border-border-dark outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-muted dark:text-ink-mutedDark hover:bg-bg dark:hover:bg-bg-dark"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-1">
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-[13px] text-ink-muted dark:text-ink-mutedDark">
            {conversations.length === 0
              ? "No chats yet. Start a new one!"
              : "No chats match your search."}
          </div>
        )}

        {Object.entries(buckets).map(([label, list]) =>
          list.length === 0 ? null : (
            <div key={label} className="mb-3">
              <div className="px-2.5 pb-1 text-[10.5px] uppercase tracking-wider text-ink-muted dark:text-ink-mutedDark">
                {label}
              </div>
              <ul className="space-y-0.5">
                {list.map((c) => {
                  const isActive = c.id === activeId;
                  const isRenaming = renameId === c.id;
                  return (
                    <li key={c.id} className="relative group">
                      {isRenaming ? (
                        <div className="flex items-center gap-1 px-2 py-1">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onRename(c.id, renameValue.trim() || c.title);
                                setRenameId(null);
                              } else if (e.key === "Escape") {
                                setRenameId(null);
                              }
                            }}
                            className="flex-1 min-w-0 text-[13.5px] px-2 py-1 rounded-md bg-bg dark:bg-bg-dark border border-border dark:border-border-dark outline-none focus:border-accent"
                          />
                          <button
                            onClick={() => {
                              onRename(c.id, renameValue.trim() || c.title);
                              setRenameId(null);
                            }}
                            className="p-1 rounded text-ink-muted hover:text-accent"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setRenameId(null)}
                            className="p-1 rounded text-ink-muted hover:text-ink dark:hover:text-ink-dark"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelect(c.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13.5px] text-left transition-colors ${
                            isActive
                              ? "bg-bg dark:bg-bg-dark text-ink dark:text-ink-dark"
                              : "text-ink/85 dark:text-ink-dark/85 hover:bg-bg dark:hover:bg-bg-dark"
                          }`}
                        >
                          <MessageSquare
                            size={14}
                            className="shrink-0 opacity-60"
                          />
                          <span className="truncate flex-1">{c.title}</span>
                        </button>
                      )}

                      {!isRenaming && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((m) => (m === c.id ? null : c.id));
                          }}
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-ink-muted dark:text-ink-mutedDark hover:bg-border/60 dark:hover:bg-border-dark transition-opacity ${
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      )}

                      {menuOpen === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-1 top-full mt-1 z-30 w-40 rounded-lg border border-border dark:border-border-dark bg-bg dark:bg-panel-dark shadow-lg py-1"
                        >
                          <button
                            onClick={() => {
                              setRenameValue(c.title);
                              setRenameId(c.id);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel dark:hover:bg-bg-dark"
                          >
                            <Pencil size={13} />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => {
                              onDelete(c.id);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-panel dark:hover:bg-bg-dark"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
        )}
      </nav>

      <div className="mt-auto px-3 py-2.5 border-t border-border dark:border-border-dark text-[11px] text-ink-muted dark:text-ink-mutedDark">
        <div className="flex items-center justify-between mb-1.5">
          <span className="uppercase tracking-wider text-[10px] opacity-80">
            This chat
          </span>
          <span className="font-mono text-ink/80 dark:text-ink-dark/80">
            ↑ {fmtTok(activeUsage?.input ?? 0)} · ↓ {fmtTok(activeUsage?.output ?? 0)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-wider text-[10px] opacity-80">
            Session
          </span>
          <span className="font-mono text-ink/80 dark:text-ink-dark/80">
            ↑ {fmtTok(sessionUsage.input)} · ↓ {fmtTok(sessionUsage.output)}
          </span>
        </div>
        <div className="mt-1.5 text-[10px] text-center opacity-60 select-none">
          Local chats · Your API key
        </div>
      </div>
    </aside>
  );
}
