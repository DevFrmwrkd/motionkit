import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const Row: React.FC<{
  text: string;
  separator: string;
  speed: number;
  reverse: boolean;
  fontSize: number;
  color: string;
  rowHeight: number;
  italic: boolean;
}> = ({ text, separator, speed, reverse, fontSize, color, rowHeight, italic }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Build a long enough strip — repeat the text many times
  const segment = `${text}${separator}`;
  const strip = segment.repeat(20);

  // Pixels per second — controlled by speed (1 = ~200 px/s)
  const pxPerFrame = speed * 6.66; // ~200 px/sec at 30fps
  const direction = reverse ? 1 : -1;
  const offset = ((frame * pxPerFrame * direction) % (width * 1.5));

  return (
    <div
      style={{
        height: rowHeight,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: reverse ? -width : 0,
          whiteSpace: "nowrap",
          transform: `translateX(${offset}px)`,
          fontSize,
          fontWeight: 800,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontStyle: italic ? "italic" : "normal",
          color,
          letterSpacing: "-0.02em",
          textTransform: "uppercase" as const,
        }}
      >
        {strip}
      </div>
    </div>
  );
};

const MarqueeBanner: React.FC<{
  row1Text: string;
  row2Text: string;
  row3Text: string;
  separator: string;
  speed: number;
  fontSize: number;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fadeEdges: boolean;
  rotation: number;
}> = ({
  row1Text,
  row2Text,
  row3Text,
  separator,
  speed,
  fontSize,
  primaryColor,
  accentColor,
  backgroundColor,
  fadeEdges,
  rotation,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const rows = [row1Text, row2Text, row3Text].filter(
    (r) => r.trim().length > 0
  );

  const rowHeight = fontSize * 1.4;
  const totalHeight = rows.length * rowHeight;

  const sep = ` ${separator} `;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        overflow: "hidden",
        opacity: fadeIn * fadeOut,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: width * 1.6,
          height: totalHeight,
          transform: `rotate(${rotation}deg)`,
          position: "relative",
          maskImage: fadeEdges
            ? "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
            : undefined,
          WebkitMaskImage: fadeEdges
            ? "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
            : undefined,
        }}
      >
        {rows.map((text, i) => (
          <Row
            key={i}
            text={text}
            separator={sep}
            speed={speed * (1 + i * 0.15)}
            reverse={i % 2 === 1}
            fontSize={fontSize}
            color={i % 2 === 1 ? accentColor : primaryColor}
            rowHeight={rowHeight}
            italic={i === 1}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: MarqueeBanner as React.FC<Record<string, unknown>>,

  schema: {
    row1Text: {
      type: "text" as const,
      label: "Row 1",
      default: "Now Booking — Q3 2026",
      group: "Content",
    },
    row2Text: {
      type: "text" as const,
      label: "Row 2",
      default: "Limited Spots Available",
      group: "Content",
    },
    row3Text: {
      type: "text" as const,
      label: "Row 3",
      default: "Apply Now",
      group: "Content",
    },
    separator: {
      type: "text" as const,
      label: "Separator",
      default: "★",
      group: "Content",
    },
    speed: {
      type: "number" as const,
      label: "Scroll Speed",
      default: 1,
      min: 0.2,
      max: 4,
      step: 0.1,
      group: "Animation",
    },
    rotation: {
      type: "number" as const,
      label: "Rotation (deg)",
      default: -6,
      min: -45,
      max: 45,
      step: 1,
      group: "Layout",
    },
    fontSize: {
      type: "number" as const,
      label: "Font Size",
      default: 110,
      min: 40,
      max: 240,
      step: 4,
      group: "Typography",
    },
    primaryColor: {
      type: "color" as const,
      label: "Primary Color",
      default: "#fafafa",
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
    fadeEdges: {
      type: "toggle" as const,
      label: "Fade Edges",
      default: true,
      group: "Look",
    },
  },

  meta: {
    name: "Marquee Banner",
    description:
      "Multi-row scrolling text banner with alternating directions and rotation. Promo, hype, fashion-week energy.",
    category: "full" as const,
    tags: ["marquee", "scrolling", "promo", "banner", "hype"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 240,
  },
};

export default presetExport;
