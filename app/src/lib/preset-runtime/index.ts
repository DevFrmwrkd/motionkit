/**
 * preset-runtime — helpers injected into AI-generated preset code at compile time.
 *
 * Everything exported here is surfaced in the sandbox scope built by
 * `code-to-component.ts`, so generated presets can call:
 *
 *   mapHelpers.getCountryPath("US", { width: 1920, height: 1080 })
 *   iconHelpers.getIcon("rocket")
 *   styleHelpers.getStyle("corporate")
 *
 * without importing anything. The architectural goal is to never let the LLM
 * hallucinate ground truth (SVG paths, icons, hex colors, font names).
 */

export { mapHelpers, type MapHelpers } from "./mapHelpers";
export { iconHelpers, type IconHelpers } from "./iconHelpers";
export { styleHelpers, type StyleHelpers, type StylePreset, STYLE_PRESETS } from "./styleHelpers";
