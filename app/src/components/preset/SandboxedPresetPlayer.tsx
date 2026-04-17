"use client";

/**
 * SandboxedPresetPlayer — renders AI-generated / user-imported preset code
 * inside a null-origin iframe (sandbox="allow-scripts") so the code cannot
 * reach parent cookies, localStorage, DOM, or in-memory state.
 *
 * Usage is a drop-in replacement for the old "compile on the main thread
 * and hand the component to PresetPlayer" pipeline:
 *
 *   <SandboxedPresetPlayer
 *     code={aiGeneratedCode}
 *     schemaJson={schemaJson}
 *     metaJson={metaJson}
 *     inputProps={userTweaks}
 *   />
 *
 * Trusted presets that ship as part of the app bundle (e.g. presets/_template)
 * still use <PresetPlayer /> directly — no sandbox needed for code the app
 * itself owns.
 */

import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import type { PlayerRef } from "@remotion/player";
import { AlertCircle, RotateCcw, MessageCircle } from "lucide-react";

interface SandboxedPresetPlayerProps {
  code: string;
  schemaJson: string;
  metaJson: string;
  inputProps: Record<string, unknown>;
  className?: string;
  /** Aspect ratio of the iframe. Defaults to 16:9. */
  aspectRatio?: number;
  /** Called whenever the sandbox reports or clears a compile/runtime error. */
  onErrorChange?: (error: string | null) => void;
  /** Show Remotion's play/scrub controls bar. Defaults to true. */
  controls?: boolean;
  /** Loop playback when it reaches the end. Defaults to true. */
  loop?: boolean;
  /** Start playing on mount. Defaults to true. */
  autoPlay?: boolean;
  /** Fires when the inner Player emits an "ended" event (non-looping playback only). */
  onEnded?: () => void;
  /**
   * Parent-facing handle that behaves like a Remotion `PlayerRef`. The sandbox
   * Player lives inside a null-origin iframe we can't reach directly, so we
   * shim the subset of the API the workstation timeline uses (getCurrentFrame,
   * isPlaying, play/pause/seekTo, add/removeEventListener) on top of a
   * postMessage transport. Enough for timeline scrubbing and play-state sync;
   * not a full PlayerRef (no volume, no fullscreen, no in-out points).
   */
  playerRef?: Ref<PlayerRef | null>;
}

type GuestMessage =
  | { type: "ready" }
  | { type: "error"; error: string }
  | { type: "frameupdate"; frame: number }
  | { type: "seeked"; frame: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "ended" };

