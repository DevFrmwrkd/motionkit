#!/usr/bin/env node
/**
 * Build the standalone preset sandbox bundle.
 *
 * Output: app/public/sandbox/bundle.js
 *
 * The sandbox bundle is a self-contained IIFE that:
 *   - mounts a React root inside a null-origin iframe
 *   - listens for postMessage from the parent window
 *   - compiles incoming preset source via codeToComponent
 *   - renders it in a Remotion Player
 *
 * It deliberately does NOT go through Next's bundling pipeline because
 * Next's handler graph transitively pulls `ws` → `node:https` into every
 * route, which crashes the Cloudflare Workers runtime. This bundle is
 * produced by esbuild directly so it can be served as a plain static asset.
 */

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(appRoot, "src/sandbox-runtime/entry.tsx")],
  outfile: path.join(appRoot, "public/sandbox/bundle.js"),
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  target: ["es2020"],
  platform: "browser",
  // React 19's new JSX runtime
  jsx: "automatic",
  loader: {
    ".json": "json",
  },
  define: {
    // Remotion checks process.env.NODE_ENV; esbuild can't find process in
    // the browser so we stub it.
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.REMOTION_EXPECTED_PACKAGE_VERSION": JSON.stringify(""),
  },
  // Tree-shake hints: the mapHelpers data files are large but we want them
  // bundled; d3-geo + topojson-client are small enough that it's fine.
  resolveExtensions: [".tsx", ".ts", ".mjs", ".js", ".json"],
  logLevel: "info",
});

console.log("✓ Sandbox bundle built → public/sandbox/bundle.js");
