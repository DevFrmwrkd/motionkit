"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getExportFormatById } from "@/lib/export-formats";
import { Download, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { RenderStatus } from "@/lib/types";

interface RenderJobItem {
  _id: string;
  status: RenderStatus;
  progress?: number;
  error?: string;
  outputUrl?: string;
  bundleUrl: string;
  inputProps: string;
  startedAt?: number;
  completedAt?: number;
}

interface RenderQueueProps {
  jobs: RenderJobItem[];
  isLoading: boolean;
}

const statusConfig: Record<
  RenderStatus,
  { icon: typeof Clock; label: string; color: string }
> = {
  queued: { icon: Clock, label: "Queued", color: "text-muted-foreground" },
  rendering: { icon: Loader2, label: "Rendering", color: "text-amber-500" },
  done: { icon: CheckCircle2, label: "Done", color: "text-green-500" },
  failed: { icon: XCircle, label: "Failed", color: "text-red-500" },
};

/**
 * Displays render job queue with real-time status updates.
 * Powered by Convex reactive queries.
 */
export function RenderQueue({ jobs, isLoading }: RenderQueueProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground text-sm">
        No renders yet. Customize a preset and hit Render.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {jobs.map((job) => {
          const config = statusConfig[job.status];
          const Icon = config.icon;
          const renderFormat = (() => {
            try {
              const parsed = JSON.parse(job.inputProps) as {
                __exportFormat?: string;
              };
              return parsed.__exportFormat
                ? getExportFormatById(parsed.__exportFormat)
                : null;
            } catch {
              return null;
            }
          })();
          return (
            <div
              key={job._id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${config.color} ${
                  job.status === "rendering" ? "animate-spin" : ""
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground truncate">
                    Render #{job._id.slice(-6)}
                  </span>
                  {renderFormat && (
                    <Badge variant="secondary" className="text-[10px]">
                      {renderFormat.id}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${config.color}`}
                  >
                    {config.label}
                  </Badge>
                </div>
                {job.status === "rendering" && job.progress !== undefined && (
                  <Progress value={job.progress} className="h-1 mt-2" />
                )}
                {job.status === "failed" && job.error && (
                  <p className="text-xs text-red-400 mt-1 truncate">
                    {job.error}
                  </p>
                )}
              </div>
              {job.status === "done" && job.outputUrl && (
                <a
                  href={job.outputUrl}
                  download
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
