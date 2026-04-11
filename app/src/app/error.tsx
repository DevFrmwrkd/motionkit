"use client";

import { useEffect } from "react";
import Link from "next/link";

const IS_DEV = process.env.NODE_ENV !== "production";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (IS_DEV) {
      console.error("[MotionKit error boundary]", error);
      return;
    }

    console.error("[MotionKit error boundary]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full border border-red-500/30 bg-red-500/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-zinc-300">
          We hit an unexpected error. Try again, or head back to the home page.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-zinc-500 font-mono">
            Error reference: {error.digest}
          </p>
        )}
        {/* In dev we show the real message + stack to help debugging. In prod
            we deliberately do not leak internals to the browser. */}
        {IS_DEV && (
          <>
            <p className="mt-4 text-xs text-zinc-400 font-mono break-words">
              {error.message || String(error)}
            </p>
            {error.stack && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-black/40 p-3 text-xs text-zinc-400 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => reset()}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
