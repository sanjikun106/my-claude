"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { MODELS, type ModelId } from "@/lib/models";

interface Props {
  value: ModelId;
  onChange: (id: ModelId) => void;
  align?: "left" | "right";
  /** "auto" picks up/down based on viewport space (default). */
  placement?: "auto" | "up" | "down";
}

const MENU_WIDTH = 320;
const ESTIMATED_MENU_HEIGHT = 380;

export function ModelSelector({
  value,
  onChange,
  align = "left",
  placement = "auto",
}: Props) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = MODELS.find((m) => m.id === value) ?? MODELS[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Decide flip direction right before paint so there's no visual jump.
  useLayoutEffect(() => {
    if (!open) return;
    if (placement !== "auto") {
      setDirection(placement);
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < ESTIMATED_MENU_HEIGHT && spaceAbove > spaceBelow) {
      setDirection("up");
    } else {
      setDirection("down");
    }
  }, [open, placement]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13.5px] font-medium text-ink/80 dark:text-ink-dark/80 hover:bg-panel dark:hover:bg-panel-dark transition-colors"
      >
        <Sparkles size={14} className="text-accent" />
        <span>{current.name}</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>
      {open && (
        <div
          style={{ width: MENU_WIDTH, maxHeight: "min(70vh, 480px)" }}
          className={`absolute z-50 rounded-xl border border-border dark:border-border-dark bg-bg dark:bg-panel-dark shadow-xl py-1.5 overflow-y-auto animate-fade-in ${
            align === "right" ? "right-0" : "left-0"
          } ${direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
        >
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-ink-muted dark:text-ink-mutedDark">
            Choose model
          </div>
          {MODELS.map((m) => {
            const selected = m.id === value;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-panel dark:hover:bg-bg-dark transition-colors"
              >
                <div className="mt-0.5 w-4">
                  {selected && <Check size={15} className="text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{m.name}</span>
                    {m.badge && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-ink-muted dark:text-ink-mutedDark mt-0.5">
                    {m.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
