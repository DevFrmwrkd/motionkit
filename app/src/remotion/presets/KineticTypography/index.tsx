import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

const WORD_DURATION = 36; // frames each word holds full screen
const TRANSITION_OVERLAP = 6;

const Word: React.FC<{
  text: string;
  startFrame: number;
  fps: number;
  fontSize: number;
  color: string;
  accentColor: string;
  isAccent: boolean;
}> = ({ text, startFrame, fps, fontSize, color, accentColor, isAccent }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  // Slam in: scale 1.6 → 1, blur 30 → 0, opacity 0 → 1
  const slamProgress = spring({
    frame: local,
    fps,
    config: { damping: 11, stiffness: 140, mass: 0.5 },
  });

  const scale = interpolate(slamProgress, [0, 1], [1.6, 1]);
  const blur = interpolate(local, [0, 12], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacityIn = interpolate(local, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit: fade + scale up (kicked out by next word)
  const exitStart = WORD_DURATION;
  const exitOpacity = interpolate(
    local,
    [exitStart, exitStart + 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitScale = interpolate(
    local,
    [exitStart, exitStart + 10],
    [1, 1.15],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    }
  );

  const visible = local >= 0 && local <= WORD_DURATION + 12;
  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: opacityIn * exitOpacity,
        filter: `blur(${blur}px)`,
        transform: `scale(${scale * exitScale})`,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 900,
          fontFamily:
            "'Inter', 'SF Pro Display', system-ui, sans-serif",
          color: isAccent ? accentColor : color,
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          textAlign: "center",
          textTransform: "uppercase" as const,
          maxWidth: "90%",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const KineticTypography: React.FC<{
  word1: string;
  word2: string;
  word3: string;
  word4: string;
  word5: string;
  accentEvery: number;
  fontSize: number;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  pulseBackground: boolean;
}> = ({
  word1,
  word2,
  word3,
  word4,
  word5,
  accentEvery,
  fontSize,
  textColor,
  accentColor,
  backgroundColor,
  pulseBackground,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = [word1, word2, word3, word4, word5].filter(
    (w) => w.trim().length > 0
  );

  const stride = WORD_DURATION - TRANSITION_OVERLAP;

  // Background pulse on each word slam
  const bgPulse = pulseBackground
    ? (() => {
        const phase = (frame % stride) / stride;
        const punch = Math.max(0, 1 - phase * 4);
        return punch * 0.15;
      })()
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        overflow: "hidden",
      }}
    >
      {/* Pulse flash */}
      {pulseBackground && (
        <AbsoluteFill
          style={{
            backgroundColor: accentColor,
            opacity: bgPulse,
            mixBlendMode: "overlay" as const,
          }}
        />
      )}

      {words.map((w, i) => (
        <Word
          key={i}
          text={w}
          startFrame={i * stride}
          fps={fps}
          fontSize={fontSize}
          color={textColor}
          accentColor={accentColor}
          isAccent={i % accentEvery === accentEvery - 1}
        />
      ))}
    </AbsoluteFill>
  );
};

const presetExport = {
  component: KineticTypography as React.FC<Record<string, unknown>>,

  schema: {
    word1: {
      type: "text" as const,
      label: "Word 1",
      default: "Bold",
      group: "Words",
    },
    word2: {
      type: "text" as const,
      label: "Word 2",
      default: "Loud",
      group: "Words",
    },
    word3: {
      type: "text" as const,
      label: "Word 3",
      default: "Unmissable",
      group: "Words",
    },
    word4: {
      type: "text" as const,
      label: "Word 4",
      default: "Motion",
      group: "Words",
    },
    word5: {
      type: "text" as const,
      label: "Word 5",
      default: "",
      group: "Words",
    },
    accentEvery: {
      type: "number" as const,
      label: "Accent Every Nth Word",
      default: 3,
      min: 1,
      max: 5,
      step: 1,
      group: "Style",
    },
    fontSize: {
      type: "number" as const,
      label: "Font Size",
      default: 240,
      min: 120,
      max: 400,
      step: 10,
      group: "Typography",
    },
    textColor: {
      type: "color" as const,
      label: "Text Color",
      default: "#fafafa",
      group: "Colors",
    },
    accentColor: {
      type: "color" as const,
      label: "Accent Color",
      default: "#f59e0b",
      group: "Colors",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#09090b",
      group: "Colors",
    },
    pulseBackground: {
      type: "toggle" as const,
      label: "Background Pulse",
      default: true,
      group: "Style",
    },
  },

  meta: {
    name: "Kinetic Typography",
    description:
      "Big, bold words slam onto screen one after another with blur, scale, and color punch. High-energy intros, hype reels, brand statements.",
    category: "intro" as const,
    tags: ["text", "kinetic", "bold", "intro", "hype"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 180,
  },
};

export default presetExport;
