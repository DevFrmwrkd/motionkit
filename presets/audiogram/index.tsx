import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const AudiogramPreset: React.FC<{
  title: string;
  speaker: string;
  excerpt: string;
  backgroundColor: string;
  cardColor: string;
  accentColor: string;
  textColor: string;
  visualizerStyle: string;
}> = ({
  title,
  speaker,
  excerpt,
  backgroundColor,
  cardColor,
  accentColor,
  textColor,
  visualizerStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();

  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 120,
      mass: 0.8,
    },
  });
  const pulse = interpolate(frame % 45, [0, 22, 44], [0.96, 1.06, 0.96], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const captionWords = excerpt.split(/\s+/).filter(Boolean);
  const visibleWordCount = Math.max(1, Math.floor(frame / 5));
  const visibleText = captionWords.slice(0, visibleWordCount).join(" ");

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        opacity: fadeOut,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: width - 160,
          borderRadius: 42,
          padding: 56,
          background: `linear-gradient(160deg, ${cardColor}, ${backgroundColor})`,
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.32)",
          transform: `translateY(${interpolate(reveal, [0, 1], [70, 0])}px) scale(${interpolate(reveal, [0, 1], [0.94, 1])})`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 42,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: 32,
              background: `radial-gradient(circle at 30% 30%, ${accentColor}, ${cardColor})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${pulse})`,
            }}
          >
            <div
              style={{
                width: 118,
                height: 118,
                borderRadius: 999,
                border: `12px solid ${textColor}`,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  color: `${textColor}AA`,
                  fontSize: 22,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                }}
              >
                Podcast Audiogram
              </span>
              <span
                style={{
                  color: textColor,
                  fontSize: 58,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {title}
              </span>
              <span
                style={{
                  color: accentColor,
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {speaker}
              </span>
            </div>

            <div
              style={{
                height: 150,
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {new Array(40).fill(true).map((_, index) => {
                const base = random(`audio-bar-${index}`);
                const wave =
                  Math.sin(frame / (visualizerStyle === "oscilloscope" ? 4 : 7) + index * 0.42) *
                  0.5 +
                  0.5;
                const height = interpolate(
                  wave * 0.75 + base * 0.25,
                  [0, 1],
                  visualizerStyle === "oscilloscope" ? [18, 92] : [26, 132],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                );

                return (
                  <div
                    key={index}
                    style={{
                      width: 10,
                      height,
                      borderRadius: 999,
                      background:
                        index % 3 === 0 ? accentColor : `${textColor}${visualizerStyle === "oscilloscope" ? "88" : "CC"}`,
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                minHeight: 110,
                color: textColor,
                fontSize: 32,
                lineHeight: 1.28,
              }}
            >
              {visibleText}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: AudiogramPreset,
  schema: {
    title: {
      type: "text" as const,
      label: "Title",
      default: "The Future of Motion Workflows",
      group: "Content",
    },
    speaker: {
      type: "text" as const,
      label: "Speaker",
      default: "Episode 14 with Theo Va",
      group: "Content",
    },
    excerpt: {
      type: "text" as const,
      label: "Excerpt",
      default:
        "Your visuals should move with the voice not compete with it and every beat should reinforce the story.",
      group: "Content",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#050816",
      group: "Style",
    },
    cardColor: {
      type: "color" as const,
      label: "Card Color",
      default: "#111827",
      group: "Style",
    },
    accentColor: {
      type: "color" as const,
      label: "Accent Color",
      default: "#22C55E",
      group: "Style",
    },
    textColor: {
      type: "color" as const,
      label: "Text Color",
      default: "#F8FAFC",
      group: "Style",
    },
    visualizerStyle: {
      type: "select" as const,
      label: "Visualizer Style",
      default: "spectrum",
      options: ["spectrum", "oscilloscope"],
      group: "Style",
    },
  },
  meta: {
    name: "Audiogram",
    description:
      "Podcast-style audiogram preset inspired by remotion-dev/template-audiogram.",
    category: "social" as const,
    tags: ["audiogram", "podcast", "audio", "social"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 240,
  },
};

export default presetExport;
