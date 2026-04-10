"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelinePanelProps {
  presetName: string | null;
  fps: number;
  durationInFrames: number;
  currentFrame?: number;
  onSeek?: (frame: number) => void;
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const frames = Math.floor(frame % fps);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

export function TimelinePanel({
  presetName,
  fps,
  durationInFrames,
  currentFrame: externalFrame,
  onSeek,
}: TimelinePanelProps) {
  const [internalFrame, setInternalFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const currentFrame = externalFrame ?? internalFrame;
  const totalDuration = durationInFrames / fps;

  // Simple internal playback simulation
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setInternalFrame((prev) => {
        const next = prev + delta * fps;
        if (next >= durationInFrames) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, fps, durationInFrames]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleSkipBack = useCallback(() => {
    setInternalFrame(0);
    setIsPlaying(false);
    onSeek?.(0);
  }, [onSeek]);

  const handleSkipForward = useCallback(() => {
    setInternalFrame(durationInFrames - 1);
    setIsPlaying(false);
    onSeek?.(durationInFrames - 1);
  }, [durationInFrames, onSeek]);

  // Click on ruler to seek
  const rulerRef = useRef<HTMLDivElement>(null);
  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const frame = Math.round(fraction * durationInFrames);
      setInternalFrame(frame);
      onSeek?.(frame);
    },
    [durationInFrames, onSeek]
  );

  const playheadPercent = durationInFrames > 0 ? (currentFrame / durationInFrames) * 100 : 0;

  // Generate ruler marks
  const rulerMarks: { position: number; label: string }[] = [];
  const markInterval = Math.max(1, Math.ceil(totalDuration / 8));
  for (let s = 0; s <= totalDuration; s += markInterval) {
    const position = (s / totalDuration) * 100;
    const f = Math.round(s * fps);
    rulerMarks.push({ position, label: formatTimecode(f, fps) });
  }

  const isEmpty = !presetName;

  return (
    <div className="h-44 border-t border-border bg-background flex flex-col shrink-0 z-20">
      {/* Transport bar */}
      <div className="h-10 border-b border-border bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={handleSkipBack}
              disabled={isEmpty}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={handlePlayPause}
              disabled={isEmpty}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={handleSkipForward}
              disabled={isEmpty}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded font-mono">
            {formatTimecode(Math.floor(currentFrame), fps)}
          </span>
          <span className="text-[10px] text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTimecode(durationInFrames, fps)}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">{fps}fps</span>
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative overflow-hidden bg-card/30">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Select a preset to view its timeline
          </div>
        ) : (
          <>
            {/* Ruler */}
            <div
              ref={rulerRef}
              className="h-5 border-b border-border/50 relative cursor-pointer ml-20"
              onClick={handleRulerClick}
            >
              {rulerMarks.map((mark, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: `${mark.position}%` }}
                >
                  <div className="w-px h-2 bg-zinc-700" />
                  <span className="text-[8px] text-muted-foreground mt-px font-mono">{mark.label}</span>
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-amber-500 z-10 pointer-events-none"
              style={{ left: `calc(80px + ${playheadPercent}% * (100% - 80px) / 100%)`, marginLeft: `calc(${playheadPercent} * (100% - 80px) / 100)` }}
            >
              <div className="absolute top-0 -translate-x-1/2 w-2.5 h-2.5 bg-amber-500 rounded-sm" />
            </div>

            {/* Track: Preset Composition */}
            <div className="flex items-center pt-2 px-4">
              <div className="w-20 shrink-0 text-[10px] text-muted-foreground flex items-center gap-1.5">
                <VideoIcon /> Video
              </div>
              <div
                className="flex-1 h-12 bg-card border border-border rounded relative cursor-pointer"
                onClick={handleRulerClick}
              >
                <div className="absolute inset-0 bg-amber-500/15 border border-amber-500/40 rounded flex items-center px-3">
                  <span className="text-xs font-medium text-amber-400 truncate">
                    {presetName}
                  </span>
                  <span className="ml-auto text-[10px] text-amber-500/60 font-mono">
                    {durationInFrames}f
                  </span>
                </div>
                {/* Playhead within clip */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-amber-500 z-10 pointer-events-none"
                  style={{ left: `${playheadPercent}%` }}
                />
              </div>
            </div>

            {/* Track: Audio placeholder */}
            <div className="flex items-center pt-2 px-4">
              <div className="w-20 shrink-0 text-[10px] text-muted-foreground flex items-center gap-1.5">
                <AudioIcon /> Audio
              </div>
              <div className="flex-1 h-8 bg-card/50 border border-border/50 rounded border-dashed flex items-center justify-center">
                <span className="text-[10px] text-zinc-700">Drop audio here</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VideoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
  );
}

function AudioIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>
  );
}
