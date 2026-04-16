import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

const NumberCounter: React.FC<{
  startValue: number;
  endValue: number;
  prefix: string;
  suffix: string;
  decimals: number;
  thousandsSeparator: boolean;
  label: string;
  showLabel: boolean;
  numberColor: string;
  labelColor: string;
  backgroundColor: string;
  fontSize: number;
  countDuration: number;
}> = ({
  startValue,
  endValue,
  prefix,
  suffix,
  decimals,
  thousandsSeparator,
  label,
  showLabel,
  numberColor,
  labelColor,
  backgroundColor,
  fontSize,
  countDuration,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Pop in
  const popProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.6 },
  });
  const scale = interpolate(popProgress, [0, 1], [0.6, 1]);
  const popOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Count animation — easeOutExpo for that satisfying deceleration
  const countFrames = Math.max(1, countDuration * fps);
  const countProgress = interpolate(
    frame - 6,
    [0, countFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }
  );
  const currentValue = startValue + (endValue - startValue) * countProgress;

  // Format the number
  const formatted = (() => {
    const fixed = currentValue.toFixed(decimals);
    if (!thousandsSeparator) return fixed;
    const [intPart, decPart] = fixed.split(".");
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart ? `${withSep}.${decPart}` : withSep;
  })();

  // Label fades in after counter starts
  const labelOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out at end
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
      <div
        style={{
          opacity: popOpacity,
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: numberColor,
            fontSize,
            fontWeight: 800,
            fontFamily:
              "'Inter', 'SF Pro Display', system-ui, sans-serif",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            display: "flex",
            alignItems: "baseline",
          }}
        >
          {prefix && (
            <span style={{ fontSize: fontSize * 0.55, marginRight: 4 }}>
              {prefix}
            </span>
          )}
          <span>{formatted}</span>
          {suffix && (
            <span style={{ fontSize: fontSize * 0.55, marginLeft: 4 }}>
              {suffix}
            </span>
          )}
        </div>

        {showLabel && (
          <div
            style={{
              opacity: labelOpacity,
              color: labelColor,
              fontSize: fontSize * 0.18,
              fontWeight: 500,
              fontFamily: "Inter, system-ui, sans-serif",
              marginTop: 24,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
            }}
          >
            {label}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const presetExport = {
  component: NumberCounter,

  schema: {
    startValue: {
      type: "number" as const,
      label: "Start Value",
      default: 0,
      min: 0,
      max: 1000000,
      step: 1,
      group: "Content",
    },
    endValue: {
      type: "number" as const,
      label: "End Value",
      default: 12500,
      min: 0,
      max: 10000000,
      step: 1,
      group: "Content",
    },
    prefix: {
      type: "text" as const,
      label: "Prefix",
      default: "$",
      group: "Content",
    },
    suffix: {
      type: "text" as const,
      label: "Suffix",
      default: "",
      group: "Content",
    },
    decimals: {
      type: "number" as const,
      label: "Decimal Places",
      default: 0,
      min: 0,
      max: 4,
      step: 1,
      group: "Content",
    },
    thousandsSeparator: {
      type: "toggle" as const,
      label: "Thousands Separator",
      default: true,
      group: "Content",
    },
    label: {
      type: "text" as const,
      label: "Caption",
      default: "Revenue Generated",
      group: "Content",
    },
    showLabel: {
      type: "toggle" as const,
      label: "Show Caption",
      default: true,
      group: "Content",
    },
    countDuration: {
      type: "number" as const,
      label: "Count Duration (sec)",
      default: 2.0,
      min: 0.5,
      max: 6,
      step: 0.1,
      group: "Animation",
    },
    fontSize: {
      type: "number" as const,
      label: "Number Size",
      default: 220,
      min: 80,
      max: 360,
      step: 4,
      group: "Typography",
    },
    numberColor: {
      type: "color" as const,
      label: "Number Color",
      default: "#f59e0b",
      group: "Colors",
    },
    labelColor: {
      type: "color" as const,
      label: "Caption Color",
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
    name: "Number Counter",
    description:
      "Animated count-up with prefix/suffix, decimals, and thousands separator. Perfect for stats, metrics, and revenue reveals.",
    category: "chart" as const,
    tags: ["number", "counter", "stat", "kpi", "metric"],
    author: "MotionKit",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 120,
  },
};

export default presetExport;
