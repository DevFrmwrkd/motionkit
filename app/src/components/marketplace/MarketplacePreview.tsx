"use client";

/**
 * MarketplacePreview — auto-plays the sandboxed preset preview whenever the
 * card is visible, and keeps looping so the user sees what the preset
 * actually looks like. The geometric overlay only shows while the preview
 * is off-screen, not yet mounted, or errored.
 *
 * Performance notes:
 *   - IntersectionObserver gates mounting so off-screen cards never spin up an
 *     iframe.
 *   - A module-level semaphore caps concurrent plays so a 20-card grid can't
 *     DoS the tab by launching 20 iframes at once.
 *   - When a card leaves the viewport the iframe is torn down — it will
 *     remount and start playing again on re-entry.
 */

import { useEffect, useRef, useState } from "react";
import { SandboxedPresetPlayer } from "@/components/preset/SandboxedPresetPlayer";

const MAX_CONCURRENT_PLAYS = 4;
let activePlayCount = 0;
const pendingWaiters: Array<() => void> = [];

function acquirePlaySlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const release = () => {
      activePlayCount = Math.max(0, activePlayCount - 1);
      const next = pendingWaiters.shift();
      if (next) next();
    };
    const take = () => {
      activePlayCount += 1;
      resolve(release);
    };
    if (activePlayCount < MAX_CONCURRENT_PLAYS) {
      take();
    } else {
      pendingWaiters.push(take);
    }
  });
}

type Phase = "idle" | "playing" | "error";

interface MarketplacePreviewProps {
  sourceCode?: string;
  inputSchema?: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  description?: string;
  category: string;
  /** The gradient + geometric fallback shown when the preview isn't playing. */
  overlay: React.ReactNode;
}

export function MarketplacePreview({
  sourceCode,
  inputSchema,
  name,
  fps,
  width,
  height,
  durationInFrames,
  description,
  category,
  overlay,
}: MarketplacePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isVisible, setIsVisible] = useState(false);
  const releaseSlotRef = useRef<(() => void) | null>(null);

  const canPlay = Boolean(sourceCode && inputSchema);

  // Observe visibility — 40% threshold is enough to call the card
  // "meaningfully visible" without thrashing on scroll edges.
  useEffect(() => {
    const node = hostRef.current;
    if (!node || !canPlay) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.4);
        }
      },
      { threshold: [0, 0.4, 0.8] }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [canPlay]);

  // Slot acquisition tied to visibility. Out-of-viewport cards release
  // their iframe and their play slot; scrolling back in re-acquires.
  useEffect(() => {
    if (!canPlay) return;
    if (phase === "error") return;

    if (!isVisible) {
      if (phase === "playing") {
        setPhase("idle");
      }
      return;
    }

    if (phase === "playing") return;

    let cancelled = false;
    void acquirePlaySlot().then((release) => {
      if (cancelled) {
        release();
        return;
      }
      releaseSlotRef.current = release;
      setPhase("playing");
    });

    return () => {
      cancelled = true;
    };
  }, [canPlay, isVisible, phase]);

  // Release the concurrency slot whenever we leave "playing".
  useEffect(() => {
    if (phase !== "playing" && releaseSlotRef.current) {
      releaseSlotRef.current();
      releaseSlotRef.current = null;
    }
  }, [phase]);

  // Always release on unmount.
  useEffect(() => {
    return () => {
      if (releaseSlotRef.current) {
        releaseSlotRef.current();
        releaseSlotRef.current = null;
      }
    };
  }, []);

  // Build the meta JSON the sandbox expects.
  const metaJson = JSON.stringify({
    name,
    description: description ?? "",
    category,
    fps,
    width,
    height,
    durationInFrames,
  });

  const aspectRatio = width / Math.max(1, height);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0"
      style={{ isolation: "isolate" }}
    >
      {/* Fallback overlay — shows whenever the live preview isn't mounted
          (off-screen, not-yet-acquired, or errored). Fades out once the
          player takes over. */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          phase === "playing" ? "opacity-0" : "opacity-100"
        }`}
      >
        {overlay}
      </div>

      {/* Sandboxed preview — loops while visible. Unmounts when scrolled
          out of view so we never keep more than a handful of live iframes. */}
      {phase === "playing" && sourceCode && inputSchema && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ aspectRatio: String(aspectRatio) }}
        >
          <SandboxedPresetPlayer
            code={sourceCode}
            schemaJson={inputSchema}
            metaJson={metaJson}
            inputProps={{}}
            aspectRatio={aspectRatio}
            controls={false}
            loop
            autoPlay
            onErrorChange={(err) => {
              if (err) setPhase("error");
            }}
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}
