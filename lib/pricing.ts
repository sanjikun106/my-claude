import type { ModelId } from "./models";
import type { TokenUsage } from "./anthropic-client";

/** USD per 1M tokens (standard tier, approximate). */
interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": { inputPerM: 5, outputPerM: 25 },
  "claude-opus-4-6": { inputPerM: 5, outputPerM: 25 },
  "claude-opus-4-5": { inputPerM: 5, outputPerM: 25 },
  "claude-opus-4-1": { inputPerM: 15, outputPerM: 75 },
  "claude-sonnet-4-6": { inputPerM: 3, outputPerM: 15 },
  "claude-sonnet-4-5": { inputPerM: 3, outputPerM: 15 },
  "claude-haiku-4-5": { inputPerM: 1, outputPerM: 5 },
  "claude-3-7-sonnet-latest": { inputPerM: 3, outputPerM: 15 },
};

const DEFAULT_PRICING: ModelPricing = { inputPerM: 3, outputPerM: 15 };

export function getModelPricing(modelId: ModelId): ModelPricing {
  if (PRICING[modelId]) return PRICING[modelId];
  if (modelId.includes("opus")) return PRICING["claude-opus-4-7"];
  if (modelId.includes("haiku")) return PRICING["claude-haiku-4-5"];
  if (modelId.includes("sonnet")) return PRICING["claude-sonnet-4-6"];
  return DEFAULT_PRICING;
}

/** Estimate USD cost for a single API call from token counts. */
export function estimateCostUsd(modelId: ModelId, usage: TokenUsage): number {
  const p = getModelPricing(modelId);
  const billableIn =
    usage.input + (usage.cacheRead ?? 0) * 0.1 + (usage.cacheWrite ?? 0) * 1.25;
  const cost =
    (billableIn * p.inputPerM + usage.output * p.outputPerM) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}
