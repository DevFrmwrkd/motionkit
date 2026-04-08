"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Subscribes to render jobs for a user via Convex reactive query.
 * Returns real-time updates as jobs move through queued -> rendering -> done/failed.
 */
export function useRenderQueue(userId: Id<"users"> | undefined) {
  const jobs = useQuery(
    api.renderJobs.listByUser,
    userId ? { userId } : "skip"
  );

  const activeJobs = jobs?.filter(
    (j) => j.status === "queued" || j.status === "rendering"
  );
  const completedJobs = jobs?.filter((j) => j.status === "done");
  const failedJobs = jobs?.filter((j) => j.status === "failed");

  return {
    jobs: jobs ?? [],
    activeJobs: activeJobs ?? [],
    completedJobs: completedJobs ?? [],
    failedJobs: failedJobs ?? [],
    isLoading: jobs === undefined,
  };
}
