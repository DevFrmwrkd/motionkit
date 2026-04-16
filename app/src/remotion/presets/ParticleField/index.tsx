import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Deterministic pseudo-random — same seed → same output every render
const seeded = (seed: number) => {
  const x = Math.sin(seed * 9999.123) * 43758.5453;
  return x - Math.floor(x);
};

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  drift: number;
  twinkleSpeed: number;
  hueShift: number;
};

const ParticleField: React.FC<{
  count: number;
  particleColor: string;
  glowColor: string;
  backgroundColor: string;
  minSize: number;
  maxSize: number;
  speed: number;
  glowAmount: number;
  showConnections: boolean;
  connectionDistance: number;
}> = ({
  count,
  particleColor,
  glowColor,
  backgroundColor,
  minSize,
  maxSize,
  speed,
  glowAmount,
  showConnections,
  connectionDistance,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = (frame / fps) * speed;

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: seeded(i * 1.1) * 100,
        y: seeded(i * 2.3) * 100,
        size: minSize + seeded(i * 3.7) * (maxSize - minSize),
        speed: 0.3 + seeded(i * 4.1) * 0.7,
        phase: seeded(i * 5.3) * Math.PI * 2,
        drift: 8 + seeded(i * 6.7) * 18,
        twinkleSpeed: 0.5 + seeded(i * 7.9) * 1.5,
        hueShift: seeded(i * 8.2),
      });
    }
    return arr;
  }, [count, minSize, maxSize]);

  // Compute current positions
  const positioned = particles.map((p) => {
    const dx = Math.sin(t * p.speed + p.phase) * p.drift;
    const dy = Math.cos(t * p.speed * 0.7 + p.phase * 1.3) * p.drift * 0.7;
    const x = ((p.x + dx + 100) % 100);
    const y = ((p.y + dy + 100) % 100);
    const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * p.twinkleSpeed + p.phase));
    return { ...p, x, y, twinkle };
  });

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: "hidden" }}>
      {/* Connection lines (constellation mode) */}
      {showConnections && (
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {positioned.map((a, i) =>
            positioned.slice(i + 1).map((b, j) => {
              const ax = (a.x / 100) * width;
              const ay = (a.y / 100) * height;
              const bx = (b.x / 100) * width;
              const by = (b.y / 100) * height;
              const dist = Math.hypot(ax - bx, ay - by);
              if (dist > connectionDistance) return null;
              const opacity = (1 - dist / connectionDistance) * 0.25;
              return (
                <line
                  key={`${i}-${j}`}
                  x1={ax}
                  y1={ay}
                  x2={bx}
                  y2={by}
                  stroke={particleColor}
                  strokeWidth={1}
                  opacity={opacity}
                />
              );
            })
          )}
        </svg>
      )}

      {/* Particles */}
      {positioned.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: particleColor,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            opacity: p.twinkle,
            boxShadow: `0 0 ${glowAmount}px ${glowAmount * 0.4}px ${glowColor}`,
            filter: `blur(0.5px)`,
          }}
        />
      ))}

      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const presetExport = {
  component: ParticleField as React.FC<Record<string, unknown>>,

  schema: {
    count: {
      type: "number" as const,
      label: "Particle Count",
      default: 80,
      min: 20,
      max: 200,
      step: 5,
      group: "Particles",
    },
    minSize: {
      type: "number" as const,
      label: "Min Size",
      default: 2,
      min: 1,
      max: 12,
      step: 0.5,
      group: "Particles",
    },
    maxSize: {
      type: "number" as const,
      label: "Max Size",
      default: 6,
      min: 2,
      max: 20,
      step: 0.5,
      group: "Particles",
    },
    speed: {
      type: "number" as const,
      label: "Drift Speed",
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.1,
      group: "Animation",
    },
    glowAmount: {
      type: "number" as const,
      label: "Glow Amount",
      default: 12,
      min: 0,
      max: 40,
      step: 1,
      group: "Look",
    },
    particleColor: {
      type: "color" as const,
      label: "Particle Color",
      default: "#fafafa",
      group: "Colors",
    },
    glowColor: {
      type: "color" as const,
      label: "Glow Color",
      default: "#a78bfa",
      group: "Colors",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#0a0118",
      group: "Colors",
    },
    showConnections: {
      type: "toggle" as const,
      label: "Constellation Lines",
      default: true,
      group: "Look",
    },
    connectionDistance: {
      type: "number" as const,
      label: "Line Distance",
      default: 180,
      min: 60,
      max: 400,
      step: 10,
      group: "Look",
    },
  },

  meta: {
    name: "Particle Field",
    description:
      "Drifting glowing particles with optional constellation lines. Tech / AI / sci-fi backdrop for titles and reveals.",
    category: "full" as const,
    tags: ["background", "particles", "tech", "ambient", "loop"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 300,
  },
};

export default presetExport;
