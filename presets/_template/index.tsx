import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// --- Component ---
const TemplatePreset: React.FC<{
  title: string;
  subtitle: string;
  primaryColor: string;
  backgroundColor: string;
}> = ({ title, subtitle, primaryColor, backgroundColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const subtitleOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${interpolate(titleY, [0, 1], [50, 0])}px)`,
          color: primaryColor,
          fontSize: 80,
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          textAlign: "center",
        }}
      >
        {title}
      </div>
      <div
        style={{
          opacity: subtitleOpacity,
          color: primaryColor,
          fontSize: 32,
          fontWeight: 400,
          fontFamily: "Inter, sans-serif",
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

// --- Preset Export (the contract) ---
const presetExport = {
  component: TemplatePreset,

  schema: {
    title: {
      type: "text" as const,
      label: "Title",
      default: "Your Title Here",
      group: "Content",
    },
    subtitle: {
      type: "text" as const,
      label: "Subtitle",
      default: "Your subtitle goes here",
      group: "Content",
    },
    primaryColor: {
      type: "color" as const,
      label: "Text Color",
      default: "#ffffff",
      group: "Colors",
    },
    backgroundColor: {
      type: "color" as const,
      label: "Background",
      default: "#0a0a0a",
      group: "Colors",
    },
  },

  meta: {
    name: "Template Preset",
    description: "A starter template for building MotionKit presets",
    category: "title" as const,
    tags: ["template", "starter", "text"],
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 90,
  },
};

export default presetExport;
