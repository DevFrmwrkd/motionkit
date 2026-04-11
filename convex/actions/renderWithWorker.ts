"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { requireAuthUserIdFromAction } from "../lib/authz";
import { dispatchWorkerJob } from "./lib/renderDispatch";

/**
 * User-triggered render dispatch to the self-hosted render worker.
 *
 * The implementation is shared with the preset review pipeline so test
 * renders exercise the same worker path as interactive renders.
 */
export const dispatchRender = action({
  args: {
    jobId: v.id("renderJobs"),
  },
  handler: async (ctx, args) => {
    const authUserId = await requireAuthUserIdFromAction(ctx);
    await dispatchWorkerJob(ctx, args.jobId, authUserId);
  },
});

export const dispatchRenderInternal = internalAction({
  args: {
    jobId: v.id("renderJobs"),
  },
  handler: async (ctx, args) => {
    await dispatchWorkerJob(ctx, args.jobId);
  },
});
