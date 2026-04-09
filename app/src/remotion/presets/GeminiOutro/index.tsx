import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  subscribeText: {
    type: "text",
    label: "Main Action",
    default: "Subscribe for more",
    group: "Content",
  },
  channelName: {
    type: "text",
    label: "Channel/Brand",
    default: "Gemini Studios",
    group: "Content",
  },
  accentColor: {
    type: "color",
    label: "Accent Color",
    default: "#ef4444",
    group: "Style",
  },
};

export const meta: PresetMeta = {
  name: "Gemini Video Outro",
  description: "A standard YouTube-style end screen with video placeholders.",
  category: "outro",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 240,
};

export const Component: React.FC<Record<string, unknown>> = ({
  subscribeText = schema.subscribeText.default,
  channelName = schema.channelName.default,
  accentColor = schema.accentColor.default,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in background over 30 frames
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  
  // Spring in the video boxes
  const boxScale = spring({ fps, frame: frame - 15, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(15, 15, 20, ${bgOpacity})`, fontFamily: "sans-serif", padding: "80px", color: "white", display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: "64px", fontWeight: "bold", margin: "0 0 10px 0" }}>{subscribeText as string}</h1>
      <h2 style={{ fontSize: "32px", color: accentColor as string, margin: "0 0 60px 0" }}>{channelName as string}</h2>

      <div style={{ display: "flex", gap: "60px", flex: 1, alignItems: "center", justifyContent: "center", transform: `scale(${boxScale})` }}>
        {/* Previous Video Box */}
        <div style={{ width: "640px", height: "360px", backgroundColor: "rgba(255,255,255,0.05)", border: `4px solid ${accentColor}`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "rgba(255,255,255,0.5)", fontWeight: "bold", boxShadow: `0 0 40px ${accentColor}40` }}>
          PREVIOUS VIDEO
        </div>
        
        {/* Recommended Box */}
        <div style={{ width: "640px", height: "360px", backgroundColor: "rgba(255,255,255,0.05)", border: `4px solid ${accentColor}`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "rgba(255,255,255,0.5)", fontWeight: "bold", boxShadow: `0 0 40px ${accentColor}40` }}>
          RECOMMENDED
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "auto", fontSize: "20px", color: "rgba(255,255,255,0.4)" }}>
        Thank you for watching!
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
