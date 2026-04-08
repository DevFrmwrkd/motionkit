import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  headline: {
    type: "text",
    label: "Headline",
    default: "Subscribe Now",
    group: "Content",
  },
  subtext: {
    type: "text",
    label: "Subtext",
    default: "Join 10k+ creators building with AI",
    group: "Content",
  },
  buttonText: {
    type: "text",
    label: "Button Text",
    default: "Get Started",
    group: "Content",
  },
  accentColor: {
    type: "color",
    label: "Accent Color",
    default: "#f59e0b",
    group: "Style",
  },
  bgColor: {
    type: "color",
    label: "Background",
    default: "#09090b",
    group: "Style",
  },
  showPulse: {
    type: "toggle",
    label: "Pulse Effect",
    default: true,
    group: "Animation",
  },
};

export const meta: PresetMeta = {
  name: "Claude Call to Action",
  description: "Attention-grabbing CTA with pulse animation and bold typography",
  category: "cta",
  tags: ["cta", "subscribe", "pulse", "claude"],
  author: "Claude",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 120,
};

export const Component: React.FC<Record<string, unknown>> = ({
  headline = schema.headline.default,
  subtext = schema.subtext.default,
  buttonText = schema.buttonText.default,
  accentColor = schema.accentColor.default,
  bgColor = schema.bgColor.default,
  showPulse = schema.showPulse.default,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance
  const scaleIn = spring({ fps, frame, config: { damping: 12, stiffness: 80 } });
  const headlineY = interpolate(scaleIn, [0, 1], [60, 0]);
  const headlineOpacity = interpolate(scaleIn, [0, 1], [0, 1]);

  const subtextOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtextY = interpolate(frame, [20, 40], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Button entrance
  const btnSpring = spring({ fps, frame: frame - 30, config: { damping: 10, stiffness: 100 } });
  const btnScale = interpolate(btnSpring, [0, 1], [0.5, 1]);
  const btnOpacity = interpolate(btnSpring, [0, 1], [0, 1]);

  // Pulse
  const pulseScale = showPulse
    ? 1 + Math.sin(frame * 0.15) * 0.04
    : 1;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor as string,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Glow behind */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor as string}22, transparent 70%)`,
          transform: `scale(${pulseScale * 1.5})`,
        }}
      />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h1
          style={{
            color: "#fff",
            fontSize: 80,
            fontWeight: 800,
            fontFamily: "sans-serif",
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            margin: 0,
          }}
        >
          {headline as string}
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 26,
            fontFamily: "sans-serif",
            opacity: subtextOpacity,
            transform: `translateY(${subtextY}px)`,
            marginTop: 16,
          }}
        >
          {subtext as string}
        </p>

        {/* Button */}
        <div
          style={{
            marginTop: 40,
            opacity: btnOpacity,
            transform: `scale(${btnScale * pulseScale})`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              backgroundColor: accentColor as string,
              color: bgColor as string,
              fontSize: 24,
              fontWeight: 700,
              fontFamily: "sans-serif",
              padding: "16px 48px",
              borderRadius: 12,
              letterSpacing: 1,
            }}
          >
            {buttonText as string}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
