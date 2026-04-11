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

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

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
}

type GuestMessage =
  | { type: "ready" }
  | { type: "error"; error: string };

export function SandboxedPresetPlayer({
  code,
  schemaJson,
  metaJson,
  inputProps,
  className,
  aspectRatio = 16 / 9,
  onErrorChange,
}: SandboxedPresetPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onErrorChange]);

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
      },
      "*"
    );
    // We intentionally do not include inputProps in deps — prop-only updates
    // go through the next effect below so we don't re-compile on every tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, code, schemaJson, metaJson, onErrorChange]);

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

  // Reset ready state if the iframe gets remounted.
  const handleLoad = () => {
    // The iframe's own useEffect fires a ready message on mount; we flip
    // isReady to false here to force re-send after HMR or remount.
    setIsReady(false);
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
        // Next/Cloudflare normalizes away trailing `.html`, so we point at
        // the extension-less path to skip a 307 redirect round-trip.
        src="/sandbox/preset"
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
      {!isReady && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#71717a",
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            color: "#f87171",
            fontSize: 12,
            textAlign: "center",
            background: "rgba(9, 9, 11, 0.9)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
