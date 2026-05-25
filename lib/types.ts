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

export interface Conversation {
  id: string;
  title: string;
  model: ModelId;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** optional system prompt for this thread */
  systemPrompt?: string;
}
