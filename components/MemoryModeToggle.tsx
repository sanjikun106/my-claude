"use client";

import { Brain, ScrollText } from "lucide-react";
import type { MemoryMode } from "@/lib/types";

interface Props {
  value: MemoryMode;
  onChange: (m: MemoryMode) => void;
}

export function MemoryModeToggle({ value, onChange }: Props) {
  return (
    <div
      className="hidden sm:inline-flex items-center gap-0.5 ml-1 rounded-lg p-0.5 bg-panel dark:bg-panel-dark text-[12px]"
      title="How prior messages are sent to Claude as context"
    >
      <button
        onClick={() => onChange("graph")}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
          value === "graph"
            ? "bg-bg dark:bg-bg-dark text-accent font-medium shadow-sm"
            : "text-ink-muted dark:text-ink-mutedDark hover:text-ink dark:hover:text-ink-dark"
        }`}
        title="Graph memory: distill old messages into a knowledge graph, send only recent turns verbatim"
      >
        <Brain size={12.5} />
        <span>Graph</span>
      </button>
      <button
        onClick={() => onChange("full")}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
          value === "full"
            ? "bg-bg dark:bg-bg-dark text-accent font-medium shadow-sm"
            : "text-ink-muted dark:text-ink-mutedDark hover:text-ink dark:hover:text-ink-dark"
        }`}
        title="Full memory: send every prior message verbatim every turn"
      >
        <ScrollText size={12.5} />
        <span>Full</span>
      </button>
    </div>
  );
}
