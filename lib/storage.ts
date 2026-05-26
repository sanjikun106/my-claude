import type { Conversation } from "./types";

const KEY = "my-claude:conversations:v1";
const PREFS_KEY = "my-claude:prefs:v1";
const APIKEY_KEY = "my-claude:api-key:v1";

export interface Prefs {
  selectedModel?: string;
  theme?: "light" | "dark";
  sidebarCollapsed?: boolean;
  /** optional prepaid balance in USD (from Console → Billing) */
  creditBudgetUsd?: number;
  /** cumulative estimated spend tracked in this browser */
  lifetimeSpentUsd?: number;
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(convs));
  } catch (e) {
    // Likely quota exceeded — fall back to a trimmed copy without huge image data
    try {
      const lite = convs.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ ...m, attachments: undefined })),
      }));
      localStorage.setItem(KEY, JSON.stringify(lite));
    } catch {
      console.error("Could not persist conversations", e);
    }
  }
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function loadApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(APIKEY_KEY);
  } catch {
    return null;
  }
}

export function saveApiKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APIKEY_KEY, key);
  } catch {}
}

export function clearApiKey() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(APIKEY_KEY);
  } catch {}
}

export function clearAllConversations() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
