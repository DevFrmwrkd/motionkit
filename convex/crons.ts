/**
 * Scheduled maintenance jobs (Phase 2).
 *
 * Keep this file thin — one cron declaration per scheduled job, with the
 * handler living in the domain file it maintains. That way the audit trail
 * for "what runs on a schedule" stays in one place, and the schedules
 * themselves don't drift from the code they trigger.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Prune compile-error rows older than 30 days. These grow unbounded as
 * creators iterate on broken presets — a single day of aggressive AI
 * generation can write thousands of rows per user. 30d is enough lookback
 * for moderation ("why was this preset rejected?") without letting the
 * table balloon.
 */
crons.daily(
  "prune old compile errors",
  { hourUTC: 3, minuteUTC: 17 },
  internal.presetReview.pruneCompileErrorsOlderThan,
  { olderThanMs: 30 * 24 * 60 * 60 * 1000 }
);

export default crons;
