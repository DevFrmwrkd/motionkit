import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  leftText: {
    type: "text",
    label: "Left Label",
    default: "VS.",
    group: "Text",
  },
  rightText: {
    type: "text",
    label: "Right Label",
    default: "AI Expert",
    group: "Text",
  },
  leftColor: {
    type: "color",
    label: "Left Bar Color",
    default: "#3b82f6",
    group: "Style",
  },
  rightColor: {
    type: "color",
    label: "Right Bar Color",
    default: "#ec4899",
    group: "Style",
  },
};

export const meta: PresetMeta = {
  name: "Gemini Split Screen",
  description: "A dual-subject animated frame, perfect for podcasts and reaction videos.",
  category: "full",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 300,
};

export const Component: React.FC<Record<string, unknown>> = ({
  leftText = schema.leftText.default,
  rightText = schema.rightText.default,
  leftColor = schema.leftColor.default,
  rightColor = schema.rightColor.default,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide in from left/right over 30 frames
  const leftSlide = spring({ fps, frame, config: { damping: 14 } });
  const rightSlide = spring({ fps, frame: frame - 10, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", flexDirection: "row", padding: "120px", gap: "60px", fontFamily: "sans-serif" }}>
      {/* Left Frame */}
      <div style={{ flex: 1, border: `8px solid ${leftColor}`, borderRadius: "24px", position: "relative", transform: `translateX(${-50 + leftSlide * 50}px)`, opacity: interpolate(frame, [0, 20], [0, 1]), boxShadow: `0 0 60px ${leftColor}50`, overflow: "visible" }}>
        <div style={{ position: "absolute", bottom: "-30px", left: "50%", transform: "translateX(-50%)", background: leftColor as string, color: "white", padding: "12px 40px", borderRadius: "100px", fontSize: "28px", fontWeight: "bold", whiteSpace: "nowrap" }}>
          {leftText as string}
        </div>
      </div>
      
      {/* Right Frame */}
      <div style={{ flex: 1, border: `8px solid ${rightColor}`, borderRadius: "24px", position: "relative", transform: `translateX(${50 - rightSlide * 50}px)`, opacity: interpolate(frame, [10, 30], [0, 1]), boxShadow: `0 0 60px ${rightColor}50`, overflow: "visible" }}>
        <div style={{ position: "absolute", bottom: "-30px", left: "50%", transform: "translateX(-50%)", background: rightColor as string, color: "white", padding: "12px 40px", borderRadius: "100px", fontSize: "28px", fontWeight: "bold", whiteSpace: "nowrap" }}>
          {rightText as string}
        </div>
      </div>

      {/* VS Badge */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${spring({ fps, frame: frame - 20, config: { damping: 8 } })})`, background: "white", color: "black", width: "100px", height: "100px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: "900", fontStyle: "italic", zIndex: 10, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
        VS
      </div>
    </AbsoluteFill>
  );
};

const preset: PresetExport = { schema, meta, component: Component };
export default preset;
