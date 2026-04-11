import assert from "node:assert/strict";
import test from "node:test";
import {
  RENDERABLE_COMPOSITION_IDS as sharedIds,
} from "../shared/renderableCompositionIds";
import {
  RENDERABLE_COMPOSITION_IDS as appIds,
  compositionIdFromBundleUrl,
  isRenderableBundle,
} from "../app/src/lib/renderableCompositions";
import {
  RENDERABLE_COMPOSITION_IDS as convexIds,
  isRenderableComposition,
} from "../convex/lib/renderableCompositions";

test("renderable composition ids stay aligned across shared, app, and convex helpers", () => {
  assert.deepEqual(appIds, sharedIds);
  assert.deepEqual(convexIds, sharedIds);
  assert.equal(new Set(sharedIds).size, sharedIds.length);
});

test("bundle URL parsing and renderability checks use the shared id list", () => {
  assert.equal(compositionIdFromBundleUrl("local://presets/HelloWorld"), "HelloWorld");
  assert.equal(isRenderableBundle("local://presets/HelloWorld"), true);
  assert.equal(isRenderableBundle("ai://generated/custom-preset"), false);
  assert.equal(isRenderableComposition("HelloWorld"), true);
  assert.equal(isRenderableComposition("custom-preset"), false);
});
