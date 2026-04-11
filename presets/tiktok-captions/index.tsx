import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const PHONE_WIDTH = 520;
const WORDS_PER_PAGE = 4;
const WORD_DURATION = 10;

const TikTokCaptions: React.FC<{
  headline: string;
  script: string;
  creator: string;
  backgroundStart: string;
  backgroundEnd: string;
  captionColor: string;
  highlightColor: string;
  showProgress: boolean;
}> = ({
  headline,
  script,
  creator,
  backgroundStart,
  backgroundEnd,
  captionColor,
  highlightColor,
  showProgress,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const words = script.split(/\s+/).filter(Boolean);
  const currentWordIndex = Math.min(
    words.length - 1,
    Math.floor(frame / WORD_DURATION)
  );
  const activePage = Math.floor(currentWordIndex / WORDS_PER_PAGE);
  const visibleWords = words.slice(
    activePage * WORDS_PER_PAGE,
    activePage * WORDS_PER_PAGE + WORDS_PER_PAGE
  );

  const phoneReveal = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 130,
      mass: 0.9,
    },
  });
  const backgroundScale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(140deg, ${backgroundStart}, ${backgroundEnd})`,
        opacity: fadeOut,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transform: `scale(${backgroundScale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.14), transparent 30%)",
          }}
        />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: PHONE_WIDTH,
          height: 980,
          marginLeft: -PHONE_WIDTH / 2,
          marginTop: -490,
          borderRadius: 52,
          padding: 26,
          background: "rgba(6, 6, 6, 0.86)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 26px 80px rgba(0,0,0,0.35)",
          transform: `translateY(${interpolate(phoneReveal, [0, 1], [90, 0])}px) scale(${interpolate(phoneReveal, [0, 1], [0.92, 1])})`,
        }}
      >
        <div
          style={{
            height: 340,
            borderRadius: 32,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(130deg, rgba(255,255,255,0.1), transparent 45%, rgba(255,255,255,0.14))",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 26,
              left: 26,
              right: 26,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: 26,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              @{creator}
            </span>
            <span
              style={{
                color: "white",
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.02,
              }}
            >
              {headline}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {visibleWords.map((word, index) => {
              const globalIndex = activePage * WORDS_PER_PAGE + index;
              const wordFrame = frame - globalIndex * WORD_DURATION;
              const isActive = globalIndex === currentWordIndex;
              const isPassed = globalIndex < currentWordIndex;
              const wordPop = spring({
                frame: wordFrame,
                fps,
                config: {
                  damping: 14,
                  stiffness: 180,
                  mass: 0.7,
                },
              });

              return (
                <span
                  key={`${word}-${globalIndex}`}
                  style={{
                    fontSize: 74,
                    fontWeight: 800,
                    lineHeight: 0.96,
                    padding: "8px 16px 14px",
                    borderRadius: 22,
                    backgroundColor:
                      isActive || isPassed ? "rgba(255,255,255,0.12)" : "transparent",
                    color: isActive ? highlightColor : captionColor,
                    transform: `scale(${interpolate(wordPop, [0, 1], [0.88, isActive ? 1.08 : 1])})`,
                    textShadow: isActive
                      ? `0 0 28px ${highlightColor}55`
                      : "0 8px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 24,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            <span>Word-by-word captions</span>
            <span>{Math.min(currentWordIndex + 1, words.length)}/{words.length}</span>
          </div>
        </div>

        {showProgress ? (
          <div
            style={{
              position: "absolute",
              left: 26,
              right: 26,
              bottom: 26,
              height: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressWidth}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${highlightColor}, ${captionColor})`,
              }}
            />
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.42))",
          mixBlendMode: "multiply",
        }}
      />
    </AbsoluteFill>
  );
};

const presetExport = {
  component: TikTokCaptions,
  schema: {
    headline: {
      type: "text" as const,
      label: "Headline",
      default: "How to make your hook hit harder",
      group: "Content",
    },
    script: {
      type: "text" as const,
      label: "Caption Script",
      default:
        "Open with the outcome keep the camera moving and let each word hit with intention.",
      group: "Content",
    },
    creator: {
      type: "text" as const,
      label: "Creator Handle",
      default: "motionkit",
      group: "Content",
    },
    backgroundStart: {
      type: "color" as const,
      label: "Background Start",
      default: "#131A5B",
      group: "Style",
    },
    backgroundEnd: {
      type: "color" as const,
      label: "Background End",
      default: "#E11D48",
      group: "Style",
    },
    captionColor: {
      type: "color" as const,
      label: "Caption Color",
      default: "#F8FAFC",
      group: "Style",
    },
    highlightColor: {
      type: "color" as const,
      label: "Highlight Color",
      default: "#FDE047",
      group: "Style",
    },
    showProgress: {
      type: "toggle" as const,
      label: "Show Progress Bar",
      default: true,
      group: "Style",
    },
  },
  meta: {
    name: "TikTok Captions",
    description:
      "Word-by-word caption preset inspired by remotion-dev/template-tiktok.",
    category: "social" as const,
    tags: ["tiktok", "captions", "social", "vertical"],
    author: "MotionKit",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 210,
  },
};

export default presetExport;
