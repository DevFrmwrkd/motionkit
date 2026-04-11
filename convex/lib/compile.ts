/**
 * Shared preset compile path (WS-1a).
 *
 * This file is the SINGLE SOURCE OF TRUTH for how preset source code is
 * pre-processed and transpiled into runnable JavaScript. Both the client-side
 * sandbox and the server-side validator/worker must go through this module so
 * that preview and cloud render cannot drift.
 *
 * What this module does:
 *   1. Parses schema + meta JSON blobs and validates the required fields.
 *   2. Strips `import` / `export` statements from the source so the code runs
 *      inside an injected scope instead of a real module system.
 *   3. Runs sucrase to transpile TSX/TS down to JavaScript that any V8 can run.
 *   4. Returns a structured `CompileResult` with either the transpiled code
 *      or a structured `CompileError` (phase + message + optional line/column).
 *
 * What this module does NOT do:
 *   - It does NOT execute the transpiled code. Execution is the caller's job
 *     because only the caller knows which runtime scope (React + Remotion for
 *     the client, a headless stub for the validator) is safe to expose.
 *   - It does NOT import React, Remotion, or any browser/Node-only API. Pure
 *     string-in / string-out so it works in the Convex V8 runtime, the Next
 *     client bundle, and the esbuild sandbox bundle.
 *
 * Why it lives in `convex/lib/`:
 *   - The Convex `validateAndTestRender` action imports it directly to
 *     compile-check uploaded presets before they enter the publish pipeline.
 *   - The Next.js client imports it via a relative path (the same pattern
 *     already used for `convex/_generated/api`).
 *   - Keeping one file means GPT's `code-to-component.ts` refactor and
 *     Claude's server validator can't get out of sync.
 */

import { transform } from "sucrase";

// ─── Public types ────────────────────────────────────────────

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
  category?: string;
  tags?: string[];
  author?: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  thumbnail?: string;
  previewVideo?: string;
}

/**
 * Structured compile error. Designed to be JSON-serialisable so it can be
 * written straight into the `compileErrors` table for moderation review and
 * sent across the postMessage boundary into the sandbox iframe.
 */
export interface CompileError {
  phase: "parse-schema" | "parse-meta" | "validate-meta" | "preprocess" | "transpile";
  message: string;
  /** 1-indexed source line, if known. Sucrase does not always provide one. */
  line?: number;
  /** 1-indexed source column, if known. */
  column?: number;
  /** Short user-facing hint. Optional. */
  hint?: string;
}

export interface CompileSuccess {
  ok: true;
  /** Transpiled JavaScript, ready to be wrapped in a runtime scope. */
  transpiledCode: string;
  schema: PresetSchema;
  meta: PresetMeta;
}

export interface CompileFailure {
  ok: false;
  error: CompileError;
}

export type CompileResult = CompileSuccess | CompileFailure;

// ─── Implementation ──────────────────────────────────────────

const REQUIRED_META_FIELDS: Array<keyof PresetMeta> = [
  "name",
  "fps",
  "width",
  "height",
  "durationInFrames",
];

/**
 * Pre-process source that was written as if it were a module file:
 *   - Strip all `import` statements (single- and multi-line).
 *   - Strip bare side-effect imports.
 *   - Rewrite `export default X` to a named binding the wrapper can find.
 *   - Drop standalone `export` keywords so the remaining declarations are
 *     plain `const`/`function`/`class` that land in the injected scope.
 *
 * The wrapper that finally executes this code (in the client sandbox or test
 * harness) looks for the binding names exported here and returns the React
 * component it finds.
 */
export function preprocessSource(source: string): string {
  let code = source;

  // Multi-line `import … from "…";` — handle wrapping imports too.
  code = code.replace(
    /^import\s+(?:[\s\S]*?)from\s+['"][^'"]+['"];?\s*$/gm,
    ""
  );

  // Bare side-effect imports: `import "./foo.css";`
  code = code.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, "");

  // `export default X` → `const __DefaultExport__ = X`
  code = code.replace(/export\s+default\s+/g, "const __DefaultExport__ = ");

  // Any remaining `export ` keyword, dropped.
  code = code.replace(/export\s+/g, "");

  return code;
}

