import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const AuroraBackground: React.FC<{
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  baseColor: string;
  intensity: number;
  speed: number;
  blur: number;
  showGrain: boolean;
}> = ({
  color1,
  color2,
  color3,
  color4,
  baseColor,
  intensity,
  speed,
  blur,
  showGrain,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const t = (frame / fps) * speed;

  // Each blob orbits its own center on a slow Lissajous curve
  // for organic, never-repeating motion
  const blob = (i: number) => {
    const phase = i * 1.7;
    const x = 50 + Math.sin(t * 0.4 + phase) * 28 + Math.cos(t * 0.27 + phase * 1.3) * 12;
    const y = 50 + Math.cos(t * 0.32 + phase * 0.7) * 26 + Math.sin(t * 0.21 + phase) * 14;
    const scale = 1 + Math.sin(t * 0.5 + phase * 2) * 0.18;
    return { x, y, scale };
  };

  const b1 = blob(0);
  const b2 = blob(1);
  const b3 = blob(2);
  const b4 = blob(3);

  const radius = Math.max(width, height) * 0.55;

  const blobStyle = (
    color: string,
    pos: { x: number; y: number; scale: number }
  ): React.CSSProperties => ({
    position: "absolute",
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    width: radius * pos.scale,
    height: radius * pos.scale,
    backgroundColor: color,
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    opacity: intensity,
    filter: `blur(${blur}px)`,
    mixBlendMode: "screen" as const,
  });

  // Grain — deterministic per-frame noise via seeded pattern
  const grainOpacity = showGrain ? 0.04 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: baseColor, overflow: "hidden" }}>
      <div style={blobStyle(color1, b1)} />
      <div style={blobStyle(color2, b2)} />
      <div style={blobStyle(color3, b3)} />
      <div style={blobStyle(color4, b4)} />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Grain overlay */}
      {showGrain && (
        <AbsoluteFill
          style={{
            opacity: grainOpacity,
            mixBlendMode: "overlay" as const,
            pointerEvents: "none",
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
            backgroundSize: "200px 200px",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const presetExport = {
  component: AuroraBackground as React.FC<Record<string, unknown>>,

  schema: {
    color1: {
      type: "color" as const,
      label: "Color 1",
      default: "#7c3aed",
      group: "Palette",
    },
    color2: {
      type: "color" as const,
      label: "Color 2",
      default: "#ec4899",
      group: "Palette",
    },
    color3: {
      type: "color" as const,
      label: "Color 3",
      default: "#06b6d4",
      group: "Palette",
    },
    color4: {
      type: "color" as const,
      label: "Color 4",
      default: "#f59e0b",
      group: "Palette",
    },
    baseColor: {
      type: "color" as const,
      label: "Base / Background",
      default: "#0a0118",
      group: "Palette",
    },
    intensity: {
      type: "number" as const,
      label: "Color Intensity",
      default: 0.7,
      min: 0.1,
      max: 1,
      step: 0.05,
      group: "Look",
    },
    blur: {
      type: "number" as const,
      label: "Blur Amount",
      default: 90,
      min: 20,
      max: 200,
      step: 5,
      group: "Look",
    },
    speed: {
      type: "number" as const,
      label: "Motion Speed",
      default: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: "Animation",
    },
    showGrain: {
      type: "toggle" as const,
      label: "Film Grain",
      default: true,
      group: "Look",
    },
  },

  meta: {
    name: "Aurora Background",
    description:
      "Slow-drifting mesh gradient with organic blob motion. Use as a backdrop for titles, lower-thirds, or product reveals.",
    category: "full" as const,
    tags: ["background", "gradient", "ambient", "loop", "aurora"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 300,
  },
};

export default presetExport;
