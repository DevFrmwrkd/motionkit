import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

const LowerThird: React.FC<{
  name: string;
  role: string;
  accentColor: string;
  textColor: string;
  barColor: string;
  position: string;
  fontSize: number;
}> = ({ name, role, accentColor, textColor, barColor, position, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Accent bar slides in from left
  const barProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.7 },
  });
  const barWidth = interpolate(barProgress, [0, 1], [0, 8]);

  // Backing plate scales horizontally after bar lands
  const plateProgress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  const plateScaleX = interpolate(plateProgress, [0, 1], [0, 1]);

  // Name fades + slides in once plate has revealed
  const nameOpacity = interpolate(frame, [14, 28], [0, 1], {
    extrapolateRight: "clamp",
  });
  const nameX = interpolate(frame, [14, 32], [-20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Role follows the name with a small stagger
  const roleOpacity = interpolate(frame, [22, 38], [0, 1], {
    extrapolateRight: "clamp",
  });
  const roleX = interpolate(frame, [22, 42], [-20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Exit: collapse plate + bar near end
  const exitStart = durationInFrames - 18;
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isBottom = position === "bottom";
  const verticalAnchor = isBottom ? { bottom: 120 } : { top: 120 };

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <div
        style={{
          position: "absolute",
          left: 100,
          ...verticalAnchor,
          display: "flex",
          alignItems: "stretch",
          gap: 16,
          opacity: exitProgress,
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: barWidth,
            backgroundColor: accentColor,
            borderRadius: 2,
            alignSelf: "stretch",
            minHeight: fontSize * 1.6,
          }}
        />

        {/* Backing plate + text */}
        <div
          style={{
            backgroundColor: barColor,
            padding: "16px 28px",
            borderRadius: 4,
            transform: `scaleX(${plateScaleX})`,
            transformOrigin: "left center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 280,
          }}
        >
          <div
            style={{
              opacity: nameOpacity,
              transform: `translateX(${nameX}px)`,
              color: textColor,
              fontSize,
              fontWeight: 700,
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              opacity: roleOpacity * 0.75,
              transform: `translateX(${roleX}px)`,
              color: textColor,
              fontSize: fontSize * 0.42,
              fontWeight: 500,
              fontFamily: "Inter, system-ui, sans-serif",
              marginTop: 6,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: LowerThird,

  schema: {
    name: {
      type: "text" as const,
      label: "Name",
      default: "Jane Doe",
      group: "Content",
    },
    role: {
      type: "text" as const,
      label: "Role / Title",
      default: "Founder & CEO",
      group: "Content",
    },
    position: {
      type: "select" as const,
      label: "Position",
      default: "bottom",
      options: ["bottom", "top"],
      group: "Layout",
    },
    fontSize: {
      type: "number" as const,
      label: "Name Size",
      default: 56,
      min: 28,
      max: 120,
      step: 2,
      group: "Typography",
    },
    accentColor: {
      type: "color" as const,
      label: "Accent Bar",
      default: "#f59e0b",
      group: "Colors",
    },
    textColor: {
      type: "color" as const,
      label: "Text Color",
      default: "#ffffff",
      group: "Colors",
    },
    barColor: {
      type: "color" as const,
      label: "Plate Color",
      default: "#0a0a0a",
      group: "Colors",
    },
  },

  meta: {
    name: "Lower Third",
    description:
      "Name + role identifier with animated accent bar — classic broadcast-style lower third.",
    category: "lower-third" as const,
    tags: ["lower-third", "name", "broadcast", "interview"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 150,
  },
};

export default presetExport;
