import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-24 px-8 text-center">
        {/* Logo / Brand */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-100">
            Motion<span className="text-amber-500">Kit</span>
          </h1>
          <p className="mt-3 text-lg text-zinc-400">
            Motion graphics workstation powered by Remotion
          </p>
        </div>

        {/* Description */}
        <p className="max-w-xl text-zinc-500 mb-12 leading-relaxed">
          Browse, customize, and render motion graphics presets without writing
          code. Powered by your own rendering compute.
        </p>

        {/* CTAs */}
        <div className="flex gap-4">
          <Link
            href="/workstation"
            className="flex h-12 items-center justify-center rounded-lg bg-amber-500 px-8 text-zinc-950 font-semibold transition-colors hover:bg-amber-400"
          >
            Open Workstation
          </Link>
          <Link
            href="/settings"
            className="flex h-12 items-center justify-center rounded-lg border border-zinc-700 px-8 text-zinc-300 font-medium transition-colors hover:bg-zinc-800"
          >
            Settings
          </Link>
        </div>

        {/* Status badges */}
        <div className="mt-16 flex gap-6 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Convex connected
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Phase 1 in progress
          </div>
        </div>
      </main>
    </div>
  );
}
