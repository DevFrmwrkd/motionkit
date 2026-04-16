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
  "LowerThird",
  "NumberCounter",
  "BarChart",
  "AuroraBackground",
  "ParticleField",
  "KineticTypography",
  "GlitchText",
  "MarqueeBanner",
  "ShimmerTitle",
] as const;

export type RenderableCompositionId =
  (typeof RENDERABLE_COMPOSITION_IDS)[number];
