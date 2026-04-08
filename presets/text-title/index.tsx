import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

const TextTitle: React.FC<{
  title: string;
  subtitle: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontSize: number;
  showSubtitle: boolean;
}> = ({
  title,
  subtitle,
  primaryColor,
  accentColor,
  backgroundColor,
  fontSize,
  showSubtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Title animation
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.8 },
  });

  const titleY = interpolate(titleProgress, [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Accent line animation
  const lineWidth = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [25, 45], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Fade out near end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Accent line */}
      <div
        style={{
          width: interpolate(lineWidth, [0, 1], [0, 120]),
          height: 4,
          backgroundColor: accentColor,
          borderRadius: 2,
          marginBottom: 24,
        }}
      />

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          color: primaryColor,
          fontSize,
          fontWeight: 700,
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          maxWidth: "80%",
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {showSubtitle && (
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            color: primaryColor,
            fontSize: fontSize * 0.35,
            fontWeight: 400,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 16,
            textAlign: "center",
            opacity: subtitleOpacity * 0.7,
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

const presetExport = {
  component: TextTitle,

  schema: {
    title: {
      type: "text" as const,
      label: "Title",
      default: "MOTION KIT",
      group: "Content",
    },
    subtitle: {
      type: "text" as const,
      label: "Subtitle",
      default: "Professional Motion Graphics",
      group: "Content",
    },
    showSubtitle: {
      type: "toggle" as const,
      label: "Show Subtitle",
      default: true,
      group: "Content",
    },
    primaryColor: {
      type: "color" as const,
      label: "Text Color",
      default: "#ffffff",
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
    fontSize: {
      type: "number" as const,
      label: "Font Size",
      default: 80,
      min: 32,
      max: 160,
      step: 4,
      group: "Typography",
    },
  },

  meta: {
    name: "Text Title",
    description: "Animated text title with accent line and optional subtitle",
    category: "title" as const,
    tags: ["text", "title", "animated", "minimal"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 90,
  },
};

export default presetExport;
