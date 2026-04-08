import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  text: {
    type: "text",
    label: "Text",
    default: "Think Different",
    group: "Content",
  },
  fontSize: {
    type: "number",
    label: "Font Size",
    default: 96,
    min: 40,
    max: 200,
    step: 4,
    group: "Style",
  },
  textColor: {
    type: "color",
    label: "Text Color",
    default: "#fafafa",
    group: "Style",
  },
  revealColor: {
    type: "color",
    label: "Reveal Bar Color",
    default: "#f59e0b",
    group: "Style",
  },
  bgColor: {
    type: "color",
    label: "Background",
    default: "#09090b",
    group: "Style",
  },
};

export const meta: PresetMeta = {
  name: "Claude Text Reveal",
  description: "Cinematic text reveal with sliding mask animation",
  category: "title",
  tags: ["text", "reveal", "cinematic", "claude"],
  author: "Claude",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 120,
};

export const Component: React.FC<Record<string, unknown>> = ({
  text = schema.text.default,
  fontSize = schema.fontSize.default,
  textColor = schema.textColor.default,
  revealColor = schema.revealColor.default,
  bgColor = schema.bgColor.default,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Reveal bar slides right
  const barProgress = spring({ fps, frame, config: { damping: 20, stiffness: 60 } });
  const barLeft = interpolate(barProgress, [0, 1], [-10, 110]); // percentage

  // Text clip reveal follows bar
  const textReveal = interpolate(frame, [8, 35], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle scale
  const scale = interpolate(frame, [0, 40], [1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Underline
  const underlineWidth = interpolate(frame, [35, 55], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor as string,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `scale(${scale})`,
        }}
      >
        {/* Reveal bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${barLeft}%`,
            width: 8,
            height: "100%",
            backgroundColor: revealColor as string,
            transform: "translateX(-50%)",
            opacity: barLeft > 105 ? 0 : 1,
            boxShadow: `0 0 30px ${revealColor as string}88`,
          }}
        />

        {/* Text with clip mask */}
        <h1
          style={{
            color: textColor as string,
            fontSize: fontSize as number,
            fontWeight: 800,
            fontFamily: "sans-serif",
            margin: 0,
            clipPath: `inset(0 ${100 - textReveal}% 0 0)`,
            whiteSpace: "nowrap",
          }}
        >
          {text as string}
        </h1>

        {/* Underline accent */}
        <div
          style={{
            height: 4,
            backgroundColor: revealColor as string,
            width: `${underlineWidth}%`,
            marginTop: 12,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
