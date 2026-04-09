import { transform } from "sucrase";
import React from "react";
import * as Remotion from "remotion";
import type { PresetExport, PresetSchema, PresetMeta } from "./types";

interface CodeToComponentResult {
  preset: PresetExport | null;
  error: string | null;
}

/**
 * Transpiles AI-generated TSX code into a live React component at runtime.
 *
 * The function:
 * 1. Parses the schema and meta JSON strings
 * 2. Transpiles TypeScript/JSX to plain JS via sucrase
 * 3. Executes the code in a sandboxed function scope with React + Remotion injected
 * 4. Returns the resulting component wrapped in a PresetExport
 *
 * The generated code can export its component in several ways:
 * - A variable named `Component`, `MyComponent`, or `Default`
 * - A default export (transformed to `exports.default`)
 * - A named export called `component` or `Component`
 */
export function codeToComponent(
  componentCode: string,
  schemaJson: string,
  metaJson: string
): CodeToComponentResult {
  try {
    // --- Parse schema and meta ---
    let schema: PresetSchema;
    let meta: PresetMeta;

    try {
      schema = JSON.parse(schemaJson);
    } catch {
      return { preset: null, error: "Invalid schema JSON: " + schemaJson.slice(0, 100) };
    }

    try {
      meta = JSON.parse(metaJson);
    } catch {
      return { preset: null, error: "Invalid meta JSON: " + metaJson.slice(0, 100) };
    }

    // --- Validate required meta fields ---
    if (!meta.name || !meta.fps || !meta.width || !meta.height || !meta.durationInFrames) {
      return {
        preset: null,
        error: "Meta must include name, fps, width, height, and durationInFrames",
      };
    }

    // --- Pre-process the code to handle common AI patterns ---
    let processedCode = componentCode;

    // Strip `import` statements — all dependencies are injected via scope.
    // This handles multi-line imports too.
    processedCode = processedCode.replace(
      /^import\s+(?:[\s\S]*?)from\s+['"][^'"]+['"];?\s*$/gm,
      ""
    );
    // Also strip bare `import "..."` side-effect imports
    processedCode = processedCode.replace(
      /^import\s+['"][^'"]+['"];?\s*$/gm,
      ""
    );

    // Strip `export default` and `export` keywords so the code defines plain variables
    processedCode = processedCode.replace(/export\s+default\s+/g, "const __DefaultExport__ = ");
    processedCode = processedCode.replace(/export\s+/g, "");

    // --- Transpile TSX to JS ---
    let transpiledCode: string;
    try {
      const result = transform(processedCode, {
        transforms: ["typescript", "jsx"],
        jsxRuntime: "classic",
        jsxPragma: "React.createElement",
        jsxFragmentPragma: "React.Fragment",
      });
      transpiledCode = result.code;
    } catch (transpileErr) {
      return {
        preset: null,
        error:
          "TSX transpile error: " +
          (transpileErr instanceof Error ? transpileErr.message : String(transpileErr)),
      };
    }

    // --- Build sandboxed execution scope ---
    const moduleScope: Record<string, unknown> = {
      React,
      // Spread all Remotion exports so generated code can use useCurrentFrame, etc.
      ...Remotion,
      // Explicitly surface common React hooks in case generated code uses them bare
      useState: React.useState,
      useEffect: React.useEffect,
      useMemo: React.useMemo,
      useCallback: React.useCallback,
      useRef: React.useRef,
      // Provide a console stub so console.log in generated code doesn't crash
      console: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    };

    const keys = Object.keys(moduleScope);
    const values = Object.values(moduleScope);

    // Wrap the transpiled code so it returns whichever component it defined.
    // We try several common naming patterns that AI models use.
    const wrappedCode = `
      ${transpiledCode}

      // Resolve the component from common naming patterns
      if (typeof __DefaultExport__ !== 'undefined') return __DefaultExport__;
      if (typeof Component !== 'undefined') return Component;
      if (typeof MyComponent !== 'undefined') return MyComponent;
      if (typeof Default !== 'undefined') return Default;
      if (typeof Main !== 'undefined') return Main;
      if (typeof App !== 'undefined') return App;
      if (typeof Scene !== 'undefined') return Scene;
      if (typeof Composition !== 'undefined') return Composition;
      return null;
    `;

    // --- Execute ---
    let component: React.FC<Record<string, unknown>> | null = null;
    try {
      const factory = new Function(...keys, wrappedCode);
      component = factory(...values) as React.FC<Record<string, unknown>> | null;
    } catch (runtimeErr) {
      return {
        preset: null,
        error:
          "Runtime error in generated code: " +
          (runtimeErr instanceof Error ? runtimeErr.message : String(runtimeErr)),
      };
    }

    if (!component) {
      return {
        preset: null,
        error:
          "No component found in generated code. The code must define a component as Component, MyComponent, Default, Main, App, Scene, or Composition.",
      };
    }

    if (typeof component !== "function") {
      return {
        preset: null,
        error: `Expected a React component (function), but got ${typeof component}`,
      };
    }

    return {
      preset: { component, schema, meta },
      error: null,
    };
  } catch (err) {
    return {
      preset: null,
      error:
        "Unexpected error: " +
        (err instanceof Error ? err.message : "Failed to compile component"),
    };
  }
}
