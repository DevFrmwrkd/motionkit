"use node";

/**
 * Dispatch flow for Straico-routed Gemini 3 Flash generations.
 *
 * Kept separate from convex/aiGeneration.ts (BYOK path) so the platform-key
 * / rate-limited flow cannot be accidentally wired into the BYOK flows.
 * Quota mutations live in aiGenerationStraicoQuota.ts — Convex doesn't
 * allow mutations inside a Node-runtime file.
 *
 * Access model:
 *   - Logged-in users cap on users.dailyGenerations (5/day UTC).
 *   - Anonymous users pass a client-generated guestId (UUID from
 *     localStorage) and cap on guestStraicoQuota (5/day UTC).
 *
 * On generation failure we refund the consumed slot so the user only
 * spends a daily allowance on a SUCCESSFUL completion.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateWithStraico } from "./lib/ai_providers/straico";
import { buildSystemPrompt } from "./lib/ai_skills";
import { getAuthUserId } from "@convex-dev/auth/server";

type QuotaState = {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
};

type DispatchResult =
  | {
      ok: true;
      componentCode: string;
      schema: string;
      meta: string;
      summary: string;
      tokensUsed: number;
      quota: QuotaState;
      model: string;
    }
  | {
      ok: false;
      error: string;
      errorType: "api" | "rate_limit" | "bad_request";
      quota?: QuotaState;
    };

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
  if (/\b(intro|opener|opening|channel intro)\b/.test(p)) return "intro";
  if (/\b(instagram|reel|tiktok|story|post|social media)\b/.test(p))
    return "social";
  if (/\b(title|headline|headline card|title card)\b/.test(p)) return "title";
  return "title";
}

function injectStyleContract(prompt: string, style: string | undefined): string {
  if (!style || style === "auto") return prompt;
  const safeStyle = style.replace(/[^a-zA-Z0-9_\-/.]/g, "").slice(0, 64);
  if (!safeStyle) return prompt;
  return [
    `STYLE CONTRACT: Use styleHelpers.getStyle("${safeStyle}") at the top of your component`,
    `and derive background, text color, accent color, font family, and motion feel`,
    `from the returned tokens.`,
    `Reference style key: "${safeStyle}".`,
    ``,
    `USER PROMPT:`,
    prompt,
  ].join("\n");
}

function validateClientId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    throw new Error("guestId must be 8–128 characters long");
  }
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(trimmed)) {
    throw new Error("guestId contains invalid characters");
  }
  return trimmed;
}

/**
 * Single entry point for both logged-in and anonymous callers.
 *
 * Caller identity resolution:
 *   - If a Convex auth identity is present, we bind to that user and use
 *     users.dailyGenerations. guestId, if passed, is ignored.
 *   - Otherwise we require guestId and bind to guestStraicoQuota.
 *
 * No row is written to aiGenerations — the return value IS the generation.
 * Saving to the presets table is a separate signed-in flow.
 */
export const generate = action({
  args: {
    prompt: v.string(),
    category: v.optional(v.string()),
    style: v.optional(v.string()),
    previousCode: v.optional(v.string()),
    referenceImageUrl: v.optional(v.string()),
    customSystemPrompt: v.optional(v.string()),
    /** Required when the caller is anonymous. Ignored when authenticated. */
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DispatchResult> => {
    const apiKey = process.env.STRAICO_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "STRAICO_API_KEY is not configured on this Convex deployment.",
        errorType: "api",
      };
    }

    if (args.prompt.trim().length < 4) {
      return {
        ok: false,
        error: "Prompt is too short — describe the animation you want.",
        errorType: "bad_request",
      };
    }

    const authUserId = await getAuthUserId(ctx);

    let consumed: QuotaState;
    let identity:
      | { type: "user"; userId: NonNullable<typeof authUserId> }
      | { type: "guest"; guestId: string };

    if (authUserId) {
      identity = { type: "user", userId: authUserId };
      consumed = await ctx.runMutation(
        internal.aiGenerationStraicoQuota.consumeUserQuota,
        { userId: authUserId }
      );
    } else {
      if (!args.guestId) {
        return {
          ok: false,
          error: "guestId is required for anonymous generation.",
          errorType: "bad_request",
        };
      }
      let guestId: string;
      try {
        guestId = validateClientId(args.guestId);
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Invalid guestId",
          errorType: "bad_request",
        };
      }
      identity = { type: "guest", guestId };
      consumed = await ctx.runMutation(
        internal.aiGenerationStraicoQuota.consumeGuestQuota,
        { clientId: guestId }
      );
    }

    if (!consumed.ok) {
      return {
        ok: false,
        error: `Daily limit reached (${consumed.used}/${consumed.limit}). Resets at 00:00 UTC. Sign in for higher limits in the future.`,
        errorType: "rate_limit",
        quota: consumed,
      };
    }

    try {
      const resolvedCategory =
        !args.category || args.category === "auto"
          ? autoDetectCategory(args.prompt)
          : args.category;

      const skillPrompt = buildSystemPrompt({
        prompt: args.prompt,
        category: resolvedCategory,
      });

      const customExtra = args.customSystemPrompt?.trim();
      const effectiveSystemPrompt = customExtra
        ? `${skillPrompt.systemPrompt}\n\n## USER OVERRIDES\n${customExtra}`
        : skillPrompt.systemPrompt;

      const effectivePrompt = injectStyleContract(args.prompt, args.style);

      const generated = await generateWithStraico(
        { apiKey },
        {
          prompt: effectivePrompt,
          systemPrompt: effectiveSystemPrompt,
          previousCode: args.previousCode,
          referenceImageUrl: args.referenceImageUrl,
        }
      );

      return {
        ok: true,
        componentCode: generated.componentCode,
        schema: generated.schema,
        meta: generated.meta,
        summary: `Generated a ${resolvedCategory} preset via Straico (Gemini 3 Flash).`,
        tokensUsed: generated.tokensUsed,
        quota: consumed,
        model: "google/gemini-3-flash-preview",
      };
    } catch (error) {
      if (identity.type === "user") {
        await ctx.runMutation(
          internal.aiGenerationStraicoQuota.refundUserQuota,
          { userId: identity.userId }
        );
      } else {
        await ctx.runMutation(
          internal.aiGenerationStraicoQuota.refundGuestQuota,
          { clientId: identity.guestId }
        );
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: "api",
      };
    }
  },
});

/**
 * Smoke test — runs the Straico provider end-to-end (no quota, no auth) so
 * we can verify the deployment wiring via `npx convex run`.
 *
 *   npx convex run aiGenerationStraico:smokeTest
 */
export const smokeTest = action({
  args: { prompt: v.optional(v.string()) },
  handler: async (
    _ctx,
    args
  ): Promise<{
    ok: boolean;
    preview: string;
    schemaPreview: string;
    metaPreview: string;
    tokensUsed: number;
  }> => {
    const apiKey = process.env.STRAICO_API_KEY;
    if (!apiKey) throw new Error("STRAICO_API_KEY not set on this deployment");

    const prompt =
      args.prompt ??
      "Animated title card that fades in 'HELLO MOTIONKIT' in amber on a dark zinc background. 3 seconds at 30fps, 1920x1080.";

    const result = await generateWithStraico(
      { apiKey },
      {
        prompt,
        systemPrompt: buildSystemPrompt({ prompt, category: "title" })
          .systemPrompt,
      }
    );

    return {
      ok: true,
      preview: result.componentCode.slice(0, 400),
      schemaPreview: result.schema.slice(0, 200),
      metaPreview: result.meta.slice(0, 200),
      tokensUsed: result.tokensUsed,
    };
  },
});
