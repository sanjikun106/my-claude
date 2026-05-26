"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { ApiKeySetup } from "@/components/ApiKeySetup";
import { Composer } from "@/components/Composer";
import { Message } from "@/components/Message";
import { ModelSelector } from "@/components/ModelSelector";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Sidebar } from "@/components/Sidebar";
import { DEFAULT_MODEL_ID, type ModelId } from "@/lib/models";
import {
  clearAllConversations,
  clearApiKey,
  loadApiKey,
  loadConversations,
  loadPrefs,
  newId,
  Prefs,
  saveApiKey,
  savePrefs,
  saveConversations,
} from "@/lib/storage";
import type {
  ChatMessage,
  Conversation,
  ImageAttachment,
  MemoryMode,
  UsageTotals,
} from "@/lib/types";
import {
  describeAnthropicError,
  generateTitle,
  streamChat,
} from "@/lib/anthropic-client";
import { buildContext, extractGraph } from "@/lib/graph-memory";
import { GraphPanel } from "@/components/GraphPanel";
import { MemoryModeToggle } from "@/components/MemoryModeToggle";
import { CostFooter } from "@/components/CostFooter";
import { Logo } from "@/components/Logo";
import { Network } from "lucide-react";
import { estimateCostUsd } from "@/lib/pricing";

