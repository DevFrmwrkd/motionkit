/**
 * Review state machine for Phase 2 / WS-2.
 *
 * The publish pipeline moves a preset through a small number of discrete
 * states. Each transition is explicit: the calling code names the
 * transition, the handler validates the from-state, patches the row, and
 * writes an audit log entry. Illegal transitions throw so caller bugs are
 * loud rather than silent data corruption.
 *
 * State machine (see PHASE-2.md §WS-2 for full rationale):
 *
 *      ┌─────────┐
 *      │  draft  │◄──────────────────────────────┐
 *      └────┬────┘                                │
 *           │ submit                              │
 *           ▼                                     │
 *      ┌──────────────┐  validate-fail   ┌────────┴─────┐
 *      │  validating  │────────────────► │   rejected   │
 *      └──────┬───────┘                   └──────────────┘
 *             │ validate-ok                        ▲
 *             ▼                                    │
 *      ┌──────────────────┐  render-fail           │
 *      │  test-rendering  │───────────────────────►│
 *      └──────┬───────────┘                        │
 *             │ render-ok                          │
 *             ▼                                    │
 *      ┌────────────────┐  admin-reject           │
 *      │ pending-review │───────────────────────►│
 *      └──────┬─────────┘                          │
 *             │ admin-approve                       │
 *             ▼                                    │
 *      ┌──────────┐                                 │
 *      │ approved │─────── publish ────────►┐       │
 *      └──────────┘                         │       │
 *                                           ▼       │
 *                                   ┌─────────────┐ │
 *                                   │  published  │ │
 *                                   └──────┬──────┘ │
 *                                          │ unlist │
 *                                          ▼        │
 *                                   ┌─────────────┐ │
 *                                   │  archived   │◄┘
 *                                   └─────────────┘
 */

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  mutation,
  internalMutation,
  query,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  reviewStateValidator,
  compilePhaseValidator,
  statusValidator,
} from "./schema";
import {
  requireSignedInUser,
  requireAdmin,
  canAccessPreset,
} from "./lib/authz";
import { normalizeReason } from "./lib/moderation";

// ─── Transition table ───────────────────────────────────────

type ReviewState = Doc<"presets">["reviewState"];

/**
 * Allowed transitions. The pipeline driver calls `assertTransition` before
 * patching the row; bugs show up as thrown errors rather than silent state
 * leaks.
 */
const TRANSITIONS: Record<NonNullable<ReviewState>, Array<NonNullable<ReviewState>>> = {
  draft: ["validating", "archived"],
  validating: ["test-rendering", "rejected", "draft"],
  "test-rendering": ["pending-review", "rejected", "draft"],
  "pending-review": ["approved", "rejected", "draft"],
  approved: ["published", "rejected"],
  published: ["archived", "rejected"],
  rejected: ["draft", "archived"],
  archived: ["draft"],
};

/**
 * Check a state machine transition. On success: no side effect (the
 * caller writes its own success audit entry with domain metadata). On
 * failure: write an illegal-transition audit row THEN throw. Failed
 * transitions are exactly the rows you most want to trace later ("why
 * didn't my preset publish?"), so every gate goes through this.
 */
async function guardTransitionWithAudit(
  ctx: MutationCtx,
  from: ReviewState,
  to: NonNullable<ReviewState>,
  context: {
    actorId?: Id<"users">;
    targetId: Id<"presets">;
    reason?: string;
  }
): Promise<void> {
  const effectiveFrom: NonNullable<ReviewState> = from ?? "draft";
  const allowed = TRANSITIONS[effectiveFrom];
  if (allowed.includes(to)) return;
  // Illegal transition — log and throw. We use "preset.validate" as the
  // closest matching action type; the payload carries the intended
  // transition so the audit viewer can show it.
  await ctx.db.insert("auditLog", {
    actorId: context.actorId,
    action: "preset.validate",
    targetType: "preset",
    targetId: context.targetId,
    payload: JSON.stringify({
      transition: { from: effectiveFrom, to },
      result: "illegal",
      allowed,
    }),
    reason: context.reason ?? `Illegal transition ${effectiveFrom} → ${to}`,
    createdAt: Date.now(),
  });
  throw new Error(
    `Illegal review transition: ${effectiveFrom} → ${to}. ` +
      `Allowed from ${effectiveFrom}: ${allowed.join(", ")}`
  );
}

// ─── Internal helpers (used by validateAndTestRender action) ──

export const getPresetInternal = internalQuery({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.presetId);
  },
});

