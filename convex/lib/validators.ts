import { v } from "convex/values";

export const categoryValidator = v.union(
  v.literal("intro"),
  v.literal("title"),
  v.literal("lower-third"),
  v.literal("cta"),
  v.literal("transition"),
  v.literal("outro"),
  v.literal("full"),
  v.literal("chart"),
  v.literal("map"),
  v.literal("social")
);

export const statusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);
