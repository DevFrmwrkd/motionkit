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
import { Player } from "@remotion/player";
import { compileAndExecute } from "../lib/preset-runtime/sandbox";
import type { PresetExport } from "../lib/types";

type HostMessage =
  | {
      type: "load";
      code: string;
      schemaJson: string;
      metaJson: string;
      inputProps: Record<string, unknown>;
    }
  | { type: "props"; inputProps: Record<string, unknown> };

type GuestMessage =
  | { type: "ready" }
  | { type: "error"; error: string };

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
        ...containerStyle,
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

function RuntimeView({ state }: { state: RuntimeState }) {
  if (state.error) {
    return <StatusView color="#f87171">{state.error}</StatusView>;
  }
  if (!state.preset) {
    return <StatusView color="#71717a">Waiting for preset…</StatusView>;
  }
  const merged = mergeDefaults(state.preset, state.inputProps);
  return (
    <div style={containerStyle}>
      <Player
        component={state.preset.component}
        inputProps={merged}
        durationInFrames={state.preset.meta.durationInFrames}
        fps={state.preset.meta.fps}
        compositionWidth={state.preset.meta.width}
        compositionHeight={state.preset.meta.height}
        style={{ width: "100%", height: "100%" }}
        controls
        autoPlay
        loop
        acknowledgeRemotionLicense
      />
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
});

postToParent({ type: "ready" });
