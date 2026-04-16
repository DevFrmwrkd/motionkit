import type { PresetExport } from "./types";
import HelloWorld from "@/remotion/presets/HelloWorld";
import GeminiTitle from "@/remotion/presets/GeminiTitle";
import GeminiLowerThird from "@/remotion/presets/GeminiLowerThird";
import GeminiTransition from "@/remotion/presets/GeminiTransition";
import GeminiOutro from "@/remotion/presets/GeminiOutro";
import GeminiSplitScreen from "@/remotion/presets/GeminiSplitScreen";
import ClaudeGradientWave from "@/remotion/presets/ClaudeGradientWave";
import ClaudeLowerThird from "@/remotion/presets/ClaudeLowerThird";
import ClaudeCallToAction from "@/remotion/presets/ClaudeCallToAction";
import ClaudeTextReveal from "@/remotion/presets/ClaudeTextReveal";
import ClaudeOutroCard from "@/remotion/presets/ClaudeOutroCard";
import LowerThird from "@/remotion/presets/LowerThird";
import NumberCounter from "@/remotion/presets/NumberCounter";
import BarChart from "@/remotion/presets/BarChart";
import AuroraBackground from "@/remotion/presets/AuroraBackground";
import ParticleField from "@/remotion/presets/ParticleField";
import KineticTypography from "@/remotion/presets/KineticTypography";
import GlitchText from "@/remotion/presets/GlitchText";
import MarqueeBanner from "@/remotion/presets/MarqueeBanner";
import ShimmerTitle from "@/remotion/presets/ShimmerTitle";
import {
  RENDERABLE_COMPOSITION_IDS,
  type RenderableCompositionId,
} from "../../../shared/renderableCompositionIds";

const renderablePresets: Record<RenderableCompositionId, PresetExport> = {
  HelloWorld,
  GeminiTitle,
  GeminiLowerThird,
  GeminiTransition,
  GeminiOutro,
  GeminiSplitScreen,
  ClaudeGradientWave,
  ClaudeLowerThird,
  ClaudeCallToAction,
  ClaudeTextReveal,
  ClaudeOutroCard,
  LowerThird,
  NumberCounter,
  BarChart,
  AuroraBackground,
  ParticleField,
  KineticTypography,
  GlitchText,
  MarqueeBanner,
  ShimmerTitle,
};

export const presetRegistry = Object.fromEntries(
  RENDERABLE_COMPOSITION_IDS.map((id) => [
    `local://presets/${id}`,
    renderablePresets[id],
  ])
) as Record<string, PresetExport>;
