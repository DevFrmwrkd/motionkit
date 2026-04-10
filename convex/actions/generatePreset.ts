"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { getSkillForCategory } from "../lib/ai_skills/index";
import { generateWithGemini } from "../lib/ai_providers/gemini";
import { generateWithClaude } from "../lib/ai_providers/claude";

/**
 * Dispatches an AI generation request.
 *
 * Key resolution order:
 *  1. User's own API key (stored in their profile)
 *  2. Platform key (env var — used as demo fallback)
 *
 * Users should set their own keys in Settings → API Keys.
 */
export const dispatchGeneration = action({
  args: {
    generationId: v.id("aiGenerations"),
    prompt: v.string(),
    category: v.optional(v.string()),
    provider: v.union(v.literal("gemini"), v.literal("claude")),
    parentGenerationId: v.optional(v.id("aiGenerations")),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Get the generation record to find the user + reference image
      const generation = await ctx.runQuery(internal.aiGeneration.getInternal, {
        id: args.generationId,
      });
      if (!generation) throw new Error("Generation not found");

      // 2. Get user's own API keys
      const userKeys = await ctx.runQuery(internal.users.getApiKeys, {
        userId: generation.userId,
      });

      // 3. Build the system prompt from base + category skill
      const systemPrompt = getSkillForCategory(args.category);

      // 4. If iterating, fetch previous generation's code for context
      //    and inherit the parent's reference image if this iteration
      //    didn't provide its own.
      let previousCode: string | undefined;
      let parentReferenceImageId = generation.referenceImageId;
      if (args.parentGenerationId) {
        const parent = await ctx.runQuery(internal.aiGeneration.getInternal, {
          id: args.parentGenerationId,
        });
        if (parent?.generatedCode) {
          previousCode = parent.generatedCode;
        }
        if (!parentReferenceImageId && parent?.referenceImageId) {
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
        prompt: args.prompt,
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
