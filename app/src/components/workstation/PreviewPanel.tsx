"use client";

import { PresetPlayer } from "@/components/preset/PresetPlayer";
import { RenderQueue } from "@/components/workstation/RenderQueue";
import { Separator } from "@/components/ui/separator";
import type { FC } from "react";
import type { PresetMeta, RenderStatus } from "@/lib/types";

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

interface PreviewPanelProps {
  component: FC<Record<string, unknown>> | null;
  inputProps: Record<string, unknown>;
  meta: PresetMeta | null;
  renderJobs: RenderJobItem[];
  isLoadingJobs: boolean;
}

/**
 * Center panel: Remotion Player preview + render queue.
 */
export function PreviewPanel({
  component,
  inputProps,
  meta,
  renderJobs,
  isLoadingJobs,
}: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Player */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {component && meta ? (
          <PresetPlayer
            component={component}
            inputProps={inputProps}
            meta={meta}
            className="w-full max-w-[960px]"
          />
        ) : (
          <div className="text-zinc-500 text-sm">
            Select a preset to preview
          </div>
        )}
      </div>

      <Separator />

      {/* Render Queue */}
      <div className="h-[200px] shrink-0">
        <div className="px-4 py-2 border-b border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Render Queue
          </h3>
        </div>
        <RenderQueue jobs={renderJobs} isLoading={isLoadingJobs} />
      </div>
    </div>
  );
}
