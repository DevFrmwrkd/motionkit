"use client";

import { ReactNode, type ComponentType, useEffect, useState } from "react";

type ConvexRuntime = {
  ConvexAuthProvider: ComponentType<{
    client: unknown;
    children: ReactNode;
  }>;
  client: { close?: () => Promise<void> | void };
};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<ConvexRuntime | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let clientToClose: ConvexRuntime["client"] | null = null;

    void Promise.all([import("@convex-dev/auth/react"), import("convex/react")])
      .then(([authModule, convexModule]) => {
        if (cancelled) {
          return;
        }

        clientToClose = new convexModule.ConvexReactClient(
          process.env.NEXT_PUBLIC_CONVEX_URL as string
        );

        setRuntime({
          ConvexAuthProvider:
            authModule.ConvexAuthProvider as ConvexRuntime["ConvexAuthProvider"],
          client: clientToClose,
        });
      })
      .catch((error) => {
        console.error("Failed to initialize Convex client", error);
        if (!cancelled) {
          setLoadError("Failed to initialize the application.");
        }
      });

    return () => {
      cancelled = true;
      void clientToClose?.close?.();
    };
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-6">
        <p className="text-sm text-zinc-400">{loadError}</p>
      </div>
    );
  }

  if (!runtime) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const { ConvexAuthProvider, client } = runtime;
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
