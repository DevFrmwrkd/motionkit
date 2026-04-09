/**
 * CTA skill — knowledge for call-to-action, banner,
 * and attention-grabbing animation presets.
 */
export function getCtaSkill(): string {
  return `
═══════════════════════════════════════════════════════════
CTA (CALL-TO-ACTION) SKILL — Banners, Buttons & Emphasis
═══════════════════════════════════════════════════════════

CTA presets grab attention and drive action. They appear as overlays,
end screens, or standalone cards. The key is high contrast, bold text,
and rhythmic motion that draws the eye without being obnoxious.

ATTENTION-GRABBING ANIMATION PATTERNS:

Bounce-In Entry (spring-based):
  const entryScale = spring({
    frame,
    fps,
    config: { damping: 8, mass: 0.8, stiffness: 200 },
  });
  // Slightly overshoot then settle — feels energetic and inviting

Shake / Wiggle (draws eye to element):
  const wiggle = Math.sin(frame * 0.8) * interpolate(frame, [60, 90], [0, 5], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  transform: \`rotate(\${wiggle}deg)\`

Attention Pulse (periodic scale bump):
  // After element enters, pulse gently every 30 frames
  const pulsePhase = (frame % 30) / 30;
  const pulse = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.03; // 3% scale
  // Apply to CTA button after its entrance completes

Glow / Highlight Sweep:
  const glowX = interpolate(frame % 60, [0, 60], [-200, width + 200]);
  // Diagonal shine effect using a gradient overlay
  <div style={{
    position: "absolute", inset: 0,
    background: \`linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)\`,
    transform: \`translateX(\${glowX}px)\`,
  }} />

BUTTON / BANNER PULSE EFFECTS:

Pulsing Border:
  const borderOpacity = Math.sin(frame * 0.15) * 0.3 + 0.7;
  <div style={{
    border: \`3px solid rgba(255, 200, 0, \${borderOpacity})\`,
    borderRadius: 12,
    padding: "16px 40px",
  }}>
    <span>{ctaText}</span>
  </div>

Expanding Ring (radar pulse around button):
  const ringScale = interpolate(frame % 45, [0, 45], [1, 2.5]);
  const ringOpacity = interpolate(frame % 45, [0, 45], [0.6, 0]);
  <div style={{
    position: "absolute",
    width: buttonWidth, height: buttonHeight,
    border: \`2px solid \${accentColor}\`,
    borderRadius: 12,
    transform: \`scale(\${ringScale})\`,
    opacity: ringOpacity,
  }} />

Gradient Shift Button:
  const hueShift = interpolate(frame, [0, 120], [0, 30]);
  background: \`linear-gradient(135deg,
    hsl(\${200 + hueShift}, 80%, 55%),
    hsl(\${260 + hueShift}, 80%, 55%))\`

TEXT EMPHASIS TECHNIQUES:

Highlight Underline Draw:
  const underlineWidth = interpolate(frame, [20, 45], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  <span style={{ position: "relative", display: "inline-block" }}>
    {emphasizedWord}
    <span style={{
      position: "absolute",
      bottom: -4,
      left: 0,
      width: \`\${underlineWidth}%\`,
      height: 4,
      backgroundColor: accentColor,
      borderRadius: 2,
    }} />
  </span>

Text Size Pop (key word scales up momentarily):
  const wordScale = spring({
    frame: frame - wordAppearFrame,
    fps,
    config: { damping: 10, stiffness: 300, mass: 0.5 },
  });
  // Word pops to 1.15x then settles to 1x

Counting Number (for pricing, stats, offers):
  const displayPrice = Math.round(interpolate(frame, [30, 60], [0, price], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));
  // "$0" counts up to "$49" — makes the number feel earned

Color Flash on Key Word:
  const flashColor = interpolateColors(frame, [40, 50, 60], [textColor, accentColor, textColor]);

SOCIAL MEDIA CTA PATTERNS:

YouTube End Screen (Subscribe + Video Cards):
  Layout: subscribe button center-left, 2 video thumbnails right
  - Subscribe button enters with spring bounce at frame 15
  - Video cards slide in from right at frame 25 and 35
  - All elements have subtle hover-style pulse
  - Duration: 150-300 frames (5-10 seconds for viewer to click)

  Schema should include:
  - subscriberText: "SUBSCRIBE" or localized
  - channelName: shown below button
  - accentColor: brand color for button

Instagram Story CTA:
  Layout: Full screen with "Swipe Up" or "Link in bio" at bottom
  - Arrow animation pointing up, repeating
  - Bold headline centered
  - Gradient background (brand colors)
  - Duration: 90-150 frames (3-5 seconds, stories are fast)

  const arrowY = interpolate(frame % 30, [0, 15, 30], [0, -15, 0]);
  // Bouncing arrow at bottom

TikTok CTA:
  Layout: Bold text center, glowing CTA bottom third
  - Fast, punchy — enter within 10 frames
  - Use high contrast colors (white on black or neon on dark)
  - Text should be large (64px+) for small screens
  - Duration: 60-90 frames (2-3 seconds)

Twitter/X Banner:
  Layout: Centered text block with accent bar
  - Clean, minimal, typography-focused
  - Aspect ratio: 1500x500 (3:1) or 1200x675 (16:9)
  - Enter from left with slide, hold, optional exit

COUNTDOWN TIMER (Urgency CTA):
  const totalSeconds = 10;
  const secondsLeft = Math.max(0, totalSeconds - Math.floor(frame / fps));
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;
  // Format as HH:MM:SS with flip or slide animation on digit change

DESIGN PRINCIPLES FOR CTAS:
  - High contrast is king: dark bg + bright button, or vice versa.
  - One primary action only — too many choices kills conversion.
  - Urgency words: "Now", "Today", "Limited", "Free", "Exclusive".
  - Button should be the largest, most colorful element.
  - Whitespace around the CTA makes it pop — don't crowd it.
  - Animation should guide the eye: background first, then headline, then button.
  - 3-step sequence: 1. Hook (0.5s) → 2. Value prop (1s) → 3. CTA button (hold)
  - Subtle ambient motion after entrance keeps it alive without distracting.
`;
}
