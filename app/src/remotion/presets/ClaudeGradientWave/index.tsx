import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  title: {
    type: "text",
    label: "Title",
    default: "Claude Wave",
    group: "Content",
  },
  subtitle: {
    type: "text",
    label: "Subtitle",
    default: "Powered by Anthropic",
    group: "Content",
  },
  colorA: {
    type: "color",
    label: "Gradient Start",
    default: "#d97706",
    group: "Style",
  },
  colorB: {
    type: "color",
    label: "Gradient End",
    default: "#7c3aed",
    group: "Style",
  },
  waveSpeed: {
    type: "number",
    label: "Wave Speed",
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    group: "Animation",
  },
};

export const meta: PresetMeta = {
  name: "Claude Gradient Wave",
  description: "Animated gradient wave background with title overlay",
  category: "intro",
  tags: ["gradient", "wave", "intro", "claude"],
  author: "Claude",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 150,
};

export const Component: React.FC<Record<string, unknown>> = ({
  title = schema.title.default,
  subtitle = schema.subtitle.default,
  colorA = schema.colorA.default,
  colorB = schema.colorB.default,
  waveSpeed = schema.waveSpeed.default,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const progress = frame / durationInFrames;
  const angle = interpolate(frame, [0, durationInFrames], [0, 360 * (waveSpeed as number)]);

  const titleOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [10, 35], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subtitleOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Wave distortion for the gradient
  const wave1 = Math.sin(progress * Math.PI * 2 * (waveSpeed as number)) * 20;
  const wave2 = Math.cos(progress * Math.PI * 3 * (waveSpeed as number)) * 15;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${colorA as string}, ${colorB as string}, ${colorA as string})`,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Animated wave circles */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 800 + i * 200,
            height: 800 + i * 200,
            borderRadius: "50%",
            border: `2px solid rgba(255,255,255,${0.1 - i * 0.03})`,
            transform: `translate(${wave1 + i * 10}px, ${wave2 + i * 10}px) scale(${1 + progress * 0.3})`,
          }}
        />
      ))}

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h1
          style={{
            color: "#fff",
            fontSize: 90,
            fontWeight: 800,
            fontFamily: "sans-serif",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: "0 4px 30px rgba(0,0,0,0.3)",
            margin: 0,
          }}
        >
          {title as string}
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 32,
            fontFamily: "sans-serif",
            opacity: subtitleOpacity,
            marginTop: 16,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {subtitle as string}
        </p>
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
