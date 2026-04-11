/**
 * Client-side helpers for the shared renderable composition id list.
 *
 * Used by the workstation to disable the Render button on unsupported
 * presets before the user wastes a click.
 */

import {
  RENDERABLE_COMPOSITION_IDS,
  type RenderableCompositionId,
} from "../../../shared/renderableCompositionIds";

export { RENDERABLE_COMPOSITION_IDS, type RenderableCompositionId };

const COMPOSITION_ID_SET = new Set<string>(RENDERABLE_COMPOSITION_IDS);

export function compositionIdFromBundleUrl(bundleUrl: string): string | null {
  const tail = bundleUrl.split("/").pop();
  return tail || null;
}

export function isRenderableBundle(bundleUrl: string): boolean {
  const id = compositionIdFromBundleUrl(bundleUrl);
  return id != null && COMPOSITION_ID_SET.has(id);
}
