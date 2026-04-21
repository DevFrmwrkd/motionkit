#!/usr/bin/env node
// Download source files from Vercel deployments.
// Default: pulls every deployment created on 2026-04-18 UTC.
//
// Usage:
//   VERCEL_TOKEN=xxx node scripts/pull-vercel-source.mjs
//   VERCEL_TOKEN=xxx node scripts/pull-vercel-source.mjs --date=2026-04-18
//   VERCEL_TOKEN=xxx node scripts/pull-vercel-source.mjs --deployment=2mKRKZJBb
//   VERCEL_TOKEN=xxx node scripts/pull-vercel-source.mjs --deployment=2mKRKZJBb --apply
//
// Output (default):            tmp/vercel-source/<deploymentId>/<files...>
// Output (with --apply):       overwrites working tree (skips build artifacts)
//                              → review everything in VS Code Source Control

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

const TEAM_ID = "team_Mrvvlzi3pBS3vGNviNN4MjEh";
const PROJECT_ID = "prj_yEjIMvJfDuKWWxwivu7o5ubTcD9B";
const OUT_DIR = "tmp/vercel-source";

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error("Missing VERCEL_TOKEN. Generate at vercel.com/account/tokens.");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const TARGET_DATE = args.date ?? "2026-04-18";
const SPECIFIC = args.deployment;
const APPLY = Boolean(args.apply);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".open-next",
  ".vercel",
  ".turbo",
  ".git",
  "tmp",
  "temp",
  "out",
  "dist",
]);

const BASE = "https://api.vercel.com";
const AUTH = { Authorization: `Bearer ${token}` };

function withTeam(path) {
  const u = new URL(path, BASE);
  u.searchParams.set("teamId", TEAM_ID);
  return u.toString();
}

async function apiJson(path) {
  const res = await fetch(withTeam(path), { headers: AUTH });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function listDeployments() {
  const start = Date.parse(`${TARGET_DATE}T00:00:00Z`);
  const end = start + 24 * 60 * 60 * 1000;
  const { deployments } = await apiJson(
    `/v6/deployments?projectId=${PROJECT_ID}&from=${start}&until=${end}&limit=100`,
  );
  return deployments ?? [];
}

async function resolveDeployment(idOrUrlOrShort) {
  // 1. Try direct — works for dpl_... ids and full URLs like foo.vercel.app
  try {
    return await apiJson(`/v13/deployments/${idOrUrlOrShort}`);
  } catch (e) {
    if (!String(e.message).includes("404")) throw e;
  }
  // 2. Fallback — look up by the short display name (e.g. "2mKRKZJBb").
  //    Vercel's deployment URL is like "motionkit-<short>-<team>.vercel.app",
  //    so we match any deployment whose URL contains the short name.
  const short = idOrUrlOrShort.toLowerCase();
  const { deployments } = await apiJson(
    `/v6/deployments?projectId=${PROJECT_ID}&limit=100`,
  );
  const hit = (deployments ?? []).find(
    (d) =>
      (d.url ?? "").toLowerCase().includes(short) ||
      (d.name ?? "").toLowerCase() === short ||
      (d.uid ?? "").toLowerCase() === short,
  );
  if (!hit) {
    throw new Error(
      `Deployment "${idOrUrlOrShort}" not found. Try the full URL (e.g. motionkit-xxxx.vercel.app) or the dpl_... id.`,
    );
  }
  return hit;
}

async function listFiles(deploymentId) {
  return apiJson(`/v6/deployments/${deploymentId}/files`);
}

async function downloadFile(deploymentId, fileId) {
  const res = await fetch(
    withTeam(`/v7/deployments/${deploymentId}/files/${fileId}`),
    { headers: AUTH },
  );
  if (!res.ok) throw new Error(`file ${fileId} → ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const json = await res.json();
    if (typeof json.data === "string") return Buffer.from(json.data, "base64");
    return Buffer.from(JSON.stringify(json, null, 2));
  }
  return Buffer.from(await res.arrayBuffer());
}

async function walkAndDownload(deploymentId, entries, destBase, relPath = "") {
  for (const entry of entries ?? []) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = join(relPath, entry.name);
    if (entry.type === "directory") {
      await walkAndDownload(deploymentId, entry.children, destBase, rel);
    } else if (entry.type === "file") {
      const dest = join(destBase, rel);
      await mkdir(dirname(dest), { recursive: true });
      const content = await downloadFile(deploymentId, entry.uid);
      await writeFile(dest, content);
      process.stdout.write(`  ${rel}\n`);
    }
  }
}

async function main() {
  let deployments;
  if (SPECIFIC) {
    deployments = [await resolveDeployment(SPECIFIC)];
  } else {
    deployments = await listDeployments();
  }

  if (!deployments.length) {
    console.error(`No deployments found for ${TARGET_DATE}`);
    process.exit(1);
  }

  console.log(
    SPECIFIC
      ? `Deployment ${SPECIFIC}:`
      : `Found ${deployments.length} deployment(s) on ${TARGET_DATE}:`,
  );
  for (const d of deployments) {
    const when = new Date(d.createdAt ?? d.created ?? 0).toISOString();
    const sha = d.meta?.githubCommitSha ?? d.gitSource?.sha ?? "CLI upload";
    const url = d.url ?? "";
    console.log(`  ${d.uid ?? d.id}  ${when}  ${sha}  ${url}`);
  }
  console.log();

  if (APPLY && deployments.length > 1) {
    console.error(
      "--apply requires a single deployment. Re-run with --deployment=<id>.",
    );
    process.exit(1);
  }

  for (const d of deployments) {
    const id = d.uid ?? d.id;
    const destBase = APPLY ? process.cwd() : join(OUT_DIR, id);
    console.log(
      APPLY
        ? `→ ${id}  (overlaying onto working tree — skipping ${[...SKIP_DIRS].join(", ")})`
        : `→ ${id}  (saving to ${destBase}/)`,
    );
    let tree = await listFiles(id);
    // Vercel wraps uploaded source under a synthetic top-level "src" directory.
    // Unwrap so files land at the project root, not inside ./src/.
    if (
      Array.isArray(tree) &&
      tree.length === 1 &&
      tree[0].name === "src" &&
      tree[0].type === "directory"
    ) {
      tree = tree[0].children ?? [];
    }
    await walkAndDownload(id, tree, destBase);
  }

  if (APPLY) {
    console.log(
      `\nDone. Review every change in VS Code Source Control:\n` +
        `  git status\n` +
        `  code -r .        # open diffs per file, stage/unstage hunks\n` +
        `\nCommit when ready:\n` +
        `  git add -p       # hunk-by-hunk staging\n` +
        `  git commit -m "recover: Apr 18 Vercel deploy"\n` +
        `\nTo back out entirely:\n` +
        `  git checkout -- . && git clean -fd`,
    );
  } else {
    console.log(`\nDone. Compare with current main:`);
    for (const d of deployments) {
      const id = d.uid ?? d.id;
      console.log(`  diff -rN --brief ${OUT_DIR}/${id} . | head -40`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
