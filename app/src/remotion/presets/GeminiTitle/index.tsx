import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  titleText: {
    type: "text",
    label: "Main Title",
    default: "Gemini Motion",
    group: "Typography",
  },
  subtitleText: {
    type: "text",
    label: "Subtitle",
    default: "Powered by AI",
    group: "Typography",
  },
  primaryColor: {
    type: "color",
    label: "Primary Color",
    default: "#3b82f6",
    group: "Style",
  },
  backgroundColor: {
    type: "color",
    label: "Background",
    default: "#0f172a",
    group: "Style",
  },
};

export const meta: PresetMeta = {
  name: "Gemini Title Reveal",
  description: "A sleek, AI-inspired title reveal with sliding text and glowing accents.",
  category: "title",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 120,
};

export const Component: React.FC<Record<string, unknown>> = ({
  titleText = schema.titleText.default,
  subtitleText = schema.subtitleText.default,
  primaryColor = schema.primaryColor.default,
  backgroundColor = schema.backgroundColor.default,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const yOffset = spring({ fps, frame, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor as string, justifyContent: "center", alignItems: "center", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ opacity, transform: `translateY(${50 - yOffset * 50}px)`, textAlign: "center" }}>
        <h1 style={{ fontSize: "120px", fontWeight: 900, margin: 0, textShadow: `0 0 40px ${primaryColor}80` }}>
          {titleText as string}
        </h1>
        <h2 style={{ fontSize: "40px", color: primaryColor as string, fontWeight: 500, margin: "20px 0 0 0", letterSpacing: "8px", textTransform: "uppercase" }}>
          {subtitleText as string}
        </h2>
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
