"use client";

import type { PlayerRef } from "@remotion/player";
import { useMemo, useState } from "react";
import { PresetPlayer } from "@/components/preset/PresetPlayer";
import { SandboxedPresetPlayer } from "@/components/preset/SandboxedPresetPlayer";
import { RenderQueue } from "@/components/workstation/RenderQueue";
import type { FC, Ref } from "react";
import type { PresetMeta, RenderStatus } from "@/lib/types";
import { ChevronDown, ChevronUp, Film, Loader2 } from "lucide-react";

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

/**
 * PreviewPanel — pinned video hero + collapsible render queue.
 *
 * Layout rules:
 *  - The video is the hero and fills the available space while preserving
 *    aspect ratio. Neither too small nor cropped.
 *  - We compute the fitted size with a CSS `aspect-ratio` box constrained by
 *    both width and height — the box grows to the larger bound that still fits.
 *  - Render queue is a collapsible bottom sheet: hidden when idle, auto-opens
 *    when jobs are in flight, and the user can toggle it.
 *
 * Two render modes:
 *  - "trusted": shipped React component (preset-registry). Safe to render.
 *  - "sandboxed": user-authored source code. Runs in a null-origin iframe.
 */
interface PreviewPanelProps {
  trustedComponent: FC<Record<string, unknown>> | null;
  sourceCode: string | null;
  schemaJson: string | null;
  inputProps: Record<string, unknown>;
  meta: PresetMeta | null;
  renderJobs: RenderJobItem[];
  isLoadingJobs: boolean;
  playerRef?: Ref<PlayerRef | null>;
}

export function PreviewPanel({
  trustedComponent,
  sourceCode,
  schemaJson,
  inputProps,
  meta,
  renderJobs,
  isLoadingJobs,
  playerRef,
}: PreviewPanelProps) {
  const aspectRatio = meta ? meta.width / meta.height : 16 / 9;
  const metaJson = meta ? JSON.stringify(meta) : null;

  // Auto-open the queue when there's work in progress so the user can watch
  // progress without having to open a drawer. Otherwise default to collapsed.
  const activeJobs = useMemo(
    () =>
      renderJobs.filter(
        (job) => job.status === "queued" || job.status === "rendering"
      ),
    [renderJobs]
  );
  const hasActiveJobs = activeJobs.length > 0;
  const [queueOpen, setQueueOpen] = useState(false);
  const isQueueOpen = queueOpen || hasActiveJobs;

  const formatLabel = useMemo(() => {
    if (!meta) return null;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(meta.width, meta.height);
    const ratio = `${meta.width / divisor}:${meta.height / divisor}`;
    return `${ratio} · ${meta.width}×${meta.height}`;
  }, [meta]);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background/40">
      {/* Pinned hero — the video. Fills available space, aspect-aware. */}
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center px-6 py-6">
        <PlayerStage
          aspectRatio={aspectRatio}
          isEmpty={!meta}
          trustedComponent={trustedComponent}
          sourceCode={sourceCode}
          schemaJson={schemaJson}
          metaJson={metaJson}
          meta={meta}
          inputProps={inputProps}
          playerRef={playerRef}
        />
      </div>

      {/* Render queue — collapsible dock. */}
      <div className="shrink-0 border-t border-border bg-background">
        <button
          type="button"
          onClick={() => setQueueOpen((open) => !open)}
          className="w-full px-4 h-9 flex items-center justify-between gap-2 hover:bg-accent/40 transition-colors"
          aria-expanded={isQueueOpen}
        >
          <div className="flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Renders
            </span>
            {hasActiveJobs && (
              <span className="flex items-center gap-1 text-[10px] text-amber-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {activeJobs.length} active
              </span>
            )}
            {!hasActiveJobs && renderJobs.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {renderJobs.length} total
              </span>
            )}
            {formatLabel && (
              <span className="ml-2 text-[10px] text-muted-foreground font-mono hidden sm:inline">
                {formatLabel}
              </span>
            )}
          </div>
          {isQueueOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        {isQueueOpen && (
          <div className="h-[148px] border-t border-border">
            <RenderQueue jobs={renderJobs} isLoading={isLoadingJobs} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PlayerStage — responsible for sizing the video box.
 *
 * Strategy: wrap the player in a container whose `aspect-ratio` matches the
 * preset. Constrain both `max-width` and `max-height` so the box grows to the
 * larger of the two bounds that still fits within the available space. This
 * is the classic "letterbox vs pillarbox" fit:
 *   - A 9:16 portrait preset in a 1200×700 stage becomes ~394×700 (height-bound).
 *   - A 16:9 preset in the same stage becomes ~1200×675 (width-bound).
 *
 * No JS measurement needed — CSS `min(100%, 100%*aspect)` does the math.
 */
function PlayerStage({
  aspectRatio,
  isEmpty,
  trustedComponent,
  sourceCode,
  schemaJson,
  metaJson,
  meta,
  inputProps,
  playerRef,
}: {
  aspectRatio: number;
  isEmpty: boolean;
  trustedComponent: FC<Record<string, unknown>> | null;
  sourceCode: string | null;
  schemaJson: string | null;
  metaJson: string | null;
  meta: PresetMeta | null;
  inputProps: Record<string, unknown>;
  playerRef?: Ref<PlayerRef | null>;
}) {
  if (isEmpty || !meta) {
    return (
      <EmptyStage aspectRatio={aspectRatio} />
    );
  }

  // The fitted-box trick:
  //   width:  min(100%, 100vh * aspect)
  //   height: min(100%, 100% / aspect)  ← handled by aspect-ratio
  // We use inline style so `aspectRatio` can be dynamic per preset.
  const stageStyle: React.CSSProperties = {
    aspectRatio: String(aspectRatio),
    maxHeight: "100%",
    maxWidth: "100%",
    // Letting the box grow as tall as possible then width-cap via aspect ratio
    // gives us the "fit largest rectangle" behavior in pure CSS.
    height: "100%",
    width: "auto",
  };

  return (
    <div
      style={stageStyle}
      className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/60 bg-black"
    >
      {trustedComponent ? (
        <PresetPlayer
          component={trustedComponent}
          inputProps={inputProps}
          meta={meta}
          className="w-full h-full"
          playerRef={playerRef}
        />
      ) : sourceCode && schemaJson && metaJson ? (
        <SandboxedPresetPlayer
          code={sourceCode}
          schemaJson={schemaJson}
          metaJson={metaJson}
          inputProps={inputProps}
          aspectRatio={aspectRatio}
          playerRef={playerRef}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Preview unavailable
        </div>
      )}
      <DimensionBadge meta={meta} />
    </div>
  );
}

function DimensionBadge({ meta }: { meta: PresetMeta }) {
  return (
    <div
      className="absolute bottom-3 left-3 pointer-events-none"
      title="Composition dimensions and frame rate"
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/80 border border-white/10">
        {meta.width}×{meta.height} · {meta.fps}fps
      </span>
    </div>
  );
}

function EmptyStage({ aspectRatio }: { aspectRatio: number }) {
  return (
    <div
      style={{
        aspectRatio: String(aspectRatio),
        maxHeight: "100%",
        maxWidth: "100%",
        height: "100%",
        width: "auto",
      }}
      className="rounded-xl border-2 border-dashed border-border/60 bg-card/30 flex flex-col items-center justify-center text-center p-8"
    >
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
        <Film className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        No preset selected
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Pick a preset from the library to start customizing and previewing.
      </p>
    </div>
  );
}

export type { PreviewPanelProps };
