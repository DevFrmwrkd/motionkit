import { Composition } from "remotion";
import HelloWorld from "./presets/HelloWorld";
import GeminiTitle from "./presets/GeminiTitle";
import GeminiLowerThird from "./presets/GeminiLowerThird";
import GeminiTransition from "./presets/GeminiTransition";
import GeminiOutro from "./presets/GeminiOutro";
import GeminiSplitScreen from "./presets/GeminiSplitScreen";
import ClaudeGradientWave from "./presets/ClaudeGradientWave";
import ClaudeLowerThird from "./presets/ClaudeLowerThird";
import ClaudeCallToAction from "./presets/ClaudeCallToAction";
import ClaudeTextReveal from "./presets/ClaudeTextReveal";
import ClaudeOutroCard from "./presets/ClaudeOutroCard";
import type { PresetExport } from "../lib/types";
import {
  RENDERABLE_COMPOSITION_IDS,
  type RenderableCompositionId,
} from "../../../shared/renderableCompositionIds";

const presets: Record<RenderableCompositionId, PresetExport> = {
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
};

const defaultPropsFor = (preset: PresetExport): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(preset.schema)) {
    props[key] = field.default;
  }
  return props;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {RENDERABLE_COMPOSITION_IDS.map((id) => {
        const preset = presets[id];
        return (
          <Composition
            key={id}
            id={id}
            component={preset.component as React.FC<Record<string, unknown>>}
            durationInFrames={preset.meta.durationInFrames}
            fps={preset.meta.fps}
            width={preset.meta.width}
            height={preset.meta.height}
            defaultProps={defaultPropsFor(preset)}
          />
        );
      })}
    </>
  );
};
