import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PresetSchema, PresetMeta, PresetExport } from "@/lib/types";

export const schema: PresetSchema = {
  titleText: {
    type: "text",
    label: "Text to display",
    default: "MotionKit",
    group: "Typography",
  },
  titleColor: {
    type: "color",
    label: "Text Color",
    default: "#ffffff",
    group: "Typography",
  },
  backgroundColor: {
    type: "color",
    label: "Background",
    default: "#09090b",
    group: "Background",
  },
};

export const meta: PresetMeta = {
  name: "Hello World",
  description: "A simple animated title preset",
  category: "title",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 150,
};

export const Component: React.FC<Record<string, unknown>> = ({
  titleText = schema.titleText.default,
  titleColor = schema.titleColor.default,
  backgroundColor = schema.backgroundColor.default,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the opacity from 0 to 1 over the first 30 frames
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scale animation with a spring
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 10,
    },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor as string, justifyContent: "center", alignItems: "center" }}>
      <h1
        style={{
          color: titleColor as string,
          opacity,
          transform: `scale(${scale})`,
          fontSize: "100px",
          fontWeight: "bold",
          fontFamily: "sans-serif",
        }}
      >
        {titleText as string}
      </h1>
    </AbsoluteFill>
  );
};

const preset: PresetExport = {
  schema,
  meta,
  component: Component,
};

export default preset;
