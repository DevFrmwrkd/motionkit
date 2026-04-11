import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function normalizeSteps(stepsText: string) {
  return stepsText
    .split(/\n-{3,}\n/g)
    .map((step) => step.trim())
    .filter(Boolean);
}

const CodeHikePreset: React.FC<{
  title: string;
  stepsText: string;
  accentColor: string;
  backgroundColor: string;
  panelColor: string;
  textColor: string;
}> = ({
  title,
  stepsText,
  accentColor,
  backgroundColor,
  panelColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const steps = normalizeSteps(stepsText);
  const stepDuration = Math.max(36, Math.floor(durationInFrames / steps.length));
  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 120,
      mass: 0.9,
    },
  });
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        color: textColor,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <AbsoluteFill
        style={{
          inset: 48,
          borderRadius: 32,
          background: `linear-gradient(180deg, ${panelColor}, ${backgroundColor})`,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          overflow: "hidden",
          transform: `translateY(${interpolate(reveal, [0, 1], [60, 0])}px)`,
        }}
      >
        <div
          style={{
            height: 10,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              width: `${progressWidth}%`,
              height: "100%",
              background: accentColor,
            }}
          />
        </div>

        <div
          style={{
            padding: "36px 42px 28px",
            display: "grid",
            gap: 18,
          }}
        >
          <span
            style={{
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: `${textColor}88`,
            }}
          >
            Code Hike
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#F8FAFC",
            }}
          >
            {title}
          </span>
        </div>

        <div
          style={{
            padding: "0 42px 42px",
            height: "100%",
          }}
        >
          <Series>
            {steps.map((step, index) => (
              <Series.Sequence
                key={index}
                durationInFrames={stepDuration}
                layout="none"
              >
                <CodeStep
                  step={step}
                  stepIndex={index}
                  stepCount={steps.length}
                  accentColor={accentColor}
                  textColor={textColor}
                />
              </Series.Sequence>
            ))}
          </Series>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CodeStep: React.FC<{
  step: string;
  stepIndex: number;
  stepCount: number;
  accentColor: string;
  textColor: string;
}> = ({ step, stepIndex, stepCount, accentColor, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = step.split("\n");
  const slide = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 110,
      mass: 0.7,
    },
  });
  const opacity = interpolate(frame, [0, 12, 44], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${interpolate(slide, [0, 1], [28, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          color: `${textColor}88`,
          fontSize: 18,
        }}
      >
        <span>Step {stepIndex + 1}</span>
        <span>{stepIndex + 1}/{stepCount}</span>
      </div>

      <div
        style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          backgroundColor: "rgba(3,7,18,0.72)",
        }}
      >
        {lines.map((line, index) => {
          const isFocused = line.trimStart().startsWith(">");
          const displayLine = isFocused ? line.replace(/^>\s?/, "") : line;

          return (
            <div
              key={`${stepIndex}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr",
                padding: "12px 18px",
                backgroundColor: isFocused ? `${accentColor}18` : "transparent",
                borderLeft: isFocused ? `3px solid ${accentColor}` : "3px solid transparent",
                color: isFocused ? "#F8FAFC" : textColor,
                fontSize: 28,
                lineHeight: 1.45,
              }}
            >
              <span style={{ color: `${textColor}66` }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{displayLine || " "}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: CodeHikePreset,
  schema: {
    title: {
      type: "text" as const,
      label: "Title",
      default: "Ship the transition in three steps",
      group: "Content",
    },
    stepsText: {
      type: "text" as const,
      label: "Code Steps",
      default:
        "const status = 'draft';\nconst duration = 90;\n---\nconst status = 'review';\n> const duration = 120;\nconst easing = 'spring';\n---\nconst status = 'published';\n> const duration = 150;\nconst easing = 'spring';\nconst badge = 'renderable';",
      group: "Content",
    },
    accentColor: {
      type: "color" as const,
      label: "Accent Color",
      default: "#60A5FA",
      group: "Style",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#020617",
      group: "Style",
    },
    panelColor: {
      type: "color" as const,
      label: "Panel Color",
      default: "#111827",
      group: "Style",
    },
    textColor: {
      type: "color" as const,
      label: "Text Color",
      default: "#CBD5E1",
      group: "Style",
    },
  },
  meta: {
    name: "Code Hike",
    description:
      "Animated code walkthrough preset inspired by remotion-dev/template-code-hike.",
    category: "full" as const,
    tags: ["code", "tutorial", "developer", "presentation"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 210,
  },
};

export default presetExport;
