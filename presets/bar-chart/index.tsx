import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

type BarData = { label: string; value: number };

const BAR_HEIGHT = 64;
const BAR_GAP = 28;
const STAGGER_FRAMES = 8;

const BarChart: React.FC<{
  title: string;
  showTitle: boolean;
  bar1Label: string;
  bar1Value: number;
  bar2Label: string;
  bar2Value: number;
  bar3Label: string;
  bar3Value: number;
  bar4Label: string;
  bar4Value: number;
  bar5Label: string;
  bar5Value: number;
  valueSuffix: string;
  barColor: string;
  trackColor: string;
  textColor: string;
  titleColor: string;
  backgroundColor: string;
  showValues: boolean;
}> = ({
  title,
  showTitle,
  bar1Label,
  bar1Value,
  bar2Label,
  bar2Value,
  bar3Label,
  bar3Value,
  bar4Label,
  bar4Value,
  bar5Label,
  bar5Value,
  valueSuffix,
  barColor,
  trackColor,
  textColor,
  titleColor,
  backgroundColor,
  showValues,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Collect non-empty bars
  const allBars: BarData[] = [
    { label: bar1Label, value: bar1Value },
    { label: bar2Label, value: bar2Value },
    { label: bar3Label, value: bar3Value },
    { label: bar4Label, value: bar4Value },
    { label: bar5Label, value: bar5Value },
  ].filter((b) => b.label.trim().length > 0);

  const maxValue = Math.max(...allBars.map((b) => b.value), 1);

  // Title animation
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const titleY = interpolate(titleProgress, [0, 1], [-30, 0]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Bars start animating after title
  const barsStartFrame = 12;

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        padding: 80,
        opacity: fadeOut,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {showTitle && (
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            color: titleColor,
            fontSize: 56,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-0.02em",
            marginBottom: 56,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: BAR_GAP }}>
        {allBars.map((bar, idx) => {
          const startFrame = barsStartFrame + idx * STAGGER_FRAMES;
          const labelOpacity = interpolate(
            frame,
            [startFrame, startFrame + 14],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const labelX = interpolate(
            frame,
            [startFrame, startFrame + 18],
            [-20, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );

          const fillProgress = interpolate(
            frame,
            [startFrame + 6, startFrame + 36],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }
          );
          const targetWidth = (bar.value / maxValue) * 100;
          const currentWidth = fillProgress * targetWidth;
          const animatedValue = bar.value * fillProgress;

          const valueOpacity = interpolate(
            frame,
            [startFrame + 12, startFrame + 30],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr 140px",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* Label */}
              <div
                style={{
                  opacity: labelOpacity,
                  transform: `translateX(${labelX}px)`,
                  color: textColor,
                  fontSize: 26,
                  fontWeight: 600,
                  fontFamily: "Inter, system-ui, sans-serif",
                  textAlign: "right",
                }}
              >
                {bar.label}
              </div>

              {/* Track + bar */}
              <div
                style={{
                  height: BAR_HEIGHT,
                  backgroundColor: trackColor,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${currentWidth}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: 8,
                    transition: "none",
                  }}
                />
              </div>

              {/* Value */}
              <div
                style={{
                  opacity: showValues ? valueOpacity : 0,
                  color: textColor,
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {Math.round(animatedValue).toLocaleString()}
                {valueSuffix}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: BarChart,

  schema: {
    title: {
      type: "text" as const,
      label: "Chart Title",
      default: "Q4 Revenue by Region",
      group: "Header",
    },
    showTitle: {
      type: "toggle" as const,
      label: "Show Title",
      default: true,
      group: "Header",
    },

    bar1Label: {
      type: "text" as const,
      label: "Bar 1 Label",
      default: "North America",
      group: "Data",
    },
    bar1Value: {
      type: "number" as const,
      label: "Bar 1 Value",
      default: 4200,
      min: 0,
      max: 1000000,
      step: 1,
      group: "Data",
    },
    bar2Label: {
      type: "text" as const,
      label: "Bar 2 Label",
      default: "Europe",
      group: "Data",
    },
    bar2Value: {
      type: "number" as const,
      label: "Bar 2 Value",
      default: 3100,
      min: 0,
      max: 1000000,
      step: 1,
      group: "Data",
    },
    bar3Label: {
      type: "text" as const,
      label: "Bar 3 Label",
      default: "Asia Pacific",
      group: "Data",
    },
    bar3Value: {
      type: "number" as const,
      label: "Bar 3 Value",
      default: 2800,
      min: 0,
      max: 1000000,
      step: 1,
      group: "Data",
    },
    bar4Label: {
      type: "text" as const,
      label: "Bar 4 Label",
      default: "Latin America",
      group: "Data",
    },
    bar4Value: {
      type: "number" as const,
      label: "Bar 4 Value",
      default: 1500,
      min: 0,
      max: 1000000,
      step: 1,
      group: "Data",
    },
    bar5Label: {
      type: "text" as const,
      label: "Bar 5 Label",
      default: "",
      group: "Data",
    },
    bar5Value: {
      type: "number" as const,
      label: "Bar 5 Value",
      default: 0,
      min: 0,
      max: 1000000,
      step: 1,
      group: "Data",
    },
    valueSuffix: {
      type: "text" as const,
      label: "Value Suffix",
      default: "",
      group: "Data",
    },
    showValues: {
      type: "toggle" as const,
      label: "Show Values",
      default: true,
      group: "Data",
    },

    barColor: {
      type: "color" as const,
      label: "Bar Fill",
      default: "#f59e0b",
      group: "Colors",
    },
    trackColor: {
      type: "color" as const,
      label: "Track",
      default: "#27272a",
      group: "Colors",
    },
    textColor: {
      type: "color" as const,
      label: "Label Color",
      default: "#fafafa",
      group: "Colors",
    },
    titleColor: {
      type: "color" as const,
      label: "Title Color",
      default: "#ffffff",
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
    name: "Bar Chart",
    description:
      "Animated horizontal bar chart with staggered reveal and counting values. Up to 5 bars — leave label empty to hide.",
    category: "chart" as const,
    tags: ["chart", "bar", "data", "comparison", "stats"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 180,
  },
};

export default presetExport;
