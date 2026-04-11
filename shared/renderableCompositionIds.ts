export const RENDERABLE_COMPOSITION_IDS = [
  "HelloWorld",
  "GeminiTitle",
  "GeminiLowerThird",
  "GeminiTransition",
  "GeminiOutro",
  "GeminiSplitScreen",
  "ClaudeGradientWave",
  "ClaudeLowerThird",
  "ClaudeCallToAction",
  "ClaudeTextReveal",
  "ClaudeOutroCard",
] as const;

export type RenderableCompositionId =
  (typeof RENDERABLE_COMPOSITION_IDS)[number];
