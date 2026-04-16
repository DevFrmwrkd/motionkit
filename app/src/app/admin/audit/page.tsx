"use client";

/**
 * Audit log viewer. Read-only list of recent moderation actions with a
 * filter for actor, target, and action type.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AuditLogPage() {
  const [limit] = useState(100);
  const entries = useQuery(api.admin.auditLog, { limit });

  if (entries === undefined) {
    return <div className="text-sm text-zinc-500">Loading audit log…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Audit log</h1>
        <p className="text-sm text-zinc-400">
          Most recent {limit} moderation actions. Append-only; nothing here
          is ever mutated.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{entries.length} entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.map((e) => (
              <div
                key={e._id}
                className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {e.action}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs text-zinc-400">
                  {e.targetType}: <span className="text-zinc-300">{e.targetId}</span>
                </div>
                {e.actorId ? (
                  <div className="mt-0.5 font-mono text-xs text-zinc-500">
                    actor: {e.actorId}
                  </div>
                ) : (
                  <div className="mt-0.5 font-mono text-xs text-zinc-500">
                    actor: system
                  </div>
                )}
                {e.reason ? (
                  <div className="mt-1 text-xs text-zinc-300">
                    <span className="text-zinc-500">reason: </span>
                    {e.reason}
                  </div>
                ) : null}
                {e.payload ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                      payload
                    </summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-zinc-900 p-2 text-[11px] text-zinc-400">
                      {e.payload}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
            {entries.length === 0 ? (
              <div className="text-xs text-zinc-500">No audit entries yet.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
