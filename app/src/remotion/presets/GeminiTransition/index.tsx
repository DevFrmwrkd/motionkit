import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  wipeColor1: {
    type: "color",
    label: "Wipe Color 1",
    default: "#8b5cf6",
    group: "Colors",
  },
  wipeColor2: {
    type: "color",
    label: "Wipe Color 2",
    default: "#ec4899",
    group: "Colors",
  },
  angle: {
    type: "number",
    label: "Wipe Angle",
    default: 45,
    group: "Animation",
    min: 0,
    max: 360,
  },
};

export const meta: PresetMeta = {
  name: "Gemini Power Transition",
  description: "A fast, diagonal two-tone wipe transition for scene changes.",
  category: "transition",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 60,
};

export const Component: React.FC<Record<string, unknown>> = ({
  wipeColor1 = schema.wipeColor1.default,
  wipeColor2 = schema.wipeColor2.default,
  angle = schema.angle.default,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transition spans 60 frames (2 seconds)
  const offset1 = spring({ fps, frame: frame - 0, config: { damping: 10 } });
  const offset2 = spring({ fps, frame: frame - 5, config: { damping: 10 } });

  const progress1 = (offset1 * 120) - 10;
  const progress2 = (offset2 * 120) - 10;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", overflow: "hidden" }}>
      {/* Wipe 1 */}
      <div 
        style={{ 
          position: "absolute", 
          inset: "-50%", 
          background: wipeColor1 as string, 
          transform: `rotate(${angle}deg) translateY(${100 - progress1}%)`,
          boxShadow: "0 0 50px rgba(0,0,0,0.5)",
          zIndex: 1
        }} 
      />
      {/* Wipe 2 */}
      <div 
        style={{ 
          position: "absolute", 
          inset: "-50%", 
          background: wipeColor2 as string, 
          transform: `rotate(${angle}deg) translateY(${100 - progress2}%)`,
          boxShadow: "0 0 50px rgba(0,0,0,0.5)",
          zIndex: 2
        }} 
      />
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
