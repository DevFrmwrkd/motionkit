import { mutation } from "./_generated/server";

export const geminiSeed = mutation({
  handler: async (ctx) => {
    const presets = [
      {
        name: "Gemini Title Reveal",
        description: "A sleek, AI-inspired title reveal with sliding text and glowing accents.",
        category: "title" as const,
        tags: ["title", "ai", "glow", "slide", "gemini"],
        author: "Gemini",
        bundleUrl: "local://presets/GeminiTitle",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 120,
        inputSchema: JSON.stringify({
          titleText: { type: "text", label: "Main Title", default: "Gemini Motion", group: "Typography" },
          subtitleText: { type: "text", label: "Subtitle", default: "Powered by AI", group: "Typography" },
          primaryColor: { type: "color", label: "Primary Color", default: "#3b82f6", group: "Style" },
          backgroundColor: { type: "color", label: "Background", default: "#0f172a", group: "Style" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 5.0,
      },
      {
        name: "Gemini Lower Third",
        description: "Professional animated lower third with a neon glowing edge.",
        category: "lower-third" as const,
        tags: ["lower-third", "neon", "professional", "gemini"],
        author: "Gemini",
        bundleUrl: "local://presets/GeminiLowerThird",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 150,
        inputSchema: JSON.stringify({
          nameText: { type: "text", label: "Name", default: "Gemini Expert", group: "Content" },
          roleText: { type: "text", label: "Role", default: "AI Engineer", group: "Content" },
          accentColor: { type: "color", label: "Accent Color", default: "#10b981", group: "Style" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 4.8,
      },
      {
        name: "Gemini Power Transition",
        description: "A fast, diagonal two-tone wipe transition for scene changes.",
        category: "transition" as const,
        tags: ["transition", "wipe", "fast", "gemini"],
        author: "Gemini",
        bundleUrl: "local://presets/GeminiTransition",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 60,
        inputSchema: JSON.stringify({
          wipeColor1: { type: "color", label: "Wipe Color 1", default: "#8b5cf6", group: "Colors" },
          wipeColor2: { type: "color", label: "Wipe Color 2", default: "#ec4899", group: "Colors" },
          angle: { type: "number", label: "Wipe Angle", default: 45, group: "Animation", min: 0, max: 360 },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 4.5,
      },
      {
        name: "Gemini Video Outro",
        description: "A standard YouTube-style end screen with video placeholders.",
        category: "outro" as const,
        tags: ["outro", "youtube", "end-screen", "gemini"],
        author: "Gemini",
        bundleUrl: "local://presets/GeminiOutro",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 240,
        inputSchema: JSON.stringify({
          subscribeText: { type: "text", label: "Main Action", default: "Subscribe for more", group: "Content" },
          channelName: { type: "text", label: "Channel/Brand", default: "Gemini Studios", group: "Content" },
          accentColor: { type: "color", label: "Accent Color", default: "#ef4444", group: "Style" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 4.9,
      },
      {
        name: "Gemini Split Screen",
        description: "A dual-subject animated frame, perfect for podcasts and reaction videos.",
        category: "full" as const,
        tags: ["split-screen", "podcast", "reaction", "gemini"],
        author: "Gemini",
        bundleUrl: "local://presets/GeminiSplitScreen",
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 300,
        inputSchema: JSON.stringify({
          leftText: { type: "text", label: "Left Label", default: "VS.", group: "Text" },
          rightText: { type: "text", label: "Right Label", default: "AI Expert", group: "Text" },
          leftColor: { type: "color", label: "Left Bar Color", default: "#3b82f6", group: "Style" },
          rightColor: { type: "color", label: "Right Bar Color", default: "#ec4899", group: "Style" },
        }),
        isPublic: true,
        status: "published" as const,
        downloads: 0,
        rating: 4.7,
      },
    ];

    const existingNames = new Set(
      (await ctx.db.query("presets").collect()).map((p) => p.name)
    );

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
