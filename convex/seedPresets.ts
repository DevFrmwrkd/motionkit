import { internalMutation } from "./_generated/server";

/**
 * One-time seed mutation to insert the 5 Claude presets into Convex.
 * Run via: npx convex run seedPresets:seed
 * Safe to re-run — skips presets that already exist by name.
 *
 * internalMutation so this isn't part of the public deploy surface; invoke
 * from the dashboard or CLI only.
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("presets").collect();
    const existingNames = new Set(existing.map((p) => p.name));

    const presets = [
      {
        name: "Claude Gradient Wave",
        description: "Animated gradient wave background with title overlay",
        category: "intro" as const,
        tags: ["gradient", "wave", "intro", "claude"],
        author: "Claude",
        bundleUrl: "local://presets/ClaudeGradientWave",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 150,
        inputSchema: JSON.stringify({
          title: { type: "text", label: "Title", default: "Claude Wave", group: "Content" },
          subtitle: { type: "text", label: "Subtitle", default: "Powered by Anthropic", group: "Content" },
          colorA: { type: "color", label: "Gradient Start", default: "#d97706", group: "Style" },
          colorB: { type: "color", label: "Gradient End", default: "#7c3aed", group: "Style" },
          waveSpeed: { type: "number", label: "Wave Speed", default: 3, min: 1, max: 10, step: 1, group: "Animation" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 0,
      },
      {
        name: "Claude Lower Third",
        description: "Professional lower-third name bar with slide-in animation",
        category: "lower-third" as const,
        tags: ["lower-third", "name", "professional", "claude"],
        author: "Claude",
        bundleUrl: "local://presets/ClaudeLowerThird",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 180,
        inputSchema: JSON.stringify({
          name: { type: "text", label: "Name", default: "Claude Sonnet", group: "Content" },
          role: { type: "text", label: "Role / Title", default: "AI Assistant", group: "Content" },
          barColor: { type: "color", label: "Accent Bar", default: "#f59e0b", group: "Style" },
          bgColor: { type: "color", label: "Card Background", default: "#18181b", group: "Style" },
          textColor: { type: "color", label: "Text Color", default: "#ffffff", group: "Style" },
          position: { type: "select", label: "Position", default: "bottom-left", options: ["bottom-left", "bottom-right", "top-left", "top-right"], group: "Layout" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 0,
      },
      {
        name: "Claude Call to Action",
        description: "Attention-grabbing CTA with pulse animation and bold typography",
        category: "cta" as const,
        tags: ["cta", "subscribe", "pulse", "claude"],
        author: "Claude",
        bundleUrl: "local://presets/ClaudeCallToAction",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 120,
        inputSchema: JSON.stringify({
          headline: { type: "text", label: "Headline", default: "Subscribe Now", group: "Content" },
          subtext: { type: "text", label: "Subtext", default: "Join 10k+ creators building with AI", group: "Content" },
          buttonText: { type: "text", label: "Button Text", default: "Get Started", group: "Content" },
          accentColor: { type: "color", label: "Accent Color", default: "#f59e0b", group: "Style" },
          bgColor: { type: "color", label: "Background", default: "#09090b", group: "Style" },
          showPulse: { type: "toggle", label: "Pulse Effect", default: true, group: "Animation" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 0,
      },
      {
        name: "Claude Text Reveal",
        description: "Cinematic text reveal with sliding mask animation",
        category: "title" as const,
        tags: ["text", "reveal", "cinematic", "claude"],
        author: "Claude",
        bundleUrl: "local://presets/ClaudeTextReveal",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 120,
        inputSchema: JSON.stringify({
          text: { type: "text", label: "Text", default: "Think Different", group: "Content" },
          fontSize: { type: "number", label: "Font Size", default: 96, min: 40, max: 200, step: 4, group: "Style" },
          textColor: { type: "color", label: "Text Color", default: "#fafafa", group: "Style" },
          revealColor: { type: "color", label: "Reveal Bar Color", default: "#f59e0b", group: "Style" },
          bgColor: { type: "color", label: "Background", default: "#09090b", group: "Style" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 0,
      },
      {
        name: "Claude Outro Card",
        description: "Clean outro card with channel branding and social handles",
        category: "outro" as const,
        tags: ["outro", "end-screen", "branding", "claude"],
        author: "Claude",
        bundleUrl: "local://presets/ClaudeOutroCard",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 150,
        inputSchema: JSON.stringify({
          channelName: { type: "text", label: "Channel Name", default: "FRMWRKD", group: "Content" },
          tagline: { type: "text", label: "Tagline", default: "Thanks for watching", group: "Content" },
          showSocials: { type: "toggle", label: "Show Social Handles", default: true, group: "Content" },
          socialHandle: { type: "text", label: "Social Handle", default: "@frmwrkd", group: "Content" },
          accentColor: { type: "color", label: "Accent Color", default: "#8b5cf6", group: "Style" },
          bgColor: { type: "color", label: "Background", default: "#09090b", group: "Style" },
          cardColor: { type: "color", label: "Card Color", default: "#18181b", group: "Style" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 0,
      },
    ];

    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const preset of presets) {
      if (existingNames.has(preset.name)) {
        skipped.push(preset.name);
        continue;
      }
      await ctx.db.insert("presets", preset);
      inserted.push(preset.name);
    }

    return { inserted, skipped };
  },
});
