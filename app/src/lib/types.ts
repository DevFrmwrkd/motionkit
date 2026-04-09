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
