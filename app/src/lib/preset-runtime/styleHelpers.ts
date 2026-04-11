/**
 * styleHelpers — curated reference style configs exposed to generated presets.
 *
 * Problem this solves: when the user picks "Corporate" or "Retro" or "Auto"
 * for the style, the AI invents its own interpretation of those words and
 * every generation drifts. With styleHelpers, the AI looks up a deterministic
 * config (palette, font stack, motion feel, typography scale) and composes
 * from that — so the output is consistent across generations.
 *
 * The AI still gets creative freedom in *how* it uses the tokens — but it
 * shouldn't invent hex values or font names from thin air.
 */

export interface StylePreset {
  /** Human-readable label shown in the UI. */
  label: string;
  /** Short description of the aesthetic. */
  description: string;
  /** Background, surface, and text colors. */
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  /** Primary accent (buttons, highlights). */
  accent: string;
  /** Secondary accent (gradients, hover states). */
  accent2: string;
  /** Palette used for charts, multi-item highlights, data viz. */
  palette: string[];
  /** Font stack. Use `fontPrimary` for headings, `fontSecondary` for body. */
  fontPrimary: string;
  fontSecondary: string;
  /** Motion feel — guides spring damping/stiffness and interpolation timing. */
  motion: "crisp" | "smooth" | "elastic" | "snappy" | "organic";
  /** Corner radius scale (pixels) for shapes. */
  radius: number;
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  minimal: {
    label: "Minimal",
    description: "Clean, monochrome, lots of whitespace, subtle motion.",
    background: "#ffffff",
    surface: "#f5f5f7",
    text: "#1d1d1f",
    textMuted: "#86868b",
    accent: "#0071e3",
    accent2: "#6e6e73",
    palette: ["#0071e3", "#86868b", "#1d1d1f", "#d2d2d7", "#34c759", "#ff9500"],
    fontPrimary: "Inter, system-ui, sans-serif",
    fontSecondary: "Inter, system-ui, sans-serif",
    motion: "crisp",
    radius: 8,
  },
  corporate: {
    label: "Corporate",
    description: "Trustworthy, navy/blue forward, sharp edges, confident motion.",
    background: "#0b1e3f",
    surface: "#112a54",
    text: "#ffffff",
    textMuted: "#9fb3d1",
    accent: "#3b82f6",
    accent2: "#60a5fa",
    palette: ["#3b82f6", "#60a5fa", "#93c5fd", "#1e40af", "#1e3a8a", "#fbbf24"],
    fontPrimary: "Inter, Helvetica, sans-serif",
    fontSecondary: "Inter, Helvetica, sans-serif",
    motion: "snappy",
    radius: 4,
  },
  vibrant: {
    label: "Vibrant",
    description: "Bold gradients, saturated colors, elastic bouncy motion.",
    background: "#0f0f23",
    surface: "#1a1a3e",
    text: "#ffffff",
    textMuted: "#a0a0c0",
    accent: "#ec4899",
    accent2: "#8b5cf6",
    palette: ["#ec4899", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#f43f5e"],
    fontPrimary: "Inter, system-ui, sans-serif",
    fontSecondary: "Inter, system-ui, sans-serif",
    motion: "elastic",
    radius: 16,
  },
  retro: {
    label: "Retro",
    description: "80s synthwave: magenta/cyan gradients, neon glow, VHS timing.",
    background: "#1a0033",
    surface: "#2d0055",
    text: "#ffffff",
    textMuted: "#b19cd9",
    accent: "#ff006e",
    accent2: "#8338ec",
    palette: ["#ff006e", "#8338ec", "#3a86ff", "#fb5607", "#ffbe0b", "#06ffa5"],
    fontPrimary: "'Space Grotesk', Inter, sans-serif",
    fontSecondary: "Inter, sans-serif",
    motion: "organic",
    radius: 2,
  },
  futuristic: {
    label: "Futuristic",
    description: "Sci-fi HUD: monospace, thin lines, cyan accents, precise motion.",
    background: "#000814",
    surface: "#001d3d",
    text: "#caf0f8",
    textMuted: "#5896b5",
    accent: "#00f5d4",
    accent2: "#00bbf9",
    palette: ["#00f5d4", "#00bbf9", "#9b5de5", "#f15bb5", "#fee440", "#ffffff"],
    fontPrimary: "'JetBrains Mono', ui-monospace, monospace",
    fontSecondary: "Inter, sans-serif",
    motion: "crisp",
    radius: 2,
  },
  warm: {
    label: "Warm",
    description: "Earth tones, soft oranges/browns, organic smooth motion.",
    background: "#fff8f0",
    surface: "#f5e6d3",
    text: "#3d2817",
    textMuted: "#8b6f47",
    accent: "#d97706",
    accent2: "#ea580c",
    palette: ["#d97706", "#ea580c", "#c2410c", "#92400e", "#78350f", "#fbbf24"],
    fontPrimary: "'Fraunces', Georgia, serif",
    fontSecondary: "Inter, sans-serif",
    motion: "smooth",
    radius: 12,
  },
  dark: {
    label: "Dark",
    description: "Pure dark theme, high contrast, amber accent, snappy motion.",
    background: "#09090b",
    surface: "#18181b",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    accent: "#f59e0b",
    accent2: "#8b5cf6",
    palette: ["#f59e0b", "#8b5cf6", "#06b6d4", "#10b981", "#ef4444", "#ec4899"],
    fontPrimary: "Inter, system-ui, sans-serif",
    fontSecondary: "Inter, system-ui, sans-serif",
    motion: "snappy",
    radius: 6,
  },
  editorial: {
    label: "Editorial",
    description: "Magazine layout: serif headlines, generous type scale, slow motion.",
    background: "#faf9f7",
    surface: "#ffffff",
    text: "#1a1a1a",
    textMuted: "#666666",
    accent: "#c2410c",
    accent2: "#1a1a1a",
    palette: ["#c2410c", "#1a1a1a", "#525252", "#a3a3a3", "#d4d4d4", "#fbbf24"],
    fontPrimary: "'Playfair Display', Georgia, serif",
    fontSecondary: "Inter, sans-serif",
    motion: "smooth",
    radius: 0,
  },
};

/**
 * Look up a style preset by name. Accepts canonical keys or aliases.
 * Returns the "dark" preset as fallback if the name is unknown.
 *
 * @example
 *   const style = styleHelpers.getStyle("corporate");
 *   <text fill={style.accent} fontFamily={style.fontPrimary}>...</text>
 */
export function getStyle(name: string): StylePreset {
  const key = name.toLowerCase().trim();
  return STYLE_PRESETS[key] ?? STYLE_PRESETS.dark;
}

export function listStyles(): string[] {
  return Object.keys(STYLE_PRESETS);
}

export const styleHelpers = {
  getStyle,
  listStyles,
  STYLE_PRESETS,
};

export type StyleHelpers = typeof styleHelpers;
