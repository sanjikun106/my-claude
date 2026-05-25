export type ModelId = string;

export interface ClaudeModel {
  id: ModelId;
  name: string;
  description: string;
  badge?: string;
  supportsVision: boolean;
  maxOutputTokens: number;
}

// Curated list of widely available Claude models. You can chat with any of
// these once your API key has access. If you have access to newer models, add
// them here — the chat route does no validation beyond passing the id through.
export const MODELS: ClaudeModel[] = [
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    description: "Most capable — best for hard reasoning",
    badge: "Most intelligent",
    supportsVision: true,
    maxOutputTokens: 16000,
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Smart, fast, great for everyday work",
    badge: "Recommended",
    supportsVision: true,
    maxOutputTokens: 16000,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fastest, lowest cost",
    badge: "Fastest",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet",
    description: "Hybrid reasoning",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet",
    description: "Previous generation Sonnet",
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    description: "Previous generation Haiku",
    supportsVision: false,
    maxOutputTokens: 8192,
  },
];

export const DEFAULT_MODEL_ID: ModelId = "claude-sonnet-4-5";

export function getModel(id: ModelId): ClaudeModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[1];
}
