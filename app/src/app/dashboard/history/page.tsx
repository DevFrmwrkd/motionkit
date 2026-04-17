"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
import { Loader2, Download, Clock, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketplacePreview } from "@/components/marketplace/MarketplacePreview";
import { CategoryOverlay } from "@/components/shared/CategoryOverlay";

export default function HistoryPage() {
  const { user } = useCurrentUser();
  const userId = user?._id as Id<"users"> | undefined;

  const jobs = useQuery(api.renderJobs.listByUser, userId ? { userId } : "skip");
  const presets = useQuery(api.presets.list, userId ? { viewerId: userId } : "skip");
  const presetsById = useMemo(
    () => new Map((presets ?? []).map((preset) => [preset._id, preset])),
    [presets]
  );

  const statusStyles: Record<string, string> = {
    queued: "text-yellow-400 border-yellow-500/30",
    rendering: "text-blue-400 border-blue-500/30",
    done: "text-green-400 border-green-500/30",
    failed: "text-red-400 border-red-500/30",
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold">Render History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every render you&apos;ve queued, with status and downloads.
        </p>
      </div>

      {jobs === undefined ? (
        <div className="py-20 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No renders yet"
          description="Your render history will appear here once you queue a job from the workstation."
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-[140px]">
                  Preview
                </TableHead>
                <TableHead className="text-muted-foreground">Preset</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Engine</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const preset = presetsById.get(job.presetId);
                const presetName = preset?.name ?? job.bundleUrl;
                const canPlay =
                  job.status === "done" &&
                  Boolean(preset?.sourceCode && preset?.inputSchema);

                return (
                  <TableRow key={job._id} className="border-border">
                    <TableCell className="py-3">
                      <RenderHistoryPreview
                        canPlay={canPlay}
                        failed={job.status === "failed"}
                        preset={preset}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground max-w-[240px] truncate">
                      {presetName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusStyles[job.status] ?? ""}
                      >
                        {job.status === "rendering" && job.progress !== undefined
                          ? `${job.progress}%`
                          : job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {job.renderEngine}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleDateString()
                        : "—"}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Per-row preview. Live-plays the sandboxed preset for `done` renders
 * (visibility-gated via MarketplacePreview's IntersectionObserver),
 * falls back to the category overlay for failed / queued / rendering
 * rows, and tints the failed ones with a red wash + warning glyph so
 * the row reads at a glance.
 */
function RenderHistoryPreview({
  canPlay,
  failed,
  preset,
}: {
  canPlay: boolean;
  failed: boolean;
  preset:
    | {
        category: string;
        name: string;
        description?: string;
        sourceCode?: string;
        inputSchema?: string;
        fps?: number;
        width?: number;
        height?: number;
        durationInFrames?: number;
      }
    | undefined;
}) {
  const category = preset?.category ?? "full";

  return (
    <div className="relative w-[120px] h-[68px] rounded-md overflow-hidden border border-border bg-zinc-950 shrink-0">
      {canPlay && preset ? (
        <MarketplacePreview
          sourceCode={preset.sourceCode}
          inputSchema={preset.inputSchema}
          name={preset.name}
          description={preset.description}
          category={category}
          fps={preset.fps ?? 30}
          width={preset.width ?? 1920}
          height={preset.height ?? 1080}
          durationInFrames={preset.durationInFrames ?? 90}
          overlay={<CategoryOverlay category={category} compact />}
        />
      ) : (
        <>
          <CategoryOverlay category={category} compact />
          {failed && (
            <>
              <div className="absolute inset-0 bg-red-950/60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-300/90" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
