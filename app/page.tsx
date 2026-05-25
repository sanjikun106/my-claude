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
import type { ChatMessage, Conversation, ImageAttachment } from "@/lib/types";
import {
  describeAnthropicError,
  generateTitle,
  streamChat,
} from "@/lib/anthropic-client";

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
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const apiKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setApiKey(loadApiKey());
    setConversations(loadConversations());
    const prefs = loadPrefs();
    if (prefs.selectedModel) setModel(prefs.selectedModel as ModelId);
    if (typeof prefs.sidebarCollapsed === "boolean")
      setCollapsed(prefs.sidebarCollapsed);
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
    };
    savePrefs(p);
  }, [model, collapsed, isDark, hydrated]);

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

      const wireMessages = initial.messages
        .filter((m) => !m.error)
        .map((m) => ({
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
        await streamChat({
          apiKey: key,
          model: modelId,
          messages: wireMessages,
          systemPrompt: initial.systemPrompt,
          signal: ctrl.signal,
          onDelta: applyDelta,
        });

        setConversations((cs) =>
          cs.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId ? { ...m, pending: false } : m,
                  ),
                }
              : c,
          ),
        );
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
    <div className="flex h-screen w-screen overflow-hidden bg-bg dark:bg-bg-dark text-ink dark:text-ink-dark">
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 h-full transition-transform`}
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
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-3 md:px-4 flex items-center justify-between border-b border-border/70 dark:border-border-dark/70">
          <div className="flex items-center gap-1">
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
            <div className="ml-1">
              <ModelSelector value={model} onChange={setModel} />
            </div>
          </div>
          <SettingsMenu
            apiKey={apiKey ?? ""}
            isDark={isDark}
            onToggleDark={toggleDark}
            onChangeKey={() => setForceSetup(true)}
            onClearAllChats={wipeAllChats}
            onSignOut={signOut}
          />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!active || active.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="max-w-2xl w-full text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white text-xl font-bold mb-5">
                  C
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
            <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 space-y-7">
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

        <div className="pt-2 bg-gradient-to-t from-bg dark:from-bg-dark to-transparent">
          <Composer
            model={model}
            onModelChange={setModel}
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={streaming}
            placeholder={
              active && active.messages.length > 0
                ? "Reply to Claude..."
                : "Message Claude..."
            }
          />
        </div>
      </main>
    </div>
  );
}
