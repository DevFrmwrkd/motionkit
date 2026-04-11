/**
 * The set of Remotion composition IDs that are actually bundled into the
 * Lambda serve URL at build time (see app/src/remotion/Root.tsx).
 *
 * Rendering currently ONLY works for compositions in this list. AI-generated
 * and user-imported presets live as source code in the preset record but
 * have no matching composition in the deployed bundle, so the render path
 * must fail fast with a clear error instead of calling Remotion Lambda and
 * getting a cryptic "composition not found" deep inside the render loop.
 *
 * When the bundler pipeline learns to compile source code on the fly, this
 * file will become the fallback set and the check will move to a flag on
 * the preset record.
 *
 * Keep in sync with app/src/remotion/Root.tsx via the shared root-level
 * `shared/renderableCompositionIds.ts` module.
 */
import {
  RENDERABLE_COMPOSITION_IDS,
  type RenderableCompositionId,
} from "../../shared/renderableCompositionIds";

export { RENDERABLE_COMPOSITION_IDS, type RenderableCompositionId };

const COMPOSITION_ID_SET = new Set<string>(RENDERABLE_COMPOSITION_IDS);

/**
 * Derive a composition id from a bundleUrl. Supports:
 *   - "local://presets/HelloWorld" → "HelloWorld"
 *   - Anything else returns null (including "ai://generated/..." and bare ids).
 */
export function compositionIdFromBundleUrl(bundleUrl: string): string | null {
  const tail = bundleUrl.split("/").pop();
  if (!tail) return null;
  return tail;
}

export function isRenderableComposition(
  compositionId: string | null
): compositionId is RenderableCompositionId {
  if (!compositionId) return false;
  return COMPOSITION_ID_SET.has(compositionId);
}
