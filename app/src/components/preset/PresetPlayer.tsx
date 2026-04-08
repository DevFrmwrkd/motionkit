"use client";

import { Player } from "@remotion/player";
import type { FC } from "react";
import type { PresetMeta } from "@/lib/types";

interface PresetPlayerProps {
  component: FC<Record<string, unknown>>;
  inputProps: Record<string, unknown>;
  meta: PresetMeta;
  className?: string;
}

/**
 * Wraps @remotion/player with preset-specific config.
 * Receives the preset component, current props, and metadata.
 * Updates live as props change -- no rebuild needed.
 */
export function PresetPlayer({
  component,
  inputProps,
  meta,
  className,
}: PresetPlayerProps) {
  return (
    <div className={className}>
      <Player
        component={component}
        inputProps={inputProps}
        durationInFrames={meta.durationInFrames}
        fps={meta.fps}
        compositionWidth={meta.width}
        compositionHeight={meta.height}
        style={{ width: "100%" }}
        controls
        autoPlay
        loop
      />
    </div>
  );
}
