import assert from "node:assert/strict";
import test from "node:test";
import { normalizePresetPricing } from "../shared/presetPricing";

test("normalizePresetPricing preserves canonical paid pricing", () => {
  assert.deepEqual(
    normalizePresetPricing({
      license: "paid-commercial",
      priceCents: 2500,
    }),
    {
      license: "paid-commercial",
      priceCents: 2500,
      isPremium: true,
      price: 25,
    }
  );
});

test("normalizePresetPricing infers paid-personal from legacy premium fields", () => {
  assert.deepEqual(
    normalizePresetPricing({
      isPremium: true,
      price: 19.99,
    }),
    {
      license: "paid-personal",
      priceCents: 1999,
      isPremium: true,
      price: 19.99,
    }
  );
});

test("normalizePresetPricing zeroes free licenses even if legacy price is present", () => {
  assert.deepEqual(
    normalizePresetPricing({
      license: "free",
      priceCents: 500,
      price: 5,
      isPremium: true,
    }),
    {
      license: "free",
      priceCents: 0,
      isPremium: false,
      price: 0,
    }
  );
});
