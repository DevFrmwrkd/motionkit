import type { FC } from "react";

// ─── Preset Contract Types ────────────────────────────────────

export type SchemaFieldType =
  | "text"
  | "color"
  | "font"
  | "image"
  | "number"
  | "duration"
  | "select"
  | "toggle";

export interface SchemaField {
  type: SchemaFieldType;
  label?: string;
  default: unknown;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  group?: string;
}

export type PresetSchema = Record<string, SchemaField>;

export interface PresetMeta {
  name: string;
  description?: string;
  category?:
    | "intro"
    | "title"
    | "lower-third"
    | "cta"
    | "transition"
    | "outro"
    | "full"
    | "chart"
    | "map"
    | "social";
  tags?: string[];
  author?: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  thumbnail?: string;
  previewVideo?: string;
}

export interface PresetExport {
  component: FC<Record<string, unknown>>;
  schema: PresetSchema;
  meta: PresetMeta;
}

// ─── Render Job Types ─────────────────────────────────────────

export type RenderStatus = "queued" | "rendering" | "done" | "failed";
export type RenderEngine = "modal" | "lambda" | "platform";

export interface RenderJob {
  _id: string;
  status: RenderStatus;
  progress?: number;
  error?: string;
  outputUrl?: string;
  outputSize?: number;
  renderEngine: RenderEngine;
  startedAt?: number;
  completedAt?: number;
}

// ─── AI Conversation Types ─────────────────────────────────

export interface EditOperation {
  description: string;
  old_string: string;
  new_string: string;
  lineNumber?: number;
}

export interface AssistantMetadata {
  skills?: string[];
  injectedSkills?: string[];
  skippedSkills?: string[];
  editType?: "tool_edit" | "full_replacement";
  edits?: EditOperation[];
  model?: "gemini" | "claude";
}

export type GenerationErrorType = "edit_failed" | "api" | "validation";

export type ConversationContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      imageUrl?: string;
      storageId?: string;
      alt?: string;
    };

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: number;
  attachedImages?: string[];
  contentParts?: ConversationContentPart[];
  codeSnapshot?: string;
  metadata?: AssistantMetadata;
  errorType?: GenerationErrorType;
  failedEdit?: EditOperation;
}

export interface ConversationContextMessage {
  role: "user" | "assistant";
  content: string;
  attachedImages?: string[];
  contentParts?: ConversationContentPart[];
}

export interface ConversationState {
  messages: ConversationMessage[];
  hasManualEdits: boolean;
  lastGenerationTimestamp: number | null;
  pendingMessage?: {
    skills?: string[];
    startedAt: number;
    statusText?: string;
  };
}

export interface ErrorCorrectionContext {
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  failedEdit?: EditOperation;
}
