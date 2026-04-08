import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  name: {
    type: "text",
    label: "Name",
    default: "Claude Sonnet",
    group: "Content",
  },
  role: {
    type: "text",
    label: "Role / Title",
    default: "AI Assistant",
    group: "Content",
  },
  barColor: {
    type: "color",
    label: "Accent Bar",
    default: "#f59e0b",
    group: "Style",
  },
  bgColor: {
    type: "color",
    label: "Card Background",
    default: "#18181b",
    group: "Style",
  },
  textColor: {
    type: "color",
    label: "Text Color",
    default: "#ffffff",
    group: "Style",
  },
  position: {
    type: "select",
    label: "Position",
    default: "bottom-left",
    options: ["bottom-left", "bottom-right", "top-left", "top-right"],
    group: "Layout",
  },
};

export const meta: PresetMeta = {
  name: "Claude Lower Third",
  description: "Professional lower-third name bar with slide-in animation",
  category: "lower-third",
  tags: ["lower-third", "name", "professional", "claude"],
  author: "Claude",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 180,
};

export const Component: React.FC<Record<string, unknown>> = ({
  name = schema.name.default,
  role = schema.role.default,
  barColor = schema.barColor.default,
  bgColor = schema.bgColor.default,
  textColor = schema.textColor.default,
  position = schema.position.default,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isRight = (position as string).includes("right");
  const isTop = (position as string).includes("top");

  // Slide in
  const slideIn = spring({ fps, frame, config: { damping: 14, stiffness: 80 } });
  const slideX = interpolate(slideIn, [0, 1], [isRight ? 400 : -400, 0]);

  // Accent bar width
  const barWidth = spring({ fps, frame: frame - 5, config: { damping: 12, stiffness: 60 } });
  const barW = interpolate(barWidth, [0, 1], [0, 6]);

  // Text fade
  const nameOpacity = interpolate(frame, [12, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const roleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slide out
  const slideOut = interpolate(frame, [durationInFrames - 25, durationInFrames - 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slideOutX = interpolate(slideOut, [0, 1], [0, isRight ? 400 : -400]);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <div
        style={{
          position: "absolute",
          [isTop ? "top" : "bottom"]: 80,
          [isRight ? "right" : "left"]: 60,
          display: "flex",
          alignItems: "stretch",
          transform: `translateX(${slideX + slideOutX}px)`,
          gap: 0,
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: barW,
            backgroundColor: barColor as string,
            borderRadius: 3,
            flexShrink: 0,
          }}
        />

        {/* Card */}
        <div
          style={{
            backgroundColor: bgColor as string,
            padding: "16px 28px",
            borderRadius: isRight ? "8px 0 0 8px" : "0 8px 8px 0",
            minWidth: 280,
          }}
        >
          <div
            style={{
              color: textColor as string,
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "sans-serif",
              opacity: nameOpacity,
              lineHeight: 1.2,
            }}
          >
            {name as string}
          </div>
          <div
            style={{
              color: barColor as string,
              fontSize: 16,
              fontWeight: 500,
              fontFamily: "sans-serif",
              opacity: roleOpacity,
              marginTop: 4,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {role as string}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
