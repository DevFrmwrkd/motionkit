import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeOptionalString,
  resolveOpenRouterModel,
} from "../shared/aiProviderConfig";

test("normalizeOptionalString trims values and drops blank input", () => {
  assert.equal(normalizeOptionalString("  z-ai/glm-5.1  "), "z-ai/glm-5.1");
  assert.equal(normalizeOptionalString("   "), undefined);
  assert.equal(normalizeOptionalString(undefined), undefined);
});

test("resolveOpenRouterModel prefers the first non-blank candidate", () => {
  assert.equal(
    resolveOpenRouterModel("   ", " deepseek/deepseek-chat-v3:free ", "z-ai/glm-5.1"),
    "deepseek/deepseek-chat-v3:free"
  );
  assert.equal(resolveOpenRouterModel("  ", undefined, ""), undefined);
});
