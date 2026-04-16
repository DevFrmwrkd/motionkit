import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// Deterministic pseudo-random
const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const GlitchText: React.FC<{
  text: string;
  subText: string;
  showSub: boolean;
  fontSize: number;
  textColor: string;
  redChannel: string;
  cyanChannel: string;
  backgroundColor: string;
  glitchIntensity: number;
  glitchFrequency: number;
  showScanlines: boolean;
}> = ({
  text,
  subText,
  showSub,
  fontSize,
  textColor,
  redChannel,
  cyanChannel,
  backgroundColor,
  glitchIntensity,
  glitchFrequency,
  showScanlines,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();

  // Entry: scale + opacity
  const entry = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const entryScale = interpolate(entry, [0, 1], [1.1, 1]);
  const entryOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glitch bursts — intense flickers that happen every N frames
  const burstPeriod = Math.max(6, Math.round(60 / glitchFrequency));
  const cyclePos = frame % burstPeriod;
  const inBurst = cyclePos < 4;

  // Per-frame seeded jitter for channel offsets
  const jitterSeed = Math.floor(frame / 2);
  const baseJitter = (rnd(jitterSeed) - 0.5) * 2;
  const burstMultiplier = inBurst ? 1 : 0.25;
  const offset = baseJitter * glitchIntensity * burstMultiplier;

  // Slice glitch — clip-path strip during bursts
  const sliceY = rnd(jitterSeed * 1.7) * 100;
  const sliceH = 4 + rnd(jitterSeed * 2.3) * 16;
  const sliceX = (rnd(jitterSeed * 3.1) - 0.5) * 40 * glitchIntensity;

  // Exit fade
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const baseTextStyle: React.CSSProperties = {
    fontSize,
    fontWeight: 900,
    fontFamily: "'Inter', 'SF Mono', monospace",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    textTransform: "uppercase" as const,
    margin: 0,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        opacity: entryOpacity * fadeOut,
        transform: `scale(${entryScale})`,
      }}
    >
      <div style={{ position: "relative", textAlign: "center" }}>
        {/* Cyan channel (offset left) */}
        <div
          style={{
            ...baseTextStyle,
            position: "absolute",
            inset: 0,
            color: cyanChannel,
            transform: `translate(${-offset * 4}px, ${offset * 2}px)`,
            mixBlendMode: "screen" as const,
          }}
        >
          {text}
        </div>

        {/* Red channel (offset right) */}
        <div
          style={{
            ...baseTextStyle,
            position: "absolute",
            inset: 0,
            color: redChannel,
            transform: `translate(${offset * 4}px, ${-offset * 2}px)`,
            mixBlendMode: "screen" as const,
          }}
        >
          {text}
        </div>

        {/* Main text */}
        <div style={{ ...baseTextStyle, color: textColor, position: "relative" }}>
          {text}
        </div>

        {/* Slice glitch overlay (during bursts) */}
        {inBurst && glitchIntensity > 0 && (
          <div
            style={{
              ...baseTextStyle,
              position: "absolute",
              inset: 0,
              color: textColor,
              clipPath: `inset(${sliceY}% 0 ${100 - sliceY - sliceH}% 0)`,
              transform: `translateX(${sliceX}px)`,
            }}
          >
            {text}
          </div>
        )}

        {showSub && (
          <div
            style={{
              marginTop: 24,
              fontSize: fontSize * 0.18,
              fontFamily: "'SF Mono', 'Courier New', monospace",
              color: textColor,
              opacity: 0.6,
              letterSpacing: "0.4em",
              textTransform: "uppercase" as const,
            }}
          >
            {subText}
          </div>
        )}
      </div>

      {/* Scanlines */}
      {showScanlines && (
        <AbsoluteFill
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)",
            pointerEvents: "none",
            mixBlendMode: "overlay" as const,
          }}
        />
      )}

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const presetExport = {
  component: GlitchText,

  schema: {
    text: {
      type: "text" as const,
      label: "Main Text",
      default: "SYSTEM ERROR",
      group: "Content",
    },
    subText: {
      type: "text" as const,
      label: "Sub Text",
      default: "0xC0FFEE — RECONNECTING",
      group: "Content",
    },
    showSub: {
      type: "toggle" as const,
      label: "Show Sub Text",
      default: true,
      group: "Content",
    },
    fontSize: {
      type: "number" as const,
      label: "Font Size",
      default: 160,
      min: 60,
      max: 320,
      step: 4,
      group: "Typography",
    },
    glitchIntensity: {
      type: "number" as const,
      label: "Glitch Intensity",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      group: "Effect",
    },
    glitchFrequency: {
      type: "number" as const,
      label: "Glitch Frequency (per sec)",
      default: 4,
      min: 1,
      max: 15,
      step: 0.5,
      group: "Effect",
    },
    showScanlines: {
      type: "toggle" as const,
      label: "CRT Scanlines",
      default: true,
      group: "Effect",
    },
    textColor: {
      type: "color" as const,
      label: "Main Text",
      default: "#fafafa",
      group: "Colors",
    },
    redChannel: {
      type: "color" as const,
      label: "Red Channel",
      default: "#ff0044",
      group: "Colors",
    },
    cyanChannel: {
      type: "color" as const,
      label: "Cyan Channel",
      default: "#00f0ff",
      group: "Colors",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#000000",
      group: "Colors",
    },
  },

  meta: {
    name: "Glitch Text",
    description:
      "RGB-split chromatic aberration text with periodic slice glitches and scanlines. Cyberpunk / tech / hacker aesthetic.",
    category: "title" as const,
    tags: ["glitch", "cyberpunk", "tech", "title", "vhs"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 150,
  },
};

export default presetExport;