function parseSchemaJson(schemaJson: string): PresetSchema | CompileError {
  try {
    const parsed = JSON.parse(schemaJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        phase: "parse-schema",
        message: "Schema must be a JSON object mapping field names to field definitions",
        hint: "Example: { title: { type: 'text', default: 'Hello' } }",
      };
    }
    return parsed as PresetSchema;
  } catch (err) {
    return {
      phase: "parse-schema",
      message:
        "Invalid schema JSON: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}

function parseMetaJson(metaJson: string): PresetMeta | CompileError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(metaJson);
  } catch (err) {
    return {
      phase: "parse-meta",
      message:
        "Invalid meta JSON: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      phase: "parse-meta",
      message: "Meta must be a JSON object",
    };
  }
  const meta = parsed as Partial<PresetMeta>;
  for (const field of REQUIRED_META_FIELDS) {
    if (meta[field] == null) {
      return {
        phase: "validate-meta",
        message: `Meta is missing required field "${field}"`,
        hint: `Required meta fields: ${REQUIRED_META_FIELDS.join(", ")}`,
      };
    }
  }
  if (typeof meta.name !== "string" || meta.name.trim().length === 0) {
    return {
      phase: "validate-meta",
      message: "Meta.name must be a non-empty string",
    };
  }
  for (const numericField of ["fps", "width", "height", "durationInFrames"] as const) {
    if (typeof meta[numericField] !== "number" || !Number.isFinite(meta[numericField])) {
      return {
        phase: "validate-meta",
        message: `Meta.${numericField} must be a finite number`,
      };
    }
  }
  return meta as PresetMeta;
}

/**
 * Attempt to pull line/column info out of a sucrase error message.
 * Sucrase errors look like `Unexpected token (12:34)`. If we can parse that,
 * surface it as a structured CompileError. Otherwise return just the message.
 */
function sucraseErrorToCompileError(err: unknown): CompileError {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/\((\d+):(\d+)\)/);
  if (match) {
    return {
      phase: "transpile",
      message: raw,
      line: Number(match[1]),
      column: Number(match[2]),
    };
  }
  return { phase: "transpile", message: raw };
}

/**
 * Compile a preset to transpiled JS + validated schema/meta.
 *
 * Pure function: no React/Remotion execution, no globals touched. Both the
 * client sandbox and the server validator call this.
 */
export function compilePreset(
  sourceCode: string,
  schemaJson: string,
  metaJson: string
): CompileResult {
  // 1. Validate schema.
  const schemaOrErr = parseSchemaJson(schemaJson);
  if ("phase" in (schemaOrErr as object)) {
    return { ok: false, error: schemaOrErr as CompileError };
  }
  const schema = schemaOrErr as PresetSchema;

  // 2. Validate meta.
  const metaOrErr = parseMetaJson(metaJson);
  if ("phase" in (metaOrErr as object)) {
    return { ok: false, error: metaOrErr as CompileError };
  }
  const meta = metaOrErr as PresetMeta;

  // 3. Pre-process source.
  let preprocessed: string;
  try {
    preprocessed = preprocessSource(sourceCode);
  } catch (err) {
    return {
      ok: false,
      error: {
        phase: "preprocess",
        message:
          "Failed to preprocess source: " +
          (err instanceof Error ? err.message : String(err)),
      },
    };
  }

  // 4. Transpile with sucrase.
  let transpiledCode: string;
  try {
    const result = transform(preprocessed, {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "classic",
      jsxPragma: "React.createElement",
      jsxFragmentPragma: "React.Fragment",
    });
    transpiledCode = result.code;
  } catch (err) {
    return { ok: false, error: sucraseErrorToCompileError(err) };
  }

  return { ok: true, transpiledCode, schema, meta };
}

/**
 * The list of binding names the runtime wrapper looks for after executing the
 * transpiled code. Exported here so every caller agrees on the contract and
 * helpful error messages stay consistent.
 */
export const COMPONENT_BINDING_NAMES = [
  "__DefaultExport__",
  "Component",
  "MyComponent",
  "Default",
  "Main",
  "App",
  "Scene",
  "Composition",
] as const;

/**
 * Build the wrapper that resolves the component from the transpiled code.
 * Used by client and server execution paths so the lookup order is identical.
 */
export function buildComponentResolverSource(transpiledCode: string): string {
  const checks = COMPONENT_BINDING_NAMES.map(
    (name) => `if (typeof ${name} !== 'undefined') return ${name};`
  ).join("\n      ");
  return `
      ${transpiledCode}

      // Resolve the component from common naming patterns
      ${checks}
      return null;
    `;
}
