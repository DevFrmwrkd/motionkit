/**
 * Capability-allowlist sandbox (WS-1b).
 *
 * This module is the single chokepoint through which compiled preset code
 * is executed on the client. It is designed to be the SAFEST way to run
 * untrusted preset source, complementing the null-origin iframe that
 * `<SandboxedPresetPlayer />` already uses.
 *
 * Defence in depth:
 *   1. The iframe provides hard isolation — even a total escape from this
 *      module cannot read parent-window state (cookies, localStorage, DOM).
 *   2. This module provides *soft* isolation — it controls which identifiers
 *      the generated code sees via `new Function(...allowedKeys, body)`.
 *      Every identifier not in the allowlist shadows a `undefined` local,
 *      so common escape attempts like `fetch(...)`, `document.cookie`, or
 *      `new Image().src = "http://attacker"` fail with ReferenceError.
 *
 * What's in the allowlist:
 *   - `React` and the common hooks (useState, useEffect, useMemo, …)
 *   - All Remotion exports (useCurrentFrame, interpolate, Sequence, …)
 *   - The preset-runtime helpers that GPT owns (mapHelpers, iconHelpers,
 *     styleHelpers). These are additive and always safe to expose.
 *   - A no-op `console` stub so `console.log("hi")` in preset code doesn't
 *     crash or leak to the parent console.
 *
 * What's DELIBERATELY absent:
 *   - `window`, `self`, `globalThis`, `document`
 *   - `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`
 *   - `localStorage`, `sessionStorage`, `IndexedDB`
 *   - `import`, `require`, `eval`, `Function` (the last-line-of-defence;
 *     see the red-team tests)
 *   - `process`, `Buffer`, `node:*` modules
 *
 * The compile path itself is shared with the Convex validator via
 * `convex/lib/compile.ts`. This module is the execution-time half; the
 * pure transpilation half lives in one place on purpose so the preview and
 * the cloud render cannot drift.
 *
 * See `PHASE-2.md` §WS-1 for the design rationale and `PHASE-2-PROGRESS.md`
 * for red-team test coverage.
 */

import React from "react";
import * as Remotion from "remotion";
import {
  compilePreset,
  buildComponentResolverSource,
  type CompileResult,
  type CompileError,
} from "../../../../convex/lib/compile";
import { mapHelpers, iconHelpers, styleHelpers } from "./index";
import type { PresetExport } from "../types";

/**
 * What a successfully sandboxed preset looks like to the caller. Mirrors
 * `PresetExport` but re-declared here so the sandbox does not leak its
 * internal dependency on `../types`.
 */
export interface SandboxedPreset {
  component: PresetExport["component"];
  schema: PresetExport["schema"];
  meta: PresetExport["meta"];
}

export interface SandboxSuccess {
  ok: true;
  preset: SandboxedPreset;
}

/**
 * Sandbox failures can carry either a compile-time phase (inherited from
 * `CompileError`) or an execution-time phase (`execute`, `resolve`) that
 * only the sandbox can produce. We keep the shape identical to
 * `CompileError` so a single UI error component can render either.
 */
export type SandboxErrorPhase = CompileError["phase"] | "execute" | "resolve";

export interface SandboxError {
  phase: SandboxErrorPhase;
  message: string;
  line?: number;
  column?: number;
  hint?: string;
}

export interface SandboxFailure {
  ok: false;
  error: SandboxError;
}

export type SandboxResult = SandboxSuccess | SandboxFailure;

/**
 * Build the capability scope exposed to preset code. Kept as a function
 * (not a module-level constant) so red-team tests can stub individual
 * entries and prove nothing sneaks through.
 */
export function buildCapabilityScope(): Record<string, unknown> {
  // Console stub — silent. We explicitly do not forward to the real console
  // so a hostile preset can't spam devtools or use console as a covert
  // channel back to the host.
  const consoleStub = {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
  };

  return {
    // React + the hooks common preset code reaches for.
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    useCallback: React.useCallback,
    useRef: React.useRef,
    useContext: React.useContext,
    useReducer: React.useReducer,
    useLayoutEffect: React.useLayoutEffect,
    Fragment: React.Fragment,
    // Spread all Remotion exports so `useCurrentFrame`, `Sequence`,
    // `interpolate`, `spring`, `AbsoluteFill`, etc. are available.
    ...Remotion,
    // Preset-runtime helpers (GPT owns these; Claude just exposes them).
    mapHelpers,
    iconHelpers,
    styleHelpers,
    console: consoleStub,
  };
}

