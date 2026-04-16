/**
 * Sandbox runtime entry — compiled into a single self-contained IIFE by
 * app/scripts/build-sandbox.mjs and served as /sandbox/bundle.js.
 *
 * This file is the entire runtime that boots inside the null-origin iframe
 * rendered by <SandboxedPresetPlayer />. It:
 *
 *   1. Creates a React root on #root
 *   2. Listens for postMessage from the parent
 *   3. Compiles and executes incoming preset source via the hardened sandbox
 *   4. Mounts the compiled component inside a Remotion Player
 *
 * Because this bundle is produced by esbuild *outside* of Next.js, it has
 * no relationship to the Next server bundle — it cannot pull ws, node:https,
 * or any of the other problematic transitive deps that Next's internal
 * tooling drags into every page handler. The sandbox truly is a thin
 * isolated runtime.
 *
 * It also means the sandbox can evolve independently: if we ever need
 * hot-swap preset runtime helpers (e.g. new mapHelpers), we rebuild this
 * bundle and serve it from /sandbox/bundle.js — no Next redeploy needed.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { Thumbnail, type PlayerRef } from "@remotion/player";
import { compileAndExecute } from "../lib/preset-runtime/sandbox";
import type { PresetExport } from "../lib/types";

/**
 * Early safety patches — executed before any user code runs.
 * 
 * 1. Patches React.createElement to convert script/template tags to Fragment
 * 2. Wraps console.error to suppress the script tag warning from React itself
 */
function applySafetyPatches() {
  // Patch 1: Block script/template element creation
  const dangerousTags = new Set([
    "script",
    "template",
  ]);

  const _originalCreateElement = React.createElement;

  React.createElement = function (this: any, type: any, ...args: any[]) {
    let typeStr = "";

    // Extract the tag name from type
    if (typeof type === "string") {
      typeStr = type.toLowerCase().trim();
    } else if (type && typeof type === "object" && "$$typeof" in type) {
      // React component object (Fragment, Suspense, etc.) — safe
      return _originalCreateElement.apply(this, [type, ...args]);
    }

    // Block dangerous tags (script, template only). Replace with Fragment —
    // replacing with "template" triggers the same React warning we're trying
    // to avoid, since <template> is on React's own danger list.
    if (dangerousTags.has(typeStr)) {
      return _originalCreateElement.call(this, React.Fragment, null);
    }

    return _originalCreateElement.apply(this, [type, ...args]);
  } as typeof React.createElement;

  // Mark as patched to avoid double-patching
  (React as any)._runtimePatched = true;

  // Patch 2: Suppress React's script tag warning, since we're already blocking it
  const _originalError = console.error;
  const _originalWarn = console.warn;

  // React's exact phrasing has drifted across versions ("rendering a
  // component" vs "rendering React component"). Match on the stable prefix.
  const scriptWarning = "Encountered a script tag while rendering";

  console.error = function (...args) {
    const message = String(args[0]);
    // Suppress the script tag warning since our patch above prevents it from happening anyway
    if (!message.includes(scriptWarning)) {
      return _originalError.apply(console, args as any);
    }
  };

  console.warn = function (...args) {
    const message = String(args[0]);
    // Also suppress from warnings in case React reports it there
    if (!message.includes(scriptWarning)) {
      return _originalWarn.apply(console, args as any);
    }
  };
}

applySafetyPatches();

type HostMessage =
  | {
      type: "load";
      code: string;
      schemaJson: string;
      metaJson: string;
      inputProps: Record<string, unknown>;
    }
  | { type: "props"; inputProps: Record<string, unknown> }
  | { type: "play" }
  | { type: "pause" }
  | { type: "seek"; frame: number };

type GuestMessage =
  | { type: "ready" }
  | { type: "error"; error: string }
  | { type: "frameupdate"; frame: number }
  | { type: "seeked"; frame: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "ended" };

function postToParent(msg: GuestMessage) {
  try {
    window.parent.postMessage(msg, "*");
  } catch {
    // Parent may have unmounted — swallow.
  }
}

type RuntimeState = {
  preset: PresetExport | null;
  inputProps: Record<string, unknown>;
  error: string | null;
};

function mergeDefaults(
  preset: PresetExport,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(preset.schema)) {
    base[key] = field.default;
  }
  return { ...base, ...overrides };
}

const containerStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  background: "#09090b",
  overflow: "hidden",
};

