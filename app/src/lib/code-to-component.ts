import type { PresetExport } from "./types";
import { compileAndExecute } from "./preset-runtime/sandbox";

interface CodeToComponentResult {
  preset: PresetExport | null;
  error: string | null;
}

/**
 * Legacy compatibility wrapper for callers that still expect the older
 * code-to-component API.
 *
 * The actual execution path now goes through the hardened capability-allowlist
 * sandbox so there is only one place where preset code is compiled and run.
 */
export function codeToComponent(
  componentCode: string,
  schemaJson: string,
  metaJson: string
): CodeToComponentResult {
  const result = compileAndExecute(componentCode, schemaJson, metaJson);

  if (!result.ok) {
    return {
      preset: null,
      error: result.error.message,
    };
  }

  return {
    preset: result.preset,
    error: null,
  };
}
