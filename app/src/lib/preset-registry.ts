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

export const presetRegistry: Record<string, PresetExport> = {
  "local://presets/HelloWorld": HelloWorld,
  "local://presets/GeminiTitle": GeminiTitle,
  "local://presets/GeminiLowerThird": GeminiLowerThird,
  "local://presets/GeminiTransition": GeminiTransition,
  "local://presets/GeminiOutro": GeminiOutro,
  "local://presets/GeminiSplitScreen": GeminiSplitScreen,
  "local://presets/ClaudeGradientWave": ClaudeGradientWave,
  "local://presets/ClaudeLowerThird": ClaudeLowerThird,
  "local://presets/ClaudeCallToAction": ClaudeCallToAction,
  "local://presets/ClaudeTextReveal": ClaudeTextReveal,
  "local://presets/ClaudeOutroCard": ClaudeOutroCard,
};
