"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download } from "lucide-react";

export default function HistoryPage() {
  const { user } = useCurrentUser();
  const userId = user?._id as Id<"users"> | undefined;

  const jobs = useQuery(api.renderJobs.listByUser, userId ? { userId } : "skip");
  const presets = useQuery(api.presets.list, userId ? { viewerId: userId } : "skip");
  const presetNameById = useMemo(
    () => new Map((presets ?? []).map((preset) => [preset._id, preset.name])),
    [presets]
  );

  const statusStyles: Record<string, string> = {
    queued: "text-yellow-400 border-yellow-500/30",
    rendering: "text-blue-400 border-blue-500/30",
    done: "text-green-400 border-green-500/30",
    failed: "text-red-400 border-red-500/30",
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold mb-6">Render History</h1>

      {jobs === undefined ? (
        <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">No render jobs yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Preset</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Engine</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job._id} className="border-border">
                  <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                    {presetNameById.get(job.presetId) ?? job.bundleUrl}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[job.status] ?? ""}>
                      {job.status === "rendering" && job.progress !== undefined
                        ? `${job.progress}%`
                        : job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{job.renderEngine}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {job.startedAt ? new Date(job.startedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {job.status === "done" && job.outputUrl && (
                      <a
                        href={job.outputUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
