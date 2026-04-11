"use client";

/**
 * Broken-render triage page. Lists presets whose most recent render job
 * failed in the last 7 days, grouped by preset with failure count and the
 * most recent error message.
 */

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BrokenRendersPage() {
  const broken = useQuery(api.admin.brokenRenders, {});

  if (broken === undefined) {
    return <div className="text-sm text-zinc-500">Loading broken renders…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Broken renders</h1>
        <p className="text-sm text-zinc-400">
          Presets with a failed render in the last 7 days, grouped by preset.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {broken.length} preset{broken.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {broken.length === 0 ? (
            <div className="text-xs text-zinc-500">
              Nothing broken in the last 7 days. 🎉
            </div>
          ) : (
            broken.map((row) => (
              <div
                key={row.presetId}
                className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/p/${row.presetId}`}
                    className="font-medium text-zinc-100 hover:text-amber-200"
                  >
                    {row.presetName}
                  </Link>
                  <Badge
                    variant="outline"
                    className="border-amber-700 text-amber-200"
                  >
                    {row.failureCount} fail
                    {row.failureCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                {row.lastError ? (
                  <pre className="mt-2 overflow-x-auto text-xs text-amber-100/80">
                    {row.lastError}
                  </pre>
                ) : null}
                {row.lastFailedAt ? (
                  <div className="mt-1 text-[11px] text-zinc-500">
                    Last failure: {new Date(row.lastFailedAt).toLocaleString()}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
