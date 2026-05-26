"use client";

import { ArrowRight, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { verifyApiKey } from "@/lib/anthropic-client";

interface Props {
  initialError?: string;
  onVerified: (apiKey: string) => void;
}

export function ApiKeySetup({ initialError, onVerified }: Props) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function submit() {
    setError(null);
    setVerifying(true);
    const result = await verifyApiKey(key.trim());
    setVerifying(false);
    if (result.ok) {
      onVerified(key.trim());
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg dark:bg-bg-dark px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white mb-4">
            <KeyRound size={22} />
          </div>
          <h1 className="font-serif text-[28px] mb-2 text-ink dark:text-ink-dark">
            Welcome to <span className="italic">Laude</span>
          </h1>
          <p className="text-[14px] text-ink-muted dark:text-ink-mutedDark leading-relaxed">
            Paste your Anthropic API key to start chatting. It&apos;s stored only in
            your browser — never sent anywhere except directly to Anthropic.
          </p>
        </div>

        <div className="rounded-2xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark p-4 space-y-3">
          <label className="block">
            <span className="text-[12px] uppercase tracking-wider text-ink-muted dark:text-ink-mutedDark">
              Anthropic API key
            </span>
            <div className="mt-1.5 relative">
              <input
                autoFocus
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !verifying) submit();
                }}
                placeholder="sk-ant-..."
                spellCheck={false}
                autoComplete="off"
                className="w-full pr-10 px-3 py-2.5 text-[14px] font-mono rounded-lg bg-bg dark:bg-bg-dark border border-border dark:border-border-dark outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-ink-muted dark:text-ink-mutedDark hover:bg-panel dark:hover:bg-bg-dark"
                tabIndex={-1}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 px-3 py-2 text-[13px]">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={verifying || !key.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accent text-white font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Verifying…</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>

        <div className="mt-5 text-center">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-accent hover:text-accent-hover underline underline-offset-2"
          >
            Get an API key →
          </a>
        </div>

        <p className="mt-6 text-[11.5px] text-center text-ink-muted dark:text-ink-mutedDark leading-relaxed">
          Your key lives in this browser&apos;s local storage. Anyone with access
          to this device can read it. You can remove it from Settings at any
          time.
        </p>
      </div>
    </div>
  );
}
