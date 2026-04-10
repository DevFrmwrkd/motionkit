"use client";

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
            <p style={{ marginTop: 8, fontSize: 14, fontFamily: "monospace", wordBreak: "break-word" }}>
              {error.message || String(error)}
            </p>
            {error.digest && (
              <p style={{ marginTop: 4, fontSize: 12, color: "#71717a", fontFamily: "monospace" }}>
                digest: {error.digest}
              </p>
            )}
            {error.stack && (
              <pre style={{ marginTop: 16, maxHeight: 256, overflow: "auto", background: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 6, fontSize: 11, color: "#a1a1aa", whiteSpace: "pre-wrap" }}>
                {error.stack}
              </pre>
            )}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => reset()}
                style={{ borderRadius: 6, background: "#f59e0b", padding: "6px 12px", fontSize: 14, fontWeight: 600, color: "#09090b", border: "none", cursor: "pointer" }}
              >
                Try again
              </button>
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
