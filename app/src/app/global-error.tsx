"use client";

// NOTE: global-error renders its own <html>/<body> and fires when even the
// root layout has crashed, so next/link isn't safe here — we deliberately use
// a plain anchor that forces a full-document reload.

const IS_DEV = process.env.NODE_ENV !== "production";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#09090b", color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 640, width: "100%", border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.05)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#f87171", margin: 0 }}>
              MotionKit crashed
            </h2>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              We hit a fatal error. Try again, or head back to the home page.
            </p>
            {error.digest && (
              <p style={{ marginTop: 4, fontSize: 12, color: "#71717a", fontFamily: "monospace" }}>
                Error reference: {error.digest}
              </p>
            )}
            {/* Dev-only details. Never leak stacks to end users in prod. */}
            {IS_DEV && (
              <>
                <p style={{ marginTop: 16, fontSize: 12, fontFamily: "monospace", wordBreak: "break-word", color: "#a1a1aa" }}>
                  {error.message || String(error)}
                </p>
                {error.stack && (
                  <pre style={{ marginTop: 8, maxHeight: 256, overflow: "auto", background: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 6, fontSize: 11, color: "#a1a1aa", whiteSpace: "pre-wrap" }}>
                    {error.stack}
                  </pre>
                )}
              </>
            )}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => reset()}
                style={{ borderRadius: 6, background: "#f59e0b", padding: "6px 12px", fontSize: 14, fontWeight: 600, color: "#09090b", border: "none", cursor: "pointer" }}
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{ borderRadius: 6, border: "1px solid #3f3f46", padding: "6px 12px", fontSize: 14, color: "#e4e4e7", textDecoration: "none" }}
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