export function SandboxedPresetPlayer({
  code,
  schemaJson,
  metaJson,
  inputProps,
  className,
  aspectRatio = 16 / 9,
  onErrorChange,
  controls = true,
  loop = true,
  autoPlay = true,
  onEnded,
  playerRef,
}: SandboxedPresetPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-mount cache-bust for the static sandbox HTML. Without this, Next
  // serves preset.html + bundle.js with default caching and browsers hold
  // on to the old runtime across rebuilds.
  const sandboxSrc = useMemo(
    () => `/sandbox/preset.html?v=${Date.now()}`,
    []
  );

  // Local shadow of the iframe player's state. Kept in refs (not state) so
  // getCurrentFrame/isPlaying return synchronously without causing renders.
  const currentFrameRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Event listeners registered via the adapter's addEventListener. We only
  // need the set the workstation timeline subscribes to.
  type ListenerMap = {
    frameupdate: Set<(e: { detail: { frame: number } }) => void>;
    seeked: Set<(e: { detail: { frame: number } }) => void>;
    play: Set<() => void>;
    pause: Set<() => void>;
    ended: Set<() => void>;
  };
  const listenersRef = useRef<ListenerMap>({
    frameupdate: new Set(),
    seeked: new Set(),
    play: new Set(),
    pause: new Set(),
    ended: new Set(),
  });

  const postToIframe = (msg: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  };

  // Build the PlayerRef-shaped adapter. Cast through `unknown` because we
  // intentionally implement only the methods the workstation uses.
  useImperativeHandle(
    playerRef,
    () => {
      const adapter = {
        getCurrentFrame: () => currentFrameRef.current,
        isPlaying: () => isPlayingRef.current,
        play: () => postToIframe({ type: "play" }),
        pause: () => postToIframe({ type: "pause" }),
        seekTo: (frame: number) => postToIframe({ type: "seek", frame }),
        addEventListener: (event: keyof ListenerMap, handler: unknown) => {
          const set = listenersRef.current[event];
          if (set) (set as Set<unknown>).add(handler);
        },
        removeEventListener: (event: keyof ListenerMap, handler: unknown) => {
          const set = listenersRef.current[event];
          if (set) (set as Set<unknown>).delete(handler);
        },
      };
      return adapter as unknown as PlayerRef;
    },
    // Only needs to run once — the adapter's behavior is ref-driven.
    []
  );

  // Listen for messages from the sandbox.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Validate the source is the iframe we own. Origin checks are
      // meaningless with a null-origin sandbox (event.origin === "null"),
      // so we gate on the source window reference instead.
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as GuestMessage | null;
      if (!data || typeof data !== "object") return;

      if (data.type === "ready") {
        setIsReady(true);
        setError(null);
        onErrorChange?.(null);
      } else if (data.type === "error") {
        setError(data.error);
        onErrorChange?.(data.error);
      } else if (data.type === "frameupdate") {
        currentFrameRef.current = data.frame;
        for (const l of listenersRef.current.frameupdate) {
          l({ detail: { frame: data.frame } });
        }
      } else if (data.type === "seeked") {
        currentFrameRef.current = data.frame;
        for (const l of listenersRef.current.seeked) {
          l({ detail: { frame: data.frame } });
        }
      } else if (data.type === "play") {
        isPlayingRef.current = true;
        for (const l of listenersRef.current.play) l();
      } else if (data.type === "pause") {
        isPlayingRef.current = false;
        for (const l of listenersRef.current.pause) l();
      } else if (data.type === "ended") {
        isPlayingRef.current = false;
        for (const l of listenersRef.current.ended) l();
        onEnded?.();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onErrorChange, onEnded]);

  // Ship the initial load once the iframe says it's ready.
  useEffect(() => {
    if (!isReady) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    setError(null);
    onErrorChange?.(null);
    iframe.contentWindow.postMessage(
      {
        type: "load",
        code,
        schemaJson,
        metaJson,
        inputProps,
        options: { controls, loop, autoPlay },
      },
      "*"
    );
    // We intentionally do not include inputProps in deps — prop-only updates
    // go through the next effect below so we don't re-compile on every tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, code, schemaJson, metaJson, onErrorChange, controls, loop, autoPlay]);

  // Ship prop-only updates without recompiling.
  useEffect(() => {
    if (!isReady) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "props", inputProps },
      "*"
    );
  }, [isReady, inputProps]);

  // Clear stale errors when the iframe (re)loads. We used to also reset
  // `isReady` to false here to "force re-send after HMR", but iframe.onLoad
  // fires AFTER the bundle's own "ready" postMessage on most browsers —
  // which meant the parent set isReady=true, then immediately reset it to
  // false, and the "load" payload was never sent. The preview sat on
  // "Waiting for preset…" forever. A fresh mount already gives us a fresh
  // sandboxSrc URL and fresh ready message, so we don't need to reset.
  const handleLoad = () => {
    setError(null);
    onErrorChange?.(null);
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        // PreviewPanel's PlayerStage already provides the aspect-ratio box,
        // so we just fill it entirely. Keep aspectRatio as a fallback for
        // callers that drop the sandbox into a free-form container.
        width: "100%",
        height: "100%",
        aspectRatio: String(aspectRatio),
        background: "#09090b",
        overflow: "hidden",
      }}
    >
      <iframe
        ref={iframeRef}
        // Locally, we must include .html so the Dev Server serves the raw file
        // instead of hitting the 404 router and injecting dev-mode scripts.
        //
        // preset.html itself cache-busts bundle.js via Date.now() when no
        // ?v= is provided, so every iframe mount gets the latest runtime.
        // In production we can pass a deploy-hash here to get stable
        // per-deploy caching instead of cache-miss-on-every-mount.
        src={sandboxSrc}
        title="Preset preview (sandboxed)"
        // allow-scripts WITHOUT allow-same-origin gives this frame a null
        // origin. It cannot read any of our app state.
        //
        // src points at a STATIC HTML file served from /public/sandbox/
        // rather than a Next.js route. The runtime bundle there is built
        // independently by scripts/build-sandbox.mjs, which sidesteps the
        // Next handler graph that was pulling ws/node:https into every
        // request and crashing the worker.
        sandbox="allow-scripts"
        onLoad={handleLoad}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
      {/* No loading indicator while the iframe warms up — callers that
          want one can layer their own over the container. In the
          marketplace card context, the static gradient background
          behind this iframe serves as the implicit loading state, and
          a centered spinner over every card is visual noise. */}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(9, 9, 11, 0.95)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "420px" }}>
            {/* Error icon */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <AlertCircle
                className="w-10 h-10 text-red-500"
                style={{ position: "relative" }}
              />
            </div>

            {/* Error message */}
            <h3
              style={{
                color: "#fafafa",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Preset Error
            </h3>
            <p
              style={{
                color: "#a1a1aa",
                fontSize: 12,
                marginBottom: 16,
                lineHeight: "1.5",
                maxHeight: "120px",
                overflowY: "auto",
                wordBreak: "break-word",
              }}
            >
              {error}
            </p>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => {
                  setError(null);
                  handleLoad();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  background: "rgba(168, 85, 247, 0.1)",
                  color: "#d8b4fe",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "all 200ms",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background =
                    "rgba(168, 85, 247, 0.2)";
                  (e.target as HTMLButtonElement).style.borderColor =
                    "rgba(168, 85, 247, 0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background =
                    "rgba(168, 85, 247, 0.1)";
                  (e.target as HTMLButtonElement).style.borderColor =
                    "rgba(168, 85, 247, 0.3)";
                }}
              >
                <RotateCcw style={{ width: 12, height: 12 }} />
                Reload
              </button>
              <a
                href="https://github.com/DevFrmwrkd/motionkit/issues/new?title=Preset%20Error&labels=bug"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#fca5a5",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "all 200ms",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.background =
                    "rgba(239, 68, 68, 0.2)";
                  (e.target as HTMLAnchorElement).style.borderColor =
                    "rgba(239, 68, 68, 0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.background =
                    "rgba(239, 68, 68, 0.1)";
                  (e.target as HTMLAnchorElement).style.borderColor =
                    "rgba(239, 68, 68, 0.3)";
                }}
              >
                <MessageCircle style={{ width: 12, height: 12 }} />
                Report
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
