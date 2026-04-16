import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

const ShimmerTitle: React.FC<{
  title: string;
  subtitle: string;
  showSub: boolean;
  fontSize: number;
  baseColor: string;
  shimmerColor: string;
  subColor: string;
  backgroundColor: string;
  shimmerSpeed: number;
  shimmerWidth: number;
  showUnderline: boolean;
}> = ({
  title,
  subtitle,
  showSub,
  fontSize,
  baseColor,
  shimmerColor,
  subColor,
  backgroundColor,
  shimmerSpeed,
  shimmerWidth,
  showUnderline,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Reveal — slide + fade
  const reveal = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  const titleY = interpolate(reveal, [0, 1], [40, 0]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Shimmer position — sweep from -50% to 150% over `shimmerSpeed` seconds, then loop
  const sweepDuration = (60 / shimmerSpeed); // frames per full sweep
  const sweepPos = ((frame % sweepDuration) / sweepDuration) * 200 - 50;

  // Underline draws in
  const underlineProgress = spring({
    frame: frame - 18,
    fps,
    config: { damping: 18, stiffness: 90 },
  });

  // Subtitle reveal
  const subOpacity = interpolate(frame, [22, 42], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [22, 42], [16, 0], {
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Build the gradient. We use background-clip:text to mask the gradient onto the text.
  const shimmerBg = `linear-gradient(110deg, ${baseColor} 0%, ${baseColor} ${
    sweepPos - shimmerWidth / 2
  }%, ${shimmerColor} ${sweepPos}%, ${baseColor} ${
    sweepPos + shimmerWidth / 2
  }%, ${baseColor} 100%)`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 800,
            fontFamily:
              "'Inter', 'SF Pro Display', system-ui, sans-serif",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            background: shimmerBg,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
          }}
        >
          {title}
        </div>

        {/* Underline */}
        {showUnderline && (
          <div
            style={{
              height: 4,
              width: `${interpolate(underlineProgress, [0, 1], [0, 100])}%`,
              backgroundColor: shimmerColor,
              margin: "20px auto 0",
              borderRadius: 2,
              boxShadow: `0 0 24px ${shimmerColor}`,
            }}
          />
        )}

        {showSub && (
          <div
            style={{
              opacity: subOpacity,
              transform: `translateY(${subY}px)`,
              fontSize: fontSize * 0.22,
              fontWeight: 500,
              fontFamily: "Inter, system-ui, sans-serif",
              color: subColor,
              marginTop: 28,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: ShimmerTitle,

  schema: {
    title: {
      type: "text" as const,
      label: "Title",
      default: "Premium Quality",
      group: "Content",
    },
    subtitle: {
      type: "text" as const,
      label: "Subtitle",
      default: "Crafted with care",
      group: "Content",
    },
    showSub: {
      type: "toggle" as const,
      label: "Show Subtitle",
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
    shimmerSpeed: {
      type: "number" as const,
      label: "Shimmer Speed",
      default: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: "Animation",
    },
    shimmerWidth: {
      type: "number" as const,
      label: "Shimmer Width",
      default: 30,
      min: 10,
      max: 80,
      step: 2,
      group: "Animation",
    },
    showUnderline: {
      type: "toggle" as const,
      label: "Show Underline",
      default: true,
      group: "Style",
    },
    baseColor: {
      type: "color" as const,
      label: "Base Color",
      default: "#52525b",
      group: "Colors",
    },
    shimmerColor: {
      type: "color" as const,
      label: "Shimmer Color",
      default: "#fafafa",
      group: "Colors",
    },
    subColor: {
      type: "color" as const,
      label: "Subtitle Color",
      default: "#a1a1aa",
      group: "Colors",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#09090b",
      group: "Colors",
    },
  },

  meta: {
    name: "Shimmer Title",
    description:
      "Title with a continuous metallic shimmer sweeping across the text. Luxury, premium, and brand reveal energy.",
    category: "title" as const,
    tags: ["title", "shimmer", "luxury", "premium", "metallic"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 180,
  },
};

export default presetExport;