const statusStyle: React.CSSProperties = {
  ...containerStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

function StatusView({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...statusStyle,
        color,
        fontSize: 13,
        padding: 24,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

// Shared ref the message handler uses to drive the player from host commands.
const playerRef: { current: PlayerRef | null } = { current: null };

function attachPlayerListeners(player: PlayerRef) {
  const handleFrameUpdate = (e: { detail: { frame: number } }) => {
    postToParent({ type: "frameupdate", frame: e.detail.frame });
  };
  const handleSeeked = (e: { detail: { frame: number } }) => {
    postToParent({ type: "seeked", frame: e.detail.frame });
  };
  const handlePlay = () => postToParent({ type: "play" });
  const handlePause = () => postToParent({ type: "pause" });
  const handleEnded = () => postToParent({ type: "ended" });

  player.addEventListener("frameupdate", handleFrameUpdate);
  player.addEventListener("seeked", handleSeeked);
  player.addEventListener("play", handlePlay);
  player.addEventListener("pause", handlePause);
  player.addEventListener("ended", handleEnded);
}

function handlePlayerRef(instance: PlayerRef | null) {
  if (instance && instance !== playerRef.current) {
    playerRef.current = instance;
    attachPlayerListeners(instance);
    // Emit initial state so the parent timeline reflects the current frame
    // immediately after (re)mount, instead of waiting for the first tick.
    postToParent({ type: "frameupdate", frame: instance.getCurrentFrame() });
  } else if (!instance) {
    playerRef.current = null;
  }
}

function RuntimeView({ state }: { state: RuntimeState }) {
  if (state.error) {
    return <StatusView color="#f87171">{state.error}</StatusView>;
  }
  if (!state.preset) {
    return <StatusView color="#71717a">Waiting for preset…</StatusView>;
  }
  const merged = mergeDefaults(state.preset, state.inputProps);
  // Show a mid-animation frame so the preview reflects the "final" look
  // the user will see in their rendered video — text animated in, bars
  // drawn, etc. Frame 0 often shows empty pre-animation state.
  const frameToDisplay = Math.floor(
    state.preset.meta.durationInFrames * 0.75
  );
  return (
    <ThumbnailStage
      component={state.preset.component}
      inputProps={merged}
      compositionWidth={state.preset.meta.width}
      compositionHeight={state.preset.meta.height}
      durationInFrames={state.preset.meta.durationInFrames}
      fps={state.preset.meta.fps}
      frameToDisplay={frameToDisplay}
    />
  );
}

/**
 * Renders a single Remotion frame scaled to fill the iframe while
 * preserving the composition aspect ratio. We avoid @remotion/player's
 * <Player> entirely — user explicitly does not want live playback in
 * the editor; the preview is a static "what will be rendered" snapshot
 * that re-renders whenever inputProps change. Video render happens only
 * when the preset is published to the marketplace.
 *
 * Thumbnail's own `style` prop caps at compositionWidth × compositionHeight
 * in physical pixels, so a 1920×1080 thumbnail in a 1500px viewport
 * renders tiny. We wrap it in a manually-scaled transform container to
 * force fill-to-parent with correct aspect ratio.
 */
function ThumbnailStage({
  component,
  inputProps,
  compositionWidth,
  compositionHeight,
  durationInFrames,
  fps,
  frameToDisplay,
}: {
  component: PresetExport["component"];
  inputProps: Record<string, unknown>;
  compositionWidth: number;
  compositionHeight: number;
  durationInFrames: number;
  fps: number;
  frameToDisplay: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const parent = el.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      if (pw === 0 || ph === 0) return;
      const next = Math.min(pw / compositionWidth, ph / compositionHeight);
      setScale(next);
    });
    if (el.parentElement) observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, [compositionWidth, compositionHeight]);

  return (
    <div style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        ref={containerRef}
        style={{
          width: compositionWidth,
          height: compositionHeight,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {/* key forces Thumbnail to remount whenever inputProps change.
            Without this, @remotion/player's Thumbnail memoizes the
            rendered frame and ignores subsequent inputProps updates,
            so the workstation's "Chart Title" edit never reflected in
            the preview — the whole point of this view. */}
        <Thumbnail
          key={JSON.stringify(inputProps)}
          component={component}
          inputProps={inputProps}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          durationInFrames={durationInFrames}
          fps={fps}
          frameToDisplay={frameToDisplay}
          style={{ width: "100%", height: "100%" }}
          // @ts-expect-error Remotion accepts this prop at runtime; types lag the release.
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");
const root = createRoot(rootEl);

let state: RuntimeState = { preset: null, inputProps: {}, error: null };
function render() {
  root.render(<RuntimeView state={state} />);
}
render();

window.addEventListener("message", (event) => {
  const data = event.data as HostMessage | null;
  if (!data || typeof data !== "object") return;

  if (data.type === "load") {
    const result = compileAndExecute(data.code, data.schemaJson, data.metaJson);
    if (!result.ok) {
      const err = result.error.message;
      state = { preset: null, inputProps: {}, error: err };
      render();
      postToParent({ type: "error", error: err });
      return;
    }
    state = {
      preset: result.preset,
      inputProps: data.inputProps ?? {},
      error: null,
    };
    render();
    return;
  }

  if (data.type === "props") {
    state = { ...state, inputProps: data.inputProps ?? {} };
    render();
    return;
  }

  if (data.type === "play") {
    playerRef.current?.play();
    return;
  }
  if (data.type === "pause") {
    playerRef.current?.pause();
    return;
  }
  if (data.type === "seek") {
    playerRef.current?.seekTo(data.frame);
    return;
  }
});

postToParent({ type: "ready" });