const SUGGESTIONS = [
  "Explain a tricky concept like I'm 5",
  "Draft an email politely declining a meeting",
  "Help me debug this stack trace",
  "Brainstorm names for a side project",
];

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphRefreshing, setGraphRefreshing] = useState<string | null>(null);
  const [sessionUsage, setSessionUsage] = useState<UsageTotals>({
    input: 0,
    output: 0,
    requests: 0,
    estimatedCostUsd: 0,
  });
  const [creditBudgetUsd, setCreditBudgetUsd] = useState<number | null>(null);
  const [lifetimeSpentUsd, setLifetimeSpentUsd] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const apiKeyRef = useRef<string | null>(null);
  const refreshScheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setApiKey(loadApiKey());
    setConversations(loadConversations());
    const prefs = loadPrefs();
    if (prefs.selectedModel) setModel(prefs.selectedModel as ModelId);
    if (typeof prefs.sidebarCollapsed === "boolean")
      setCollapsed(prefs.sidebarCollapsed);
    if (typeof prefs.creditBudgetUsd === "number" && prefs.creditBudgetUsd > 0)
      setCreditBudgetUsd(prefs.creditBudgetUsd);
    if (typeof prefs.lifetimeSpentUsd === "number")
      setLifetimeSpentUsd(prefs.lifetimeSpentUsd);
    setIsDark(document.documentElement.classList.contains("dark"));
    setHydrated(true);
  }, []);

  useEffect(() => {
    conversationsRef.current = conversations;
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    if (!hydrated) return;
    const p: Prefs = {
      selectedModel: model,
      sidebarCollapsed: collapsed,
      theme: isDark ? "dark" : "light",
      creditBudgetUsd: creditBudgetUsd ?? undefined,
      lifetimeSpentUsd,
    };
    savePrefs(p);
  }, [model, collapsed, isDark, hydrated, creditBudgetUsd, lifetimeSpentUsd]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [
    active?.messages.length,
    active?.messages[active.messages.length - 1]?.content,
  ]);

  const toggleDark = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("my-claude:theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveId(null);
    setMobileSidebarOpen(false);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setMobileSidebarOpen(false);
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((cs) =>
      cs.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
    );
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      if (!confirm("Delete this chat? This cannot be undone.")) return;
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId],
  );

  // Build / refresh a conversation's knowledge graph in the background.
  // Cheap: uses Haiku and reuses the prior graph as a starting point.
  const refreshGraphNow = useCallback(async (convId: string) => {
    const key = apiKeyRef.current;
    if (!key) return;
    const conv = conversationsRef.current.find((c) => c.id === convId);
    if (!conv) return;
    if (conv.messages.length === 0) return;
    setGraphRefreshing(convId);
    try {
      const graph = await extractGraph(key, conv.messages, conv.graph);
      if (graph) {
        setConversations((cs) =>
          cs.map((c) => (c.id === convId ? { ...c, graph } : c)),
        );
      }
    } finally {
      setGraphRefreshing((s) => (s === convId ? null : s));
    }
  }, []);

  const scheduleGraphRefresh = useCallback(
    (convId: string) => {
      // Coalesce — only one pending refresh per conversation at a time.
      if (refreshScheduledRef.current.has(convId)) return;
      refreshScheduledRef.current.add(convId);
      setTimeout(async () => {
        try {
          await refreshGraphNow(convId);
        } finally {
          refreshScheduledRef.current.delete(convId);
        }
      }, 250);
    },
    [refreshGraphNow],
  );

  const runStreaming = useCallback(
    async (convId: string, modelId: ModelId) => {
      const key = apiKeyRef.current;
      if (!key) {
        setForceSetup(true);
        return;
      }
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStreaming(true);

      const initial =
        conversationsRef.current.find((c) => c.id === convId) ?? null;
      if (!initial) {
        setStreaming(false);
        return;
      }

      const ctx = buildContext({
        messages: initial.messages,
        memoryMode: initial.memoryMode,
        graph: initial.graph,
        baseSystemPrompt: initial.systemPrompt,
      });
      const wireMessages = ctx.messages.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      const assistantId = newId();
      setConversations((cs) =>
        cs.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: "",
                    pending: true,
                    createdAt: Date.now(),
                    model: modelId,
                  },
                ],
              }
            : c,
        ),
      );

      const applyDelta = (text: string) => {
        setConversations((cs) =>
          cs.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + text }
                      : m,
                  ),
                }
              : c,
          ),
        );
      };

      try {
        const usage = await streamChat({
          apiKey: key,
          model: modelId,
          messages: wireMessages,
          systemPrompt: ctx.systemPrompt,
          signal: ctrl.signal,
          onDelta: applyDelta,
        });

        const turnCost = estimateCostUsd(modelId, usage);

        setConversations((cs) =>
          cs.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId ? { ...m, pending: false } : m,
                  ),
                  usage: {
                    input: (c.usage?.input ?? 0) + usage.input,
                    output: (c.usage?.output ?? 0) + usage.output,
                    requests: (c.usage?.requests ?? 0) + 1,
                    estimatedCostUsd:
                      (c.usage?.estimatedCostUsd ?? 0) + turnCost,
                  },
                }
              : c,
          ),
        );
        setSessionUsage((u) => ({
          input: u.input + usage.input,
          output: u.output + usage.output,
          requests: u.requests + 1,
          estimatedCostUsd: (u.estimatedCostUsd ?? 0) + turnCost,
        }));
        setLifetimeSpentUsd((s) => s + turnCost);

        // Background: refresh the knowledge graph for this conversation so
        // that the *next* turn uses a graph that includes this exchange.
        scheduleGraphRefresh(convId);
      } catch (err: unknown) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        const message = describeAnthropicError(err);
        setConversations((cs) =>
          cs.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          pending: false,
                          error: aborted ? undefined : message,
                          content: aborted && !m.content ? "" : m.content,
                        }
                      : m,
                  ),
                }
              : c,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const maybeGenerateTitle = useCallback(
    async (convId: string, firstUserMessage: string) => {
      const key = apiKeyRef.current;
      if (!key) return;
      const title = await generateTitle(key, firstUserMessage);
      if (title) {
        setConversations((cs) =>
          cs.map((c) => (c.id === convId ? { ...c, title } : c)),
        );
      }
    },
    [],
  );

  const sendMessage = useCallback(
    (text: string, attachments: ImageAttachment[]) => {
      if (!apiKeyRef.current) {
        setForceSetup(true);
        return;
      }
      let convId = activeId;
      let isNew = false;
      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
        attachments: attachments.length ? attachments : undefined,
        createdAt: Date.now(),
      };

      if (!convId) {
        convId = newId();
        isNew = true;
        const fallbackTitle = text.slice(0, 60) || "New chat";
        const newConv: Conversation = {
          id: convId,
          title: fallbackTitle,
          model,
          messages: [userMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          memoryMode: "graph",
        };
        setConversations((cs) => [newConv, ...cs]);
        setActiveId(convId);
      } else {
        setConversations((cs) =>
          cs.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, userMsg],
                  updatedAt: Date.now(),
                  model,
                }
              : c,
          ),
        );
      }

      const id = convId;
      setTimeout(() => {
        runStreaming(id, model);
        if (isNew) maybeGenerateTitle(id, text);
      }, 0);
    },
    [activeId, model, runStreaming, maybeGenerateTitle],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(() => {
    if (!active) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    setConversations((cs) =>
      cs.map((c) => (c.id === active.id ? { ...c, messages: msgs } : c)),
    );
    setTimeout(() => runStreaming(active.id, model), 0);
  }, [active, model, runStreaming]);

  const setActiveMemoryMode = useCallback(
    (mode: MemoryMode) => {
      if (!activeId) return;
      setConversations((cs) =>
        cs.map((c) => (c.id === activeId ? { ...c, memoryMode: mode } : c)),
      );
      if (mode === "graph" && activeId) {
        scheduleGraphRefresh(activeId);
      }
    },
    [activeId, scheduleGraphRefresh],
  );

  const handleVerifiedKey = useCallback((key: string) => {
    saveApiKey(key);
    setApiKey(key);
    setForceSetup(false);
  }, []);

  const signOut = useCallback(() => {
    clearApiKey();
    setApiKey(null);
  }, []);

  const wipeAllChats = useCallback(() => {
    clearAllConversations();
    setConversations([]);
    setActiveId(null);
  }, []);

  const setCreditBudget = useCallback((usd: number | null) => {
    setCreditBudgetUsd(usd);
  }, []);

  const resetLifetimeSpend = useCallback(() => {
    if (
      !confirm(
        "Reset tracked spend to $0? Use this after topping up credits in the Console.",
      )
    ) {
      return;
    }
    setLifetimeSpentUsd(0);
  }, []);

  // Show setup screen until key is verified-and-stored
  if (hydrated && (!apiKey || forceSetup)) {
    return (
      <ApiKeySetup
        initialError={
          forceSetup && apiKey
            ? "Please re-verify or update your API key."
            : undefined
        }
        onVerified={handleVerifiedKey}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-bg dark:bg-bg-dark text-ink dark:text-ink-dark">
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />
      )}
      {graphOpen && active && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-black/40"
          onClick={() => setGraphOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 h-full w-[min(280px,88vw)] md:w-auto transition-transform duration-200 ease-out`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={startNewConversation}
          onRename={renameConversation}
          onDelete={deleteConversation}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          sessionUsage={sessionUsage}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 px-2 sm:px-3 md:px-4 flex items-center justify-between gap-2 border-b border-border/70 dark:border-border-dark/70">
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-panel dark:hover:bg-panel-dark"
            >
              <Menu size={18} />
            </button>
            <button
              onClick={startNewConversation}
              className="md:hidden p-2 rounded-lg hover:bg-panel dark:hover:bg-panel-dark"
              title="New chat"
            >
              <Plus size={18} />
            </button>
            <div className="ml-0.5 sm:ml-1 min-w-0">
              <ModelSelector value={model} onChange={setModel} />
            </div>
            {active && (
              <MemoryModeToggle
                value={active.memoryMode ?? "full"}
                onChange={setActiveMemoryMode}
              />
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {active && (
              <button
                onClick={() => {
                  setGraphOpen((o) => {
                    const next = !o;
                    if (next) setMobileSidebarOpen(false);
                    return next;
                  });
                }}
                className={`p-2 rounded-lg transition-colors ${
                  graphOpen
                    ? "bg-accent/15 text-accent"
                    : "hover:bg-panel dark:hover:bg-panel-dark text-ink-muted dark:text-ink-mutedDark"
                }`}
                title="Toggle knowledge graph"
              >
                <Network size={17} />
              </button>
            )}
            <SettingsMenu
              apiKey={apiKey ?? ""}
              isDark={isDark}
              onToggleDark={toggleDark}
              onChangeKey={() => setForceSetup(true)}
              onClearAllChats={wipeAllChats}
              onSignOut={signOut}
              creditBudgetUsd={creditBudgetUsd}
              onCreditBudgetChange={setCreditBudget}
              lifetimeSpentUsd={lifetimeSpentUsd}
              onResetLifetimeSpend={resetLifetimeSpend}
            />
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!active || active.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="max-w-2xl w-full text-center">
                <div className="inline-flex mb-5">
                  <Logo size={56} rounded="rounded-2xl" />
                </div>
                <h1 className="font-serif text-3xl md:text-[34px] mb-8 text-ink dark:text-ink-dark">
                  How can I help you today?
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s, [])}
                      className="text-left p-3 text-[13.5px] rounded-xl border border-border dark:border-border-dark hover:bg-panel dark:hover:bg-panel-dark transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 pb-28 sm:pb-32 space-y-6 sm:space-y-7">
              {active.messages.map((m, i) => {
                const isLastAssistant =
                  m.role === "assistant" &&
                  i === active.messages.length - 1 &&
                  !m.pending;
                return (
                  <Message
                    key={m.id}
                    message={m}
                    isLastAssistant={isLastAssistant}
                    onRegenerate={isLastAssistant ? regenerate : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-bg dark:from-bg-dark to-transparent">
          <Composer
            model={model}
            onModelChange={setModel}
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={streaming}
            placeholder={
              active && active.messages.length > 0
                ? "Reply to Laude..."
                : "Message Laude..."
            }
          />
          <CostFooter
            chatUsage={active?.usage}
            sessionUsage={sessionUsage}
            creditBudgetUsd={creditBudgetUsd}
            lifetimeSpentUsd={lifetimeSpentUsd}
          />
        </div>
      </main>

      {graphOpen && active && (
        <GraphPanel
          conversation={active}
          refreshing={graphRefreshing === active.id}
          onRefresh={() => refreshGraphNow(active.id)}
          onClose={() => setGraphOpen(false)}
        />
      )}
    </div>
  );
}
