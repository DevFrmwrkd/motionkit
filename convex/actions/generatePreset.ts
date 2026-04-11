"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { getSkillForCategory } from "../lib/ai_skills/index";
import { generateWithGemini } from "../lib/ai_providers/gemini";
import { generateWithClaude } from "../lib/ai_providers/claude";
import { requireAuthUserIdFromAction } from "../lib/authz";

/**
 * Dispatches an AI generation request.
 *
 * Key resolution order:
 *  1. User's own API key (stored in their profile)
 *  2. Platform key (env var — used as demo fallback)
 *
 * Users should set their own keys in Settings → API Keys.
 */
/**
 * Heuristic auto-detection: pick a category from the user's prompt when the
 * UI sent "auto". Matches fire in priority order so "full composition map"
 * resolves to "full" only if no map-specific word appears.
 */
function autoDetectCategory(prompt: string): string {
  const p = prompt.toLowerCase();
  if (/\b(map|country|countries|world|globe|route|flight|city|cities|state|region)\b/.test(p))
    return "map";
  if (/\b(chart|graph|bar chart|line chart|pie chart|data|statistic|metric|kpi)\b/.test(p))
    return "chart";
  if (/\b(transition|wipe|swipe|cross ?fade|morph between)\b/.test(p))
    return "transition";
  if (/\b(cta|call ?to ?action|subscribe|sign ?up|click here|buy now|learn more)\b/.test(p))
    return "cta";
  if (/\b(lower ?third|name ?card|speaker name|banner)\b/.test(p))
    return "lower-third";
  if (/\b(outro|end ?screen|thanks for watching)\b/.test(p))
    return "outro";
  if (/\b(intro|opener|opening|channel intro)\b/.test(p))
    return "intro";
  if (/\b(instagram|reel|tiktok|story|post|social media)\b/.test(p))
    return "social";
  if (/\b(title|headline|headline card|title card)\b/.test(p))
    return "title";
  return "title"; // safe default
}

/**
 * Inject a short "style contract" block at the top of the user prompt when the
 * user picked a specific style. Tells the model to resolve it via styleHelpers
 * and use the tokens as the base of the design.
 */
function injectStyleContract(prompt: string, style: string | undefined): string {
  if (!style || style === "auto") return prompt;
  // Sanitize the style identifier before interpolating it into the system
  // prompt. `style` is user-controllable, and without this check an attacker
  // could inject newlines, quotes, or free-form text to steer the model (e.g.
  // `style='a") } OVERRIDE: …'`). We restrict to a small, harmless character
  // set that matches real style keys (`noir`, `pastel_90s`, `brand/primary`).
  // Anything unexpected falls back to no contract — the generation still
  // runs, but without the injected style hint.
  const safeStyle = style.replace(/[^a-zA-Z0-9_\-/.]/g, "").slice(0, 64);
  if (!safeStyle) return prompt;
  return [
    `STYLE CONTRACT: Use styleHelpers.getStyle("${safeStyle}") at the top of your component`,
    `and derive background, text color, accent color, font family, and motion feel`,
    `from the returned tokens. This keeps every generation in this style visually consistent.`,
    `Reference style key: "${safeStyle}".`,
    ``,
    `USER PROMPT:`,
    prompt,
  ].join("\n");
}

export const dispatchGeneration = action({
  args: {
    generationId: v.id("aiGenerations"),
    prompt: v.string(),
    category: v.optional(v.string()),
    style: v.optional(v.string()),
    provider: v.union(v.literal("gemini"), v.literal("claude")),
    parentGenerationId: v.optional(v.id("aiGenerations")),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Authenticate the caller and load the generation record. The
      //    caller MUST own the generation — previously this action trusted
      //    args.generationId and decrypted the generation owner's stored
      //    API keys with no caller check, which let anyone who learned a
      //    generation id spend another user's quota.
      const authUserId = await requireAuthUserIdFromAction(ctx);
      const generation = await ctx.runQuery(internal.aiGeneration.getInternal, {
        id: args.generationId,
      });
      if (!generation) throw new Error("Generation not found");
      if (generation.userId !== authUserId) {
        throw new Error("You do not have access to this generation");
      }

      // 2. Get user's own API keys (belongs to the authenticated caller).
      const userKeys = await ctx.runQuery(internal.users.getApiKeys, {
        userId: authUserId,
      });

      // 3. Resolve auto category via heuristic
      const resolvedCategory =
        !args.category || args.category === "auto"
          ? autoDetectCategory(args.prompt)
          : args.category;

      // 4. Build the system prompt from base + category skill + style contract
      const systemPrompt = getSkillForCategory(resolvedCategory);
      const effectivePrompt = injectStyleContract(args.prompt, args.style);

      // 5. If iterating, fetch previous generation's code for context
      //    and inherit the parent's reference image. The parent MUST also
      //    be owned by the caller — otherwise we'd leak previously-generated
      //    code from another user as "previous context".
      let previousCode: string | undefined;
      let parentReferenceImageId = generation.referenceImageId;
      if (args.parentGenerationId) {
        const parent = await ctx.runQuery(internal.aiGeneration.getInternal, {
          id: args.parentGenerationId,
        });
        if (!parent) throw new Error("Parent generation not found");
        if (parent.userId !== authUserId) {
          throw new Error("You do not have access to the parent generation");
        }
        if (parent.generatedCode) {
          previousCode = parent.generatedCode;
        }
        if (!parentReferenceImageId && parent.referenceImageId) {
          parentReferenceImageId = parent.referenceImageId;
        }
      }

      // 5. Resolve reference image storage id to a signed URL so the
      //    provider can fetch it.
      let referenceImageUrl: string | undefined;
      if (parentReferenceImageId) {
        const url = await ctx.storage.getUrl(parentReferenceImageId);
        if (url) referenceImageUrl = url;
      }

      // 6. Build the generation request
      const request = {
        prompt: effectivePrompt,
        systemPrompt,
        previousCode,
        referenceImageUrl,
      };

      // 7. Resolve API key: user's own key first, platform key as fallback
      let result;
      if (args.provider === "gemini") {
        const apiKey =
          userKeys?.geminiApiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          throw new Error(
            "No Gemini API key found. Add your Google API key in Settings → API Keys."
          );
        }
        result = await generateWithGemini({ apiKey }, request);
      } else {
        const apiKey =
          userKeys?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error(
            "No Claude API key found. Add your Anthropic API key in Settings → API Keys."
          );
        }
        result = await generateWithClaude({ apiKey }, request);
      }

      // 8. Mark generation as complete
      await ctx.runMutation(internal.aiGeneration.markComplete, {
        generationId: args.generationId,
        generatedCode: result.componentCode,
        generatedSchema: result.schema,
        generatedMeta: result.meta,
        tokensUsed: result.tokensUsed,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      await ctx.runMutation(internal.aiGeneration.markFailed, {
        generationId: args.generationId,
        error: errorMessage,
      });

      throw error;
    }
  },
});
