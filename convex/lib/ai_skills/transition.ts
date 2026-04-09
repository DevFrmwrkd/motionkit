/**
 * Transition skill — knowledge for wipe, dissolve, slide, zoom,
 * and geometric mask transition presets.
 */
export function getTransitionSkill(): string {
  return `
═══════════════════════════════════════════════════════════
TRANSITION SKILL — Scene Transitions & Effects
═══════════════════════════════════════════════════════════

Transitions connect two scenes. The component receives "colorA" / "colorB"
(or "imageA" / "imageB") as props representing the two scenes. The transition
animates from scene A to scene B over durationInFrames.

DURATION RECOMMENDATIONS:
  - Quick cut/flash: 5-10 frames (0.15-0.3s at 30fps)
  - Standard transition: 15-30 frames (0.5-1s)
  - Dramatic/slow transition: 30-60 frames (1-2s)
  - Cinematic: 60-90 frames (2-3s)
  - Total preset duration should be 60-120 frames (2-4s) with the transition
    centered, so viewers see scene A, then the transition, then scene B.

WIPE TRANSITIONS:

Horizontal Wipe (left to right):
  const wipeX = interpolate(frame, [startFrame, endFrame], [0, width], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  <AbsoluteFill>
    {/* Scene B behind */}
    <AbsoluteFill style={{ backgroundColor: colorB }} />
    {/* Scene A with clip */}
    <AbsoluteFill style={{
      clipPath: \`inset(0 0 0 0)\`,
      width: \`\${width - wipeX}px\`,
      overflow: "hidden",
      backgroundColor: colorA,
    }} />
  </AbsoluteFill>

  Alternative using clipPath:
  const progress = interpolate(frame, [startFrame, endFrame], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  <AbsoluteFill style={{ clipPath: \`inset(0 \${100 - progress}% 0 0)\` }}>
    <SceneB />
  </AbsoluteFill>

Vertical Wipe (top to bottom):
  clipPath: \`inset(0 0 \${100 - progress}% 0)\`

Diagonal Wipe:
  clipPath: \`polygon(0 0, \${progress}% 0, \${progress - 20}% 100%, 0 100%)\`

DISSOLVE / CROSS-FADE:

Simple Cross-Fade:
  const fadeProgress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  <AbsoluteFill>
    <AbsoluteFill style={{ backgroundColor: colorA, opacity: 1 - fadeProgress }} />
    <AbsoluteFill style={{ backgroundColor: colorB, opacity: fadeProgress }} />
  </AbsoluteFill>

Directional Dissolve (with blur):
  // Scene A blurs out while scene B blurs in
  const blurA = interpolate(frame, [startFrame, endFrame], [0, 20], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const blurB = interpolate(frame, [startFrame, endFrame], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  <AbsoluteFill style={{
    backgroundColor: colorA,
    filter: \`blur(\${blurA}px)\`,
    opacity: 1 - fadeProgress,
  }} />

SLIDE TRANSITIONS:

Push (A slides out left, B slides in from right):
  const offset = interpolate(frame, [startFrame, endFrame], [0, -width], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  <AbsoluteFill style={{ transform: \`translateX(\${offset}px)\`, backgroundColor: colorA }} />
  <AbsoluteFill style={{ transform: \`translateX(\${width + offset}px)\`, backgroundColor: colorB }} />

Cover (B slides over A):
  const slideIn = interpolate(frame, [startFrame, endFrame], [width, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  <AbsoluteFill style={{ backgroundColor: colorA }} />
  <AbsoluteFill style={{ transform: \`translateX(\${slideIn}px)\`, backgroundColor: colorB }} />

Reveal (A slides away to reveal B underneath):
  const slideOut = interpolate(frame, [startFrame, endFrame], [0, -width], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  <AbsoluteFill style={{ backgroundColor: colorB }} />
  <AbsoluteFill style={{ transform: \`translateX(\${slideOut}px)\`, backgroundColor: colorA }} />

ZOOM TRANSITIONS:

Zoom In (scene A zooms in and fades, revealing B):
  const zoomScale = interpolate(frame, [startFrame, endFrame], [1, 3], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const zoomOpacity = interpolate(frame, [startFrame, endFrame], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  <AbsoluteFill style={{ backgroundColor: colorB }} />
  <AbsoluteFill style={{
    backgroundColor: colorA,
    transform: \`scale(\${zoomScale})\`,
    opacity: zoomOpacity,
  }} />

Zoom Through (zoom to center point, then zoom out to B):
  const midFrame = (startFrame + endFrame) / 2;
  const scaleA = interpolate(frame, [startFrame, midFrame], [1, 5], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const scaleB = interpolate(frame, [midFrame, endFrame], [5, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Crossover at midFrame

GEOMETRIC MASK TRANSITIONS:

Circle Reveal (expanding circle reveals B):
  const maxRadius = Math.sqrt(width * width + height * height) / 2;
  const radius = interpolate(frame, [startFrame, endFrame], [0, maxRadius], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  <AbsoluteFill style={{ backgroundColor: colorA }} />
  <AbsoluteFill style={{
    backgroundColor: colorB,
    clipPath: \`circle(\${radius}px at 50% 50%)\`,
  }} />

Diamond Reveal:
  const size = interpolate(frame, [startFrame, endFrame], [0, 150], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  clipPath: \`polygon(50% \${50 - size}%, \${50 + size}% 50%, 50% \${50 + size}%, \${50 - size}% 50%)\`

Star/Iris Wipe (multi-point reveal):
  // Use a polygon clipPath with animated radius
  const points = 5;
  const r = interpolate(frame, [startFrame, endFrame], [0, maxRadius], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Generate polygon points in a star pattern

Venetian Blinds:
  // Multiple horizontal strips that flip/slide
  const strips = 10;
  {Array.from({ length: strips }, (_, i) => {
    const stripDelay = i * 3;
    const stripProgress = interpolate(frame - stripDelay, [startFrame, endFrame - startFrame], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const stripHeight = height / strips;
    return (
      <div key={i} style={{
        position: "absolute",
        top: i * stripHeight,
        left: 0,
        width: width * stripProgress,
        height: stripHeight,
        backgroundColor: colorB,
        overflow: "hidden",
      }} />
    );
  })}

Checkerboard Reveal:
  const gridSize = 8;
  const cellWidth = width / gridSize;
  const cellHeight = height / gridSize;
  {Array.from({ length: gridSize * gridSize }, (_, idx) => {
    const row = Math.floor(idx / gridSize);
    const col = idx % gridSize;
    const delay = (row + col) * 3; // diagonal stagger
    const cellOpacity = interpolate(frame - delay, [0, 15], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return (
      <div key={idx} style={{
        position: "absolute",
        left: col * cellWidth,
        top: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        backgroundColor: colorB,
        opacity: cellOpacity,
      }} />
    );
  })}

EASING RECOMMENDATIONS FOR TRANSITIONS:
  - Wipes: Easing.inOut(Easing.cubic) — smooth acceleration and deceleration
  - Slides/Push: Easing.out(Easing.cubic) — fast start, gentle landing
  - Zoom: Easing.in(Easing.cubic) for zoom-out, Easing.out for zoom-in
  - Circle reveal: Easing.out(Easing.cubic) — quick start, gradual completion
  - Cross-fade: linear or Easing.inOut(Easing.quad) — gentle and even

DESIGN TIPS:
  - Most professional transitions are 15-30 frames. Longer feels sluggish.
  - A thin colored edge (2-4px) on wipes adds a polished broadcast look.
  - Add a subtle motion blur effect with a very slight directional blur.
  - Geometric transitions work best with bold, contrasting colors.
  - For photo/video transitions, cross-fade is always the safe choice.
  - Match transition direction to content flow (LTR for forward, RTL for backward).
  - The schema should include transitionType, duration, easing, and scene colors/images.
`;
}
