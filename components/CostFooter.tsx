"use client";

import { formatUsd } from "@/lib/pricing";
import type { UsageTotals } from "@/lib/types";

interface Props {
  chatUsage: UsageTotals | undefined;
  sessionUsage: UsageTotals;
  creditBudgetUsd: number | null;
  lifetimeSpentUsd: number;
}

export function CostFooter({
  chatUsage,
  sessionUsage,
  creditBudgetUsd,
  lifetimeSpentUsd,
}: Props) {
  const chatCost = chatUsage?.estimatedCostUsd ?? 0;
  const sessionCost = sessionUsage.estimatedCostUsd ?? 0;
  const hasBudget =
    creditBudgetUsd != null && creditBudgetUsd > 0 && Number.isFinite(creditBudgetUsd);
  const remaining = hasBudget
    ? Math.max(0, creditBudgetUsd - lifetimeSpentUsd)
    : null;
  const spentPct = hasBudget
    ? Math.min(100, (lifetimeSpentUsd / creditBudgetUsd) * 100)
    : 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 pb-1">
      <div className="rounded-xl border border-border/80 dark:border-border-dark/80 bg-panel/50 dark:bg-panel-dark/50 px-3 py-2 text-[11px] text-ink-muted dark:text-ink-mutedDark">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            This chat{" "}
            <span className="font-mono text-ink/90 dark:text-ink-dark/90">
              {formatUsd(chatCost)}
            </span>
            <span className="opacity-70"> est.</span>
          </span>
          <span className="hidden sm:inline opacity-40">·</span>
          <span>
            Session{" "}
            <span className="font-mono text-ink/90 dark:text-ink-dark/90">
              {formatUsd(sessionCost)}
            </span>
            <span className="opacity-70"> est.</span>
          </span>
          {hasBudget && remaining != null && (
            <>
              <span className="hidden sm:inline opacity-40">·</span>
              <span>
                Credits{" "}
                <span className="font-mono text-ink/90 dark:text-ink-dark/90">
                  {formatUsd(lifetimeSpentUsd)}
                </span>
                <span className="opacity-70"> / </span>
                <span className="font-mono text-ink/90 dark:text-ink-dark/90">
                  {formatUsd(creditBudgetUsd)}
                </span>
                <span className="opacity-70"> · </span>
                <span className="text-accent font-medium">
                  {formatUsd(remaining)} left
                </span>
              </span>
            </>
          )}
        </div>

        {hasBudget && (
          <div className="mt-2 h-1 rounded-full bg-border dark:bg-border-dark overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${spentPct}%` }}
            />
          </div>
        )}

        {!hasBudget && (
          <p className="mt-1.5 text-center text-[10px] opacity-70">
            Estimates from token usage · Set a credit budget in Settings to track
            remaining balance
          </p>
        )}
      </div>
    </div>
  );
}