export const setReviewStateInternal = internalMutation({
  args: {
    presetId: v.id("presets"),
    to: reviewStateValidator,
    actorId: v.id("users"),
    reason: v.optional(v.string()),
    payload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    await guardTransitionWithAudit(ctx, preset.reviewState, args.to, {
      actorId: args.actorId,
      targetId: args.presetId,
      reason: args.reason,
    });

    const update: Partial<Doc<"presets">> = { reviewState: args.to };
    // Mirror the review state into the coarse public `status` field only
    // for the two terminal public states, so the rest of the app keeps
    // working without knowing about reviewState.
    if (args.to === "published") update.status = "published";
    if (args.to === "archived") update.status = "archived";
    if (args.to === "rejected") {
      update.rejectedReason = args.reason;
    }
    await ctx.db.patch(args.presetId, update);

    await ctx.db.insert("auditLog", {
      actorId: args.actorId,
      action: mapStateToAuditAction(args.to) as Doc<"auditLog">["action"],
      targetType: "preset",
      targetId: args.presetId,
      payload: args.payload,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return args.to;
  },
});

function mapStateToAuditAction(
  to: NonNullable<ReviewState>
): Doc<"auditLog">["action"] {
  switch (to) {
    case "approved":
      return "preset.approve";
    case "rejected":
      return "preset.reject";
    case "archived":
      return "preset.archive";
    case "published":
      return "preset.publish";
    case "draft":
    case "validating":
    case "test-rendering":
    case "pending-review":
    default:
      return "preset.validate";
  }
}

export const recordValidationInternal = internalMutation({
  args: {
    presetId: v.id("presets"),
    publishableFlags: v.object({
      previewable: v.boolean(),
      renderable: v.boolean(),
      commercialUseReady: v.boolean(),
    }),
    bundleHash: v.optional(v.string()),
    bundleSignature: v.optional(v.string()),
    lastTestRenderJobId: v.optional(v.id("renderJobs")),
  },
  handler: async (ctx, args) => {
    const { presetId, ...updates } = args;
    await ctx.db.patch(presetId, {
      ...updates,
      lastValidatedAt: Date.now(),
    });
  },
});

/**
 * Create a render job row for the test-render step of the publish pipeline.
 * Split out from `renderJobs.create` because this path:
 *   - must succeed even when the preset is not yet public (the standard
 *     `create` mutation blocks on canAccessPreset)
 *   - must always use the "platform" render engine so test renders burn
 *     platform credit rather than the creator's BYOK key
 */
export const enqueueTestRenderInternal = internalMutation({
  args: {
    presetId: v.id("presets"),
    userId: v.id("users"),
    bundleUrl: v.string(),
    inputProps: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("renderJobs", {
      userId: args.userId,
      presetId: args.presetId,
      bundleUrl: args.bundleUrl,
      inputProps: args.inputProps,
      status: "queued",
      renderEngine: "platform",
    });
  },
});

/**
 * Scheduled: delete `compileErrors` rows older than `olderThanMs`. Driven
 * by `crons.ts` on a daily cadence. Iteration-bounded per call so a
 * runaway backlog can't stall the cron — at most `maxBatch` rows deleted
 * per invocation, leftovers clear on the next run.
 *
 * Implementation notes:
 *   - We scan via `.take(scanCap)` on the by_phase index so the mutation
 *     cannot accidentally load millions of rows into memory via `.collect()`.
 *   - Without a `by_createdAt` index we can't query old rows directly, but
 *     the table is append-only so older rows land earlier in the physical
 *     order — the top-N of the phase index skews old. If this still
 *     underdeletes at scale, add a `by_createdAt` index and switch to
 *     `.withIndex("by_createdAt", q => q.lt("createdAt", cutoff))`.
 */
export const pruneCompileErrorsOlderThan = internalMutation({
  args: {
    olderThanMs: v.number(),
    maxBatch: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const batchCap = Math.min(args.maxBatch ?? 1000, 10_000);
    // Scan a bounded window. We take 3× the delete cap so a phase with
    // many fresh rows doesn't monopolise the window and starve deletions.
    const scanCap = batchCap * 3;
    const window = await ctx.db
      .query("compileErrors")
      .withIndex("by_phase")
      .take(scanCap);
    const victims = window
      .filter((row) => row.createdAt < cutoff)
      .slice(0, batchCap);
    let deleted = 0;
    for (const row of victims) {
      await ctx.db.delete(row._id);
      deleted += 1;
    }
    return {
      deleted,
      scanned: window.length,
      hadMore: window.length === scanCap && victims.length === batchCap,
    };
  },
});

export const recordCompileErrorInternal = internalMutation({
  args: {
    presetId: v.optional(v.id("presets")),
    userId: v.optional(v.id("users")),
    generationId: v.optional(v.id("aiGenerations")),
    phase: compilePhaseValidator,
    message: v.string(),
    line: v.optional(v.number()),
    column: v.optional(v.number()),
    hint: v.optional(v.string()),
    sourceHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("compileErrors", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ─── Public mutations: author-side transitions ──────────────

export const submitForReview = mutation({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    if (preset.authorId !== caller._id) {
      throw new Error("Only the author can submit their preset for review");
    }
    await guardTransitionWithAudit(ctx, preset.reviewState, "validating", {
      actorId: caller._id,
      targetId: args.presetId,
    });
    await ctx.db.patch(args.presetId, { reviewState: "validating" });
    await ctx.db.insert("auditLog", {
      actorId: caller._id,
      action: "preset.validate",
      targetType: "preset",
      targetId: args.presetId,
      createdAt: Date.now(),
    });
  },
});

export const returnToDraft = mutation({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    if (preset.authorId !== caller._id) {
      throw new Error("Only the author can return their preset to draft");
    }
    await guardTransitionWithAudit(ctx, preset.reviewState, "draft", {
      actorId: caller._id,
      targetId: args.presetId,
    });
    await ctx.db.patch(args.presetId, { reviewState: "draft" });
  },
});

// ─── Public mutations: admin-side transitions ───────────────

export const adminApprove = mutation({
  args: {
    presetId: v.id("presets"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    const notes = normalizeReason(args.notes, { fieldName: "Approval notes" });
    await guardTransitionWithAudit(ctx, preset.reviewState, "approved", {
      actorId: admin._id,
      targetId: args.presetId,
      reason: notes,
    });
    await ctx.db.patch(args.presetId, {
      reviewState: "approved",
      reviewNotes: notes,
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "preset.approve",
      targetType: "preset",
      targetId: args.presetId,
      reason: notes,
      createdAt: Date.now(),
    });
  },
});

export const adminReject = mutation({
  args: {
    presetId: v.id("presets"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    const reason = normalizeReason(args.reason, {
      required: true,
      fieldName: "Rejection reason",
    })!;
    await guardTransitionWithAudit(ctx, preset.reviewState, "rejected", {
      actorId: admin._id,
      targetId: args.presetId,
      reason,
    });
    await ctx.db.patch(args.presetId, {
      reviewState: "rejected",
      rejectedReason: reason,
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "preset.reject",
      targetType: "preset",
      targetId: args.presetId,
      reason,
      createdAt: Date.now(),
    });
  },
});

export const adminPublish = mutation({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    await guardTransitionWithAudit(ctx, preset.reviewState, "published", {
      actorId: admin._id,
      targetId: args.presetId,
    });
    await ctx.db.patch(args.presetId, {
      reviewState: "published",
      status: "published",
      isPublic: true,
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "preset.publish",
      targetType: "preset",
      targetId: args.presetId,
      createdAt: Date.now(),
    });
  },
});

export const adminArchive = mutation({
  args: {
    presetId: v.id("presets"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    const reason = normalizeReason(args.reason, { fieldName: "Archive reason" });
    await guardTransitionWithAudit(ctx, preset.reviewState, "archived", {
      actorId: admin._id,
      targetId: args.presetId,
      reason,
    });
    await ctx.db.patch(args.presetId, {
      reviewState: "archived",
      status: "archived",
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "preset.archive",
      targetType: "preset",
      targetId: args.presetId,
      reason,
      createdAt: Date.now(),
    });
  },
});

// ─── Queries ────────────────────────────────────────────────

export const pendingReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("presets")
      .withIndex("by_review_state", (q) => q.eq("reviewState", "pending-review"))
      .collect();
  },
});

export const byReviewState = query({
  args: { reviewState: reviewStateValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("presets")
      .withIndex("by_review_state", (q) => q.eq("reviewState", args.reviewState))
      .collect();
  },
});

export const getPresetReviewStatus = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (!preset) return null;
    // Use getAuthUserId (not the old getUserIdentity + tokenIdentifier lookup
    // pattern — see commit 5eda40f). tokenIdentifier can be null/undefined
    // under some auth flows, which would cause viewerId to silently match the
    // wrong user or fail the unique() lookup.
    const viewerId: Id<"users"> | null = await getAuthUserId(ctx);
    if (!canAccessPreset(preset, viewerId) && preset.authorId !== viewerId) {
      return null;
    }
    return {
      reviewState: preset.reviewState ?? "draft",
      publishableFlags: preset.publishableFlags ?? null,
      lastValidatedAt: preset.lastValidatedAt ?? null,
      lastTestRenderJobId: preset.lastTestRenderJobId ?? null,
      rejectedReason: preset.rejectedReason ?? null,
      reviewNotes: preset.reviewNotes ?? null,
    };
  },
});

export const auditLogForPreset = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "preset").eq("targetId", args.presetId)
      )
      .order("desc")
      .take(100);
  },
});

// ─── Status validator passthrough ───────────────────────────
// Re-export so clients importing from this module get a single canonical
// statusValidator without needing to know where it came from.
export { statusValidator } from "./schema";
