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

const STAR_COUNT = 18;

const StargazerPreset: React.FC<{
  repoName: string;
  owner: string;
  stars: number;
  pullRequests: number;
  accentColor: string;
  gradientStart: string;
  gradientEnd: string;
  showCockpit: boolean;
}> = ({
  repoName,
  owner,
  stars,
  pullRequests,
  accentColor,
  gradientStart,
  gradientEnd,
  showCockpit,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const cockpitReveal = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 120,
      mass: 0.85,
    },
  });
  const animatedStars = Math.round(
    interpolate(frame, [0, durationInFrames - 24], [0, stars], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% 20%, ${gradientStart}, ${gradientEnd})`,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 75% 30%, rgba(255,255,255,0.18), transparent 22%), radial-gradient(circle at 45% 75%, rgba(255,255,255,0.1), transparent 26%)",
        }}
      />

      {new Array(STAR_COUNT).fill(true).map((_, index) => {
        const delay = index * 7;
        const travel = spring({
          frame: frame - delay,
          fps,
          config: {
            damping: 12,
            stiffness: 90,
            mass: 0.7,
          },
        });
        const startX = random(`star-x-${index}`) * width * 0.72;
        const startY = random(`star-y-${index}`) * height;
        const endX = width * (0.72 + random(`star-end-x-${index}`) * 0.16);
        const endY = height * (0.28 + random(`star-end-y-${index}`) * 0.44);
        const x = interpolate(travel, [0, 1], [startX, endX]);
        const y = interpolate(travel, [0, 1], [startY, endY]);
        const scale = interpolate(travel, [0, 1], [0.4, 1.2]);
        const opacity = interpolate(travel, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 26,
              height: 26,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${frame * 3 + index * 18}deg)`,
              opacity,
              color: index % 2 === 0 ? accentColor : "#F8FAFC",
            }}
          >
            ★
          </div>
        );
      })}

      {showCockpit ? (
        <div
          style={{
            position: "absolute",
            right: 96,
            top: 104,
            bottom: 104,
            width: 620,
            borderRadius: 36,
            padding: 40,
            background: "rgba(3,7,18,0.62)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 28px 80px rgba(0,0,0,0.32)",
            transform: `translateY(${interpolate(cockpitReveal, [0, 1], [40, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <span
              style={{
                color: "rgba(248,250,252,0.72)",
                fontSize: 20,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Stargazer
            </span>
            <span
              style={{
                color: "#F8FAFC",
                fontSize: 58,
                fontWeight: 700,
                lineHeight: 1.02,
              }}
            >
              {repoName}
            </span>
            <span
              style={{
                color: `${accentColor}`,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {owner}
            </span>
          </div>

          <div
            style={{
              marginTop: 34,
              padding: 26,
              borderRadius: 28,
              background: "rgba(255,255,255,0.04)",
              display: "grid",
              gap: 20,
            }}
          >
            <Metric
              label="Stars given"
              value={animatedStars.toLocaleString()}
              accentColor={accentColor}
            />
            <Metric
              label="Pull requests"
              value={pullRequests.toLocaleString()}
              accentColor="#F8FAFC"
            />
          </div>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 10,
            }}
          >
            {new Array(12).fill(true).map((_, index) => {
              const on = index < Math.min(animatedStars, 12);
              return (
                <div
                  key={index}
                  style={{
                    height: 16,
                    borderRadius: 999,
                    backgroundColor: on ? accentColor : "rgba(255,255,255,0.1)",
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Metric: React.FC<{
  label: string;
  value: string;
  accentColor: string;
}> = ({ label, value, accentColor }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          color: "rgba(248,250,252,0.68)",
          fontSize: 20,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: accentColor,
          fontSize: 44,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
};

const presetExport = {
  component: StargazerPreset,
  schema: {
    repoName: {
      type: "text" as const,
      label: "Repository",
      default: "motionkit",
      group: "Content",
    },
    owner: {
      type: "text" as const,
      label: "Owner",
      default: "theo-va",
      group: "Content",
    },
    stars: {
      type: "number" as const,
      label: "Stars",
      default: 1280,
      min: 0,
      max: 200000,
      step: 10,
      group: "Content",
    },
    pullRequests: {
      type: "number" as const,
      label: "Pull Requests",
      default: 142,
      min: 0,
      max: 50000,
      step: 1,
      group: "Content",
    },
    accentColor: {
      type: "color" as const,
      label: "Accent",
      default: "#FBBF24",
      group: "Style",
    },
    gradientStart: {
      type: "color" as const,
      label: "Gradient Start",
      default: "#0F172A",
      group: "Style",
    },
    gradientEnd: {
      type: "color" as const,
      label: "Gradient End",
      default: "#312E81",
      group: "Style",
    },
    showCockpit: {
      type: "toggle" as const,
      label: "Show Cockpit",
      default: true,
      group: "Style",
    },
  },
  meta: {
    name: "Stargazer",
    description:
      "GitHub stars celebration preset inspired by remotion-dev/github-unwrapped StarsGiven.",
    category: "full" as const,
    tags: ["github", "stars", "celebration", "stats"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 210,
  },
};

export default presetExport;
