"use client";

import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "./anthropic-client";
import type {
  ChatMessage,
  ConversationGraph,
  GraphEdge,
  GraphNode,
  GraphNodeType,
} from "./types";

const VALID_TYPES: GraphNodeType[] = [
  "person",
  "concept",
  "place",
  "thing",
  "event",
  "organization",
];

/**
 * How many of the most recent messages we keep verbatim when sending in
 * graph mode. The rest of the history is compressed into the graph.
 */
export const RECENT_WINDOW = 4;

/** Graph mode only kicks in once the chat is at least this long. */
export const GRAPH_MIN_MESSAGES = 6;

const EXTRACTION_MODEL = "claude-haiku-4-5";

interface RawGraph {
  nodes?: Array<{
    id?: string;
    label?: string;
    type?: string;
    note?: string;
  }>;
  edges?: Array<{
    source?: string;
    target?: string;
    label?: string;
  }>;
}

function safeJsonExtract(text: string): RawGraph | null {
  // Try direct parse first
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {}
  // Otherwise pull out the first {...} block
  const match = direct.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeGraph(raw: RawGraph | null): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  if (!raw) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [];
  const seen = new Set<string>();
  for (const n of raw.nodes ?? []) {
    if (!n.id || !n.label) continue;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    const type = VALID_TYPES.includes(n.type as GraphNodeType)
      ? (n.type as GraphNodeType)
      : "concept";
    nodes.push({
      id: String(n.id),
      label: String(n.label).slice(0, 60),
      type,
      note: n.note ? String(n.note).slice(0, 120) : undefined,
    });
  }
  const edges: GraphEdge[] = [];
  for (const e of raw.edges ?? []) {
    if (!e.source || !e.target) continue;
    if (!seen.has(String(e.source)) || !seen.has(String(e.target))) continue;
    edges.push({
      source: String(e.source),
      target: String(e.target),
      label: e.label ? String(e.label).slice(0, 40) : "related to",
    });
  }
  return { nodes, edges };
}

function transcriptOf(messages: ChatMessage[]): string {
  return messages
    .filter((m) => !m.error)
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      const content = m.content?.trim() || (m.attachments?.length ? "[image]" : "");
      return `${role}: ${content}`;
    })
    .join("\n\n");
}

/**
 * Extract OR update a knowledge graph from the conversation. If `previous` is
 * supplied, we ask Haiku to extend the existing graph (cheaper + smoother).
 */
export async function extractGraph(
  apiKey: string,
  messages: ChatMessage[],
  previous?: ConversationGraph,
): Promise<ConversationGraph | null> {
  if (messages.length === 0) return null;
  const transcript = transcriptOf(messages);
  if (!transcript.trim()) return null;

  const system = `You distill conversations into compact knowledge graphs that can be re-fed as context.

Return ONLY a single JSON object — no prose, no markdown, no code fences.

Schema:
{
  "nodes": [ { "id": "n1", "label": "<short noun phrase>", "type": "<one of: person|concept|place|thing|event|organization>", "note": "<<= 12 words optional gloss>" } ],
  "edges": [ { "source": "n1", "target": "n2", "label": "<short verb phrase>" } ]
}

Rules:
- 6 to 18 nodes max. Prefer fewer high-signal nodes over many trivial ones.
- Each node id is a stable short token like "n1", "n2" — reuse ids from previous if updating.
- Capture: the user's goals, preferences, named entities, decisions, open questions, key facts.
- Skip generic small talk and obvious facts.
- Every edge must reference two existing node ids.`;

  const userParts: string[] = [];
  if (previous && previous.nodes.length > 0) {
    userParts.push(
      "Previous knowledge graph (extend/refine, keep ids stable, drop stale nodes if needed):",
    );
    userParts.push(
      JSON.stringify(
        { nodes: previous.nodes, edges: previous.edges },
        null,
        2,
      ),
    );
    userParts.push("");
  }
  userParts.push("Conversation:");
  userParts.push(transcript);

  try {
    const client = getClient(apiKey);
    const res = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userParts.join("\n") }],
    });
    const text = res.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("");
    const raw = safeJsonExtract(text);
    const { nodes, edges } = normalizeGraph(raw);
    if (nodes.length === 0) return null;
    return {
      nodes,
      edges,
      messageCount: messages.length,
      extractedAt: Date.now(),
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn("Graph extraction failed:", err.message);
    }
    return null;
  }
}

/** Format the graph as prose context that fits naturally in a system prompt. */
export function formatGraphAsContext(graph: ConversationGraph): string {
  if (graph.nodes.length === 0) return "";

  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  lines.push("# Conversation memory (knowledge graph)");
  lines.push(
    "Below is a distilled summary of everything discussed earlier in this chat. Recent messages are included verbatim after this. Use this graph as background — do not mention it explicitly.",
  );
  lines.push("");
  lines.push("## Entities");
  for (const n of graph.nodes) {
    const tag = `[${n.type}]`;
    const note = n.note ? ` — ${n.note}` : "";
    lines.push(`- ${n.label} ${tag}${note}`);
  }

  if (graph.edges.length > 0) {
    lines.push("");
    lines.push("## Relationships");
    for (const e of graph.edges) {
      const s = nodesById.get(e.source)?.label ?? e.source;
      const t = nodesById.get(e.target)?.label ?? e.target;
      lines.push(`- ${s} → ${e.label} → ${t}`);
    }
  }
  return lines.join("\n");
}

/**
 * Decide what message slice to send and what system prompt to prepend.
 * - In "graph" mode with enough history and an extracted graph, we trim the
 *   transcript to the last RECENT_WINDOW messages and inject the graph into
 *   the system prompt.
 * - Otherwise we just return the full messages (current default behavior).
 */
export function buildContext(args: {
  messages: ChatMessage[];
  memoryMode: "graph" | "full" | undefined;
  graph: ConversationGraph | undefined;
  baseSystemPrompt?: string;
}): { messages: ChatMessage[]; systemPrompt: string | undefined } {
  const filtered = args.messages.filter((m) => !m.error);
  const base = args.baseSystemPrompt?.trim() || "";

  const useGraph =
    args.memoryMode !== "full" &&
    args.graph &&
    args.graph.nodes.length > 0 &&
    filtered.length > GRAPH_MIN_MESSAGES;

  if (!useGraph) {
    return {
      messages: filtered,
      systemPrompt: base || undefined,
    };
  }

  // Keep the most recent N messages verbatim, but make sure we start that
  // window on a user turn so the model sees the right alternation.
  let cutoff = Math.max(0, filtered.length - RECENT_WINDOW);
  while (cutoff < filtered.length && filtered[cutoff].role !== "user") cutoff++;
  const recent = filtered.slice(cutoff);

  const graphContext = formatGraphAsContext(args.graph!);
  const combined = base ? `${base}\n\n${graphContext}` : graphContext;
  return { messages: recent, systemPrompt: combined };
}
