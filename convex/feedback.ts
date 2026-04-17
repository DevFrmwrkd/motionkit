import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

// Phase A: site-wide feedback tracker (bugs / improvements / micro).
// Allows signed-in users OR anon guests (clientId from localStorage).
// Phase B: approved rows get synced to GitHub issues.
// Phase C: auto-fix via Windmill → Claude Code on Hetzner.

const kindValidator = v.union(
  v.literal("bug"),
  v.literal("improvement"),
  v.literal("micro")
);

const statusValidator = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("approved"),
  v.literal("in-progress"),
  v.literal("shipped"),
  v.literal("wontfix")
);

// ─── Screenshot upload ─────────────────────────────────────────
// Client requests an upload URL, uploads directly to Convex storage,
// then passes the returned storage id into `create`. No auth needed:
// file is unreachable until referenced by a feedback row.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Queries ───────────────────────────────────────────────────

async function resolveScreenshotUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  storageId: Id<"_storage"> | undefined
): Promise<string | null> {
  if (!storageId) return null;
  return await ctx.storage.getUrl(storageId);
}

async function enrichFeedback(
  ctx: QueryCtx,
  row: Doc<"feedback">,
  voterUserId: Id<"users"> | null,
  voterClientId: string | null
) {
  const screenshotUrl = await resolveScreenshotUrl(ctx, row.screenshotId);

  let hasVoted = false;
  if (voterUserId) {
    const vote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_user_feedback", (q) =>
        q.eq("voterUserId", voterUserId).eq("feedbackId", row._id)
      )
      .first();
    hasVoted = Boolean(vote);
  } else if (voterClientId) {
    const vote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_client_feedback", (q) =>
        q.eq("voterClientId", voterClientId).eq("feedbackId", row._id)
      )
      .first();
    hasVoted = Boolean(vote);
  }

  return { ...row, screenshotUrl, hasVoted };
}

export const list = query({
  args: {
    kind: v.optional(kindValidator),
    status: v.optional(statusValidator),
    sort: v.optional(v.union(v.literal("top"), v.literal("new"))),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);

    let rows: Doc<"feedback">[];
    if (args.status) {
      rows = await ctx.db
        .query("feedback")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.kind) {
      rows = await ctx.db
        .query("feedback")
        .withIndex("by_kind", (q) => q.eq("kind", args.kind!))
        .collect();
    } else {
      rows = await ctx.db.query("feedback").collect();
    }

    if (args.kind && args.status) {
      rows = rows.filter((r) => r.kind === args.kind);
    }

    const sort = args.sort ?? "top";
    rows.sort((a, b) => {
      if (sort === "new") return b.createdAt - a.createdAt;
      // "top": upvotes desc, then newest
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      return b.createdAt - a.createdAt;
    });

    return await Promise.all(
      rows.map((row) =>
        enrichFeedback(ctx, row, authUserId, args.clientId ?? null)
      )
    );
  },
});

export const get = query({
  args: {
    id: v.id("feedback"),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    return await enrichFeedback(ctx, row, authUserId, args.clientId ?? null);
  },
});

export const listComments = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("feedbackComments")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();
    comments.sort((a, b) => a.createdAt - b.createdAt);
    return comments;
  },
});

// ─── Mutations ─────────────────────────────────────────────────

export const create = mutation({
  args: {
    kind: kindValidator,
    title: v.string(),
    body: v.string(),
    screenshotId: v.optional(v.id("_storage")),
    pagePath: v.optional(v.string()),
    clientId: v.optional(v.string()),
    authorLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedTitle = args.title.trim();
    const trimmedBody = args.body.trim();
    if (trimmedTitle.length < 3) throw new Error("Title too short");
    if (trimmedTitle.length > 140) throw new Error("Title too long");
    if (trimmedBody.length > 5000) throw new Error("Body too long");

    const authUserId = await getAuthUserId(ctx);
    if (!authUserId && !args.clientId) {
      throw new Error("Must be signed in or provide a clientId");
    }

    const now = Date.now();
    const user = authUserId ? await ctx.db.get(authUserId) : null;

    const id = await ctx.db.insert("feedback", {
      kind: args.kind,
      title: trimmedTitle,
      body: trimmedBody,
      screenshotId: args.screenshotId,
      pagePath: args.pagePath,
      authorUserId: authUserId ?? undefined,
      authorClientId: authUserId ? undefined : args.clientId,
      authorLabel: user?.name ?? args.authorLabel ?? "Anonymous",
      status: "new",
      upvotes: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const vote = mutation({
  args: {
    feedbackId: v.id("feedback"),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId && !args.clientId) {
      throw new Error("Must be signed in or provide a clientId");
    }

    const row = await ctx.db.get(args.feedbackId);
    if (!row) throw new Error("Feedback not found");

    // Dedupe: check if this voter already voted.
    let existing: Doc<"feedbackVotes"> | null = null;
    if (authUserId) {
      existing = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_user_feedback", (q) =>
          q.eq("voterUserId", authUserId).eq("feedbackId", args.feedbackId)
        )
        .first();
    } else if (args.clientId) {
      existing = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_client_feedback", (q) =>
          q
            .eq("voterClientId", args.clientId)
            .eq("feedbackId", args.feedbackId)
        )
        .first();
    }

    if (existing) {
      // Toggle off.
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.feedbackId, {
        upvotes: Math.max(0, row.upvotes - 1),
        updatedAt: Date.now(),
      });
      return { voted: false };
    }

    await ctx.db.insert("feedbackVotes", {
      feedbackId: args.feedbackId,
      voterUserId: authUserId ?? undefined,
      voterClientId: authUserId ? undefined : args.clientId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.feedbackId, {
      upvotes: row.upvotes + 1,
      updatedAt: Date.now(),
    });
    return { voted: true };
  },
});

export const comment = mutation({
  args: {
    feedbackId: v.id("feedback"),
    body: v.string(),
    clientId: v.optional(v.string()),
    authorLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.body.trim();
    if (trimmed.length < 1) throw new Error("Comment empty");
    if (trimmed.length > 2000) throw new Error("Comment too long");

    const authUserId = await getAuthUserId(ctx);
    if (!authUserId && !args.clientId) {
      throw new Error("Must be signed in or provide a clientId");
    }

    const row = await ctx.db.get(args.feedbackId);
    if (!row) throw new Error("Feedback not found");

    const user = authUserId ? await ctx.db.get(authUserId) : null;

    await ctx.db.insert("feedbackComments", {
      feedbackId: args.feedbackId,
      authorUserId: authUserId ?? undefined,
      authorClientId: authUserId ? undefined : args.clientId,
      authorLabel: user?.name ?? args.authorLabel ?? "Anonymous",
      body: trimmed,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.feedbackId, {
      commentCount: row.commentCount + 1,
      updatedAt: Date.now(),
    });
  },
});

// ─── Admin / triage ────────────────────────────────────────────
// Only admin role can change status. Phase B will add a server action
// that transitions `approved` → creates GitHub issue and stores ref.
export const setStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Sign in required");
    const user = await ctx.db.get(authUserId);
    if (!user || user.role !== "admin") {
      throw new Error("Admin only");
    }
    await ctx.db.patch(args.feedbackId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
