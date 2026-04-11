"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { requireAuthUserIdFromAction } from "../lib/authz";
import { dispatchLambdaJob } from "./lib/renderDispatch";

/**
 * User-triggered render dispatch to Remotion Lambda.
 *
 * The heavy lifting lives in `actions/lib/renderDispatch.ts` so the preset
 * review pipeline can reuse the same implementation for platform-owned test
 * renders instead of relying on a nonexistent queue processor.
 */
export const dispatchRender = action({
  args: {
    jobId: v.id("renderJobs"),
  },
  handler: async (ctx, args) => {
    const authUserId = await requireAuthUserIdFromAction(ctx);
    await dispatchLambdaJob(ctx, args.jobId, authUserId);
  },
});

export const dispatchRenderInternal = internalAction({
  args: {
    jobId: v.id("renderJobs"),
  },
  handler: async (ctx, args) => {
    await dispatchLambdaJob(ctx, args.jobId);
  },
});