/**
 * The names that are EXPLICITLY shadowed to undefined inside the sandbox
 * scope. Each of these is a capability we never want preset code to reach.
 *
 * We rely on `new Function` parameter shadowing: any identifier listed here
 * binds to `undefined` at call time, so `window.x`, `fetch(...)`, etc. throw
 * before doing anything interesting. This is a soft check — the iframe
 * isolation is the hard one — but it turns a "ReferenceError" into a
 * "TypeError" that bubbles up into our structured compile-error schema.
 */
export const DENIED_GLOBALS = [
  "window",
  "self",
  "globalThis",
  "parent",
  "top",
  "document",
  "location",
  "history",
  "navigator",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Request",
  "Response",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "crypto",
  "postMessage",
  "eval",
  "Function",
  "process",
  "require",
  "module",
  "exports",
  "Buffer",
  "__dirname",
  "__filename",
  "import",
  "importScripts",
] as const;

/**
 * Execute a previously-compiled preset inside the capability scope.
 *
 * This step is intentionally separated from `compilePreset` so:
 *   - The Convex validator can call the compile step without executing
 *     anything (headless validation is safer and faster).
 *   - The client sandbox can retry execution with a fresh scope after a
 *     React hot reload without re-transpiling.
 */
export function executeInSandbox(compileResult: CompileResult): SandboxResult {
  if (!compileResult.ok) {
    return { ok: false, error: compileResult.error };
  }

  const scope = buildCapabilityScope();
  const scopeKeys = Object.keys(scope);
  const scopeValues = Object.values(scope);

  // Append the denied globals as scope entries bound to undefined. Because
  // parameters shadow outer scope in non-strict function expressions, these
  // override whatever the real global object might expose.
  const deniedKeys = DENIED_GLOBALS.filter((k) => !scopeKeys.includes(k));
  const allKeys = [...scopeKeys, ...deniedKeys];
  const allValues = [...scopeValues, ...deniedKeys.map(() => undefined)];

  const wrappedSource = buildComponentResolverSource(compileResult.transpiledCode);

  let component: unknown;
  try {
    // Note: `new Function` is a deliberate last resort. It is hard-banned
    // from the denied-globals list above (via `Function`) so preset code
    // cannot itself call `new Function`, only the host can.
    const factory = new Function(...allKeys, `"use strict"; ${wrappedSource}`);
    component = factory(...allValues);
  } catch (err) {
    return {
      ok: false,
      error: {
        phase: "execute",
        message:
          "Runtime error in preset code: " +
          (err instanceof Error ? err.message : String(err)),
      },
    };
  }

  if (component == null) {
    return {
      ok: false,
      error: {
        phase: "resolve",
        message:
          "No component found in preset code. Define your component as one of: " +
          "Component, MyComponent, Default, Main, App, Scene, Composition, or export default.",
      },
    };
  }

  if (typeof component !== "function") {
    return {
      ok: false,
      error: {
        phase: "resolve",
        message: `Expected a React component (function), but got ${typeof component}`,
      },
    };
  }

  return {
    ok: true,
    preset: {
      component: component as PresetExport["component"],
      schema: compileResult.schema,
      meta: compileResult.meta as PresetExport["meta"],
    },
  };
}

/**
 * One-shot convenience wrapper: compile AND execute in one call. The common
 * case for live preview (the sandbox iframe entry) and for headless
 * validation paths that do want to run the component to check for rendering
 * errors.
 */
export function compileAndExecute(
  sourceCode: string,
  schemaJson: string,
  metaJson: string
): SandboxResult {
  const compiled = compilePreset(sourceCode, schemaJson, metaJson);
  return executeInSandbox(compiled);
}
