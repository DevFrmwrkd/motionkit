/**
 * Motion graphics skill — extra knowledge for intro, outro, title,
 * lower-third, and similar broadcast-style presets.
 */
export function getMotionGraphicsSkill(): string {
  return `
═══════════════════════════════════════════════════════════
MOTION GRAPHICS SKILL — Broadcast & Title Design
═══════════════════════════════════════════════════════════

BROADCAST SAFE ZONES:
- Action safe area: 93% of frame (3.5% margin on each side)
  For 1920x1080: keep content within x:67..1853, y:38..1042
- Title safe area: 90% of frame (5% margin on each side)
  For 1920x1080: keep text within x:96..1824, y:54..1026
- Always pad text at least 80px from edges for readability.
- Lower thirds sit in the bottom 25-33% of the frame.
- Title cards center vertically or use upper-third placement.

TYPOGRAPHY ANIMATION PATTERNS:

Typewriter Effect:
  const charsToShow = Math.floor(interpolate(frame, [startFrame, endFrame], [0, text.length], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));
  const visibleText = text.slice(0, charsToShow);
  // Add a blinking cursor:
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  <span>{visibleText}{cursorVisible ? "|" : ""}</span>

Letter-by-Letter Stagger:
  {text.split("").map((char, i) => {
    const charDelay = i * 2;
    const charOpacity = interpolate(frame - charDelay, [0, 10], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const charY = interpolate(frame - charDelay, [0, 10], [20, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    return (
      <span key={i} style={{
        opacity: charOpacity,
        transform: \`translateY(\${charY}px)\`,
        display: "inline-block",
        whiteSpace: "pre",
      }}>{char}</span>
    );
  })}

Word-by-Word Reveal:
  const words = text.split(" ");
  {words.map((word, i) => {
    const wordDelay = i * 8;
    const wordOpacity = interpolate(frame - wordDelay, [0, 12], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const wordScale = spring({ frame: frame - wordDelay, fps, config: { damping: 15, stiffness: 200 } });
    return (
      <span key={i} style={{
        opacity: wordOpacity,
        transform: \`scale(\${wordScale})\`,
        display: "inline-block",
        marginRight: "0.3em",
      }}>{word}</span>
    );
  })}

Line Reveal with Clip Mask:
  const clipWidth = interpolate(frame, [0, 30], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  <div style={{ clipPath: \`inset(0 \${100 - clipWidth}% 0 0)\` }}>{text}</div>

BACKGROUND TREATMENTS:

Animated Gradient:
  const gradAngle = interpolate(frame, [0, durationInFrames], [0, 360]);
  const bg = \`linear-gradient(\${gradAngle}deg, #1a1a2e, #16213e, #0f3460)\`;

Particle Field (deterministic, no state):
  const particles = Array.from({ length: 50 }, (_, i) => {
    const x = random(\`particle-x-\${i}\`) * width;
    const y = random(\`particle-y-\${i}\`) * height;
    const speed = random(\`particle-speed-\${i}\`) * 2 + 0.5;
    const yPos = (y + frame * speed) % (height + 20) - 10;
    const size = random(\`particle-size-\${i}\`) * 4 + 1;
    const opacity = random(\`particle-opacity-\${i}\`) * 0.5 + 0.1;
    return { x, yPos, size, opacity };
  });

Geometric Shape Accent (animated rectangles, circles):
  const barWidth = interpolate(frame, [10, 40], [0, 300], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  <div style={{
    position: "absolute", left: 96, bottom: 200,
    width: barWidth, height: 4,
    backgroundColor: accentColor,
  }} />

Vignette Overlay:
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
  }} />

COMMON TIMING PATTERNS:

Intro Preset (5-8 seconds at 30fps = 150-240 frames):
  - Frames 0-15: Background fades in
  - Frames 10-40: Logo/icon enters with spring animation
  - Frames 25-60: Title text animates in (slide or typewriter)
  - Frames 45-75: Subtitle/tagline enters
  - Frames 60-90: Accent elements (lines, shapes) draw in
  - Hold until end, optional subtle ambient motion

Outro Preset (4-6 seconds at 30fps = 120-180 frames):
  - Frames 0-20: Content from previous section fades or wipes away
  - Frames 15-45: Logo/branding enters center stage
  - Frames 30-60: CTA text (subscribe, website, etc.)
  - Frames 45-75: Social handles or links appear staggered
  - Frames 90-end: Gentle fade out or hold

Title Card (3-5 seconds at 30fps = 90-150 frames):
  - Frames 0-20: Accent line or shape draws in
  - Frames 10-35: Main title enters (spring or slide)
  - Frames 25-45: Subtitle fades in
  - Hold for readability (at least 30 frames)
  - Frames end-20 to end: Fade out

Lower Third (4-6 seconds at 30fps = 120-180 frames):
  - Frames 0-15: Background bar slides in from left
  - Frames 10-25: Name text fades in
  - Frames 20-35: Title/role text fades in
  - Hold for readability
  - Frames end-20 to end: Entire element slides out or fades

DESIGN TIPS:
- Use at most 2-3 font sizes per composition for hierarchy.
- Accent colors should contrast with the background — use them sparingly.
- Animated underlines or side-bars add polish without overwhelming.
- Subtle drop shadows (0 2px 10px rgba(0,0,0,0.3)) improve text readability.
- For dark backgrounds, use light text with slight letter-spacing (1-3px).
- For light backgrounds, use dark text with tighter spacing.
- Motion should flow in one consistent direction (left-to-right for LTR audiences).
- Use Sequence components to organize distinct phases of animation.
`;
}
