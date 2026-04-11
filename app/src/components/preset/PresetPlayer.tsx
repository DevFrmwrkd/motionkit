"use client";

import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import type { FC, Ref } from "react";
import type { PresetMeta } from "@/lib/types";

interface PresetPlayerProps {
  component: FC<Record<string, unknown>>;
  inputProps: Record<string, unknown>;
  meta: PresetMeta;
  className?: string;
  playerRef?: Ref<PlayerRef | null>;
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
  playerRef,
}: PresetPlayerProps) {
  // width:100% + height:100% ensures the player fills whatever aspect-locked
  // box the parent provides. PreviewPanel's PlayerStage is responsible for
  // giving us a correctly shaped container.
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Player
        ref={playerRef}
        component={component}
        inputProps={inputProps}
        durationInFrames={meta.durationInFrames}
        fps={meta.fps}
        compositionWidth={meta.width}
        compositionHeight={meta.height}
        style={{ width: "100%", height: "100%" }}
        controls
        autoPlay
        loop
        acknowledgeRemotionLicense
      />
    </div>
  );
}
