export type ModelId = string;

export interface ClaudeModel {
  id: ModelId;
  name: string;
  description: string;
  badge?: string;
  supportsVision: boolean;
  maxOutputTokens: number;
}

// Current Claude API model catalog (as of mid-2026).
// 4.6 generation and later use dateless IDs that are pinned snapshots.
// The chat client doesn't validate the model id — whatever is here gets sent
// straight to Anthropic, so feel free to add/remove based on what your key
// has access to.
export const MODELS: ClaudeModel[] = [
  {
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    description: "Flagship — best for the hardest reasoning and agent work",
    badge: "Most intelligent",
    supportsVision: true,
    maxOutputTokens: 16000,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Smart, fast, 1M context — best for everyday work",
    badge: "Recommended",
    supportsVision: true,
    maxOutputTokens: 16000,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fastest, lowest cost, near-frontier intelligence",
    badge: "Fastest",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    description: "Previous flagship",
    supportsVision: true,
    maxOutputTokens: 16000,
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Previous-generation Sonnet",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    description: "Earlier Opus 4 release",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-opus-4-1",
    name: "Claude Opus 4.1",
    description: "Opus 4.1 snapshot",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet",
    description: "Hybrid reasoning (3.x series)",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
];

export const DEFAULT_MODEL_ID: ModelId = "claude-sonnet-4-6";

export function getModel(id: ModelId): ClaudeModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[1];
}
