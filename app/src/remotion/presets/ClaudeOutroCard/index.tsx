import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  channelName: {
    type: "text",
    label: "Channel Name",
    default: "FRMWRKD",
    group: "Content",
  },
  tagline: {
    type: "text",
    label: "Tagline",
    default: "Thanks for watching",
    group: "Content",
  },
  showSocials: {
    type: "toggle",
    label: "Show Social Handles",
    default: true,
    group: "Content",
  },
  socialHandle: {
    type: "text",
    label: "Social Handle",
    default: "@frmwrkd",
    group: "Content",
  },
  accentColor: {
    type: "color",
    label: "Accent Color",
    default: "#8b5cf6",
    group: "Style",
  },
  bgColor: {
    type: "color",
    label: "Background",
    default: "#09090b",
    group: "Style",
  },
  cardColor: {
    type: "color",
    label: "Card Color",
    default: "#18181b",
    group: "Style",
  },
};

export const meta: PresetMeta = {
  name: "Claude Outro Card",
  description: "Clean outro card with channel branding and social handles",
  category: "outro",
  tags: ["outro", "end-screen", "branding", "claude"],
  author: "Claude",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 150,
};

export const Component: React.FC<Record<string, unknown>> = (props) => {
  const channelName = (props.channelName ?? schema.channelName.default) as string;
  const tagline = (props.tagline ?? schema.tagline.default) as string;
  const showSocials = (props.showSocials ?? schema.showSocials.default) as boolean;
  const socialHandle = (props.socialHandle ?? schema.socialHandle.default) as string;
  const accentColor = (props.accentColor ?? schema.accentColor.default) as string;
  const bgColor = (props.bgColor ?? schema.bgColor.default) as string;
  const cardColor = (props.cardColor ?? schema.cardColor.default) as string;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Card scale in
  const cardSpring = spring({ fps, frame, config: { damping: 14, stiffness: 70 } });
  const cardScale = interpolate(cardSpring, [0, 1], [0.8, 1]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Channel name
  const nameOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nameY = interpolate(frame, [15, 30], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Divider
  const dividerWidth = interpolate(frame, [30, 50], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Social
  const socialOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Floating particles
  const particles = [0, 1, 2, 3, 4].map((i) => ({
    x: 200 + i * 350 + Math.sin(frame * 0.02 + i) * 30,
    y: 150 + Math.cos(frame * 0.03 + i * 2) * 40 + i * 150,
    size: 4 + i * 2,
    opacity: 0.1 + Math.sin(frame * 0.05 + i) * 0.05,
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: accentColor,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Card */}
      <div
        style={{
          backgroundColor: cardColor,
          borderRadius: 24,
          padding: "60px 80px",
          textAlign: "center",
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          border: `1px solid ${accentColor}22`,
          boxShadow: `0 0 80px ${accentColor}11`,
          minWidth: 600,
        }}
      >
        {/* Channel name */}
        <h1
          style={{
            color: "#fff",
            fontSize: 56,
            fontWeight: 800,
            fontFamily: "sans-serif",
            margin: 0,
            opacity: nameOpacity,
            transform: `translateY(${nameY}px)`,
            letterSpacing: 3,
          }}
        >
          {channelName}
        </h1>

        {/* Tagline */}
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 22,
            fontFamily: "sans-serif",
            opacity: tagOpacity,
            marginTop: 12,
          }}
        >
          {tagline}
        </p>

        {/* Divider */}
        <div
          style={{
            width: dividerWidth,
            height: 3,
            backgroundColor: accentColor,
            margin: "24px auto",
            borderRadius: 2,
          }}
        />

        {/* Social */}
        {showSocials && (
          <p
            style={{
              color: accentColor,
              fontSize: 20,
              fontFamily: "sans-serif",
              opacity: socialOpacity,
              letterSpacing: 2,
            }}
          >
            {socialHandle}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
