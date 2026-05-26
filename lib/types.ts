import type { ModelId } from "./models";

export type Role = "user" | "assistant";

export interface ImageAttachment {
  id: string;
  name: string;
  mediaType: string; // e.g. "image/png"
  dataUrl: string; // base64 data URL — easy to persist in localStorage
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  attachments?: ImageAttachment[];
  createdAt: number;
  model?: ModelId;
  /** assistant message is still streaming */
  pending?: boolean;
  /** error string if the request failed */
  error?: string;
}

export type GraphNodeType =
  | "person"
  | "concept"
  | "place"
  | "thing"
  | "event"
  | "organization";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  /** optional 1-line description explaining the node */
  note?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface ConversationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** how many messages this graph reflects */
  messageCount: number;
  extractedAt: number;
}

export type MemoryMode = "graph" | "full";

export interface UsageTotals {
  /** total tokens sent up across all turns in this scope */
  input: number;
  output: number;
  /** number of API calls that contributed to these totals */
  requests: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: ModelId;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** optional system prompt for this thread */
  systemPrompt?: string;
  /** how to construct context for new messages — defaults to "graph" */
  memoryMode?: MemoryMode;
  /** distilled knowledge graph of the conversation so far */
  graph?: ConversationGraph;
  /** cumulative token usage attributed to this chat */
  usage?: UsageTotals;
}
