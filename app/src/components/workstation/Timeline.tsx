"use client";

import { useCallback, useMemo, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineProps {
  presetName: string | null;
  fps: number;
  durationInFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  isInteractive: boolean;
  onPlayPause: () => void;
  onSeek: (frame: number) => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const frames = Math.floor(frame % fps);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

/**
 * Timeline — compact transport + scrubber, shown under the preview.
 *
 * Prior versions of this component shipped a 176px-tall chrome with stubbed
 * marker lanes and a "WS-4 stub" placeholder visible to users. It's now a
 * ~88px single-row transport: a play/pause group on the left, a clickable
 * scrubber in the middle, and a timecode readout on the right.
 */
export function Timeline({
  presetName,
  fps,
  durationInFrames,
  currentFrame,
  isPlaying,
  isInteractive,
  onPlayPause,
  onSeek,
  onJumpToStart,
  onJumpToEnd,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const safeDuration = Math.max(durationInFrames - 1, 1);
  const playheadPercent =
    durationInFrames > 0 ? (currentFrame / safeDuration) * 100 : 0;

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || !isInteractive) return;
      const rect = trackRef.current.getBoundingClientRect();
      const fraction = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );
      const frame = Math.round(fraction * safeDuration);
      onSeek(frame);
    },
    [isInteractive, onSeek, safeDuration]
  );

  // Ruler marks: evenly-spaced tick positions (not labels — the timecode
  // readout is on the right, so we just need visual reference points).
  const ruleTicks = useMemo(() => {
    const ticks: number[] = [];
    // 9 ticks = 8 segments, roughly one per second for a 5s clip.
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      ticks.push((i / (count - 1)) * 100);
    }
    return ticks;
  }, []);

  const isEmpty = !presetName;

  return (
    <div className="h-[88px] border-t border-border bg-background flex items-center gap-4 px-4 shrink-0 z-10">
      {/* Transport */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onJumpToStart}
          disabled={isEmpty || !isInteractive}
          aria-label="Jump to start"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-foreground hover:bg-accent"
          onClick={onPlayPause}
          disabled={isEmpty || !isInteractive}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onJumpToEnd}
          disabled={isEmpty || !isInteractive}
          aria-label="Jump to end"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrubber */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        {isEmpty ? (
          <div className="text-xs text-muted-foreground">
            Select a preset to view its timeline
          </div>
        ) : (
          <>
            <div
              ref={trackRef}
              className={`relative h-8 rounded-md bg-card/70 border border-border/70 overflow-hidden ${
                isInteractive ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={handleTrackClick}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={safeDuration}
              aria-valuenow={currentFrame}
              aria-label="Timeline scrubber"
              tabIndex={isInteractive ? 0 : -1}
            >
              {/* Tick marks */}
              {ruleTicks.map((position, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-px bg-border/70 pointer-events-none"
                  style={{ left: `${position}%` }}
                />
              ))}
              {/* Played portion */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-amber-500/15 pointer-events-none"
                style={{ width: `${playheadPercent}%` }}
              />
              {/* Preset pill */}
              <div className="absolute inset-0 flex items-center pl-3 pr-16">
                <span className="text-[11px] font-medium text-foreground/90 truncate">
                  {presetName}
                </span>
              </div>
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 pointer-events-none"
                style={{ left: `${playheadPercent}%` }}
              >
                <div className="absolute -top-0.5 -translate-x-1/2 w-2.5 h-2.5 bg-amber-500 rounded-sm" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Timecode readout */}
      <div className="shrink-0 flex items-center gap-2">
        {!isInteractive && !isEmpty && (
          <span className="hidden lg:inline text-[10px] text-muted-foreground uppercase tracking-wide">
            preview-only sync
          </span>
        )}
        <div className="flex items-baseline gap-1 px-2.5 py-1 rounded-md bg-card border border-border font-mono text-xs">
          <span className="text-foreground">
            {formatTimecode(Math.floor(currentFrame), fps)}
          </span>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-muted-foreground">
            {formatTimecode(durationInFrames, fps)}
          </span>
        </div>
        <span className="hidden md:inline text-[10px] text-muted-foreground font-mono">
          {fps}fps
        </span>
      </div>
    </div>
  );
}
