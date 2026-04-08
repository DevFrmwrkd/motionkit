import { z } from "zod";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const helloWorldSchema = z.object({
  titleText: z.string().describe("Text to display").default("Hello World"),
  titleColor: z.string().describe("Color of the text").default("#ffffff"),
  backgroundColor: z.string().describe("Background color").default("#000000"),
});

export type HelloWorldProps = z.infer<typeof helloWorldSchema>;

export const HelloWorld: React.FC<HelloWorldProps> = ({
  titleText,
  titleColor,
  backgroundColor,
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
    <AbsoluteFill style={{ backgroundColor, justifyContent: "center", alignItems: "center" }}>
      <h1
        style={{
          color: titleColor,
          opacity,
          transform: `scale(${scale})`,
          fontSize: "100px",
          fontWeight: "bold",
          fontFamily: "sans-serif",
        }}
      >
        {titleText}
      </h1>
    </AbsoluteFill>
  );
};
