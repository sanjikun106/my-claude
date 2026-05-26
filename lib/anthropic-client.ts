"use client";

import Anthropic from "@anthropic-ai/sdk";
import type { ImageAttachment } from "./types";

interface ImagePart {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
}
interface TextPart {
  type: "text";
  text: string;
}
type MessageContent = string | Array<TextPart | ImagePart>;

export interface BrowserMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: ImageAttachment[];
}

let cachedClient: Anthropic | null = null;
let cachedKey: string | null = null;

export function getClient(apiKey: string): Anthropic {
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    cachedKey = apiKey;
  }
  return cachedClient;
}

/**
 * Verify an API key by listing models. Cheap and read-only.
 * Returns { ok: true } if accepted; otherwise a human-readable error.
 */
export async function verifyApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, error: "Please paste your API key first." };
  }
  if (!apiKey.startsWith("sk-ant-")) {
    return {
      ok: false,
      error: 'API keys start with "sk-ant-". Double-check what you pasted.',
    };
  }

  const client = new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
  });

  try {
    await client.models.list({ limit: 1 });
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Invalid API key — Anthropic rejected it." };
    }
    if (e instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, error: "This key doesn't have permission for the API." };
    }
    if (e instanceof Anthropic.APIError) {
      return { ok: false, error: `${e.status}: ${e.message}` };
    }
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: "Unknown error while verifying." };
  }
}

function buildContent(msg: BrowserMessage): MessageContent {
  if (!msg.attachments || msg.attachments.length === 0) return msg.content;
  const parts: Array<TextPart | ImagePart> = [];
  for (const att of msg.attachments) {
    const m = /^data:([^;]+);base64,(.+)$/.exec(att.dataUrl);
    if (!m) continue;
    parts.push({
      type: "image",
      source: { type: "base64", media_type: m[1], data: m[2] },
    });
  }
  if (msg.content && msg.content.trim().length > 0) {
    parts.push({ type: "text", text: msg.content });
  }
  return parts;
}

export interface StreamChatArgs {
  apiKey: string;
  model: string;
  messages: BrowserMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
}

export interface TokenUsage {
  input: number;
  output: number;
  /** input tokens that were served from the prompt cache (cheap) */
  cacheRead?: number;
  /** input tokens that were written to the prompt cache */
  cacheWrite?: number;
}

export async function streamChat(args: StreamChatArgs): Promise<TokenUsage> {
  const client = getClient(args.apiKey);
  const anthropicMessages = args.messages.map((m) => ({
    role: m.role,
    content: buildContent(m),
  })) as Anthropic.MessageParam[];

  // Streaming events arrive as text_delta chunks.
  const stream = client.messages.stream(
    {
      model: args.model,
      max_tokens: args.maxTokens ?? 8192,
      system: args.systemPrompt?.trim() || undefined,
      messages: anthropicMessages,
    },
    { signal: args.signal },
  );

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      args.onDelta(event.delta.text);
    }
  }
  const final = await stream.finalMessage();
  const u = final.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  return {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens,
    cacheWrite: u.cache_creation_input_tokens,
  };
}

/** Generate a short conversation title using Haiku. Best-effort, swallows errors. */
export async function generateTitle(
  apiKey: string,
  firstUserMessage: string,
): Promise<string | null> {
  try {
    const client = getClient(apiKey);
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 30,
      system:
        "You generate ultra-short conversation titles. Respond with 3-6 words, Title Case, no quotes, no trailing punctuation.",
      messages: [
        {
          role: "user",
          content: `Title for this chat:\n\n${firstUserMessage.slice(0, 800)}`,
        },
      ],
    });
    const text = res.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim()
      .replace(/^["'`]+|["'`.]+$/g, "");
    return text || null;
  } catch {
    return null;
  }
}

export function describeAnthropicError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "stopped";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return "Your API key was rejected — please re-enter it in Settings.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "Your API key doesn't have permission to use this model.";
  }
  if (err instanceof Anthropic.NotFoundError) {
    return "That model id isn't available on your account. Try another one.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by Anthropic. Wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `${err.status} ${err.name}: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error.";
}
