"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/shared/SiteHeader";
import {
  ArrowRight,
  Sparkles,
  Wand2,
  Zap,
  GitFork,
  ThumbsUp,
  Code2,
  Upload,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* Hero — editorial: one idea, one line, one action.
            Prior revision used a double amber→orange gradient on "Motion
            Graphics" + a three-icon button cluster. That pattern reads as
            AI-generated. Restraint here is deliberate. */}
        <section className="relative px-6 pt-28 pb-24 md:pt-40 md:pb-32 overflow-hidden">
          {/* Soft ambient wash — one tone, no rainbow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,_var(--tw-gradient-stops))] from-amber-500/[0.06] via-zinc-950 to-zinc-950" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 80%)",
            }}
          />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-start md:items-center md:text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs font-medium text-zinc-400 backdrop-blur mb-8">
              <span className="size-1.5 rounded-full bg-amber-400" />
              MotionKit · Remotion workstation
            </span>

            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-zinc-50 mb-6 leading-[1.05]">
              Motion graphics,
              <br />
              <span className="text-zinc-400">without the timeline.</span>
            </h1>

            <p className="text-base md:text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
              Describe a scene. Tune the inputs. Render in your browser. The
              preset library is real code you can fork — not a catalogue you
              beg for exports.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/create">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold px-7 text-[15px]"
                >
                  Start with AI
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 font-medium px-7 text-[15px] bg-transparent"
                >
                  Browse marketplace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works — editorial rail. Numbered badges replaced with
            typographic step markers; palette stays neutral, with amber
            reserved for the verb line, not decoration. */}
        <section className="py-24 border-t border-zinc-900">
          <div className="max-w-5xl mx-auto px-6">
            <div className="mb-16 max-w-xl">
              <span className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-3 block">
                How it works
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-100">
                From prompt to render, in one window.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-900">
              {[
                {
                  step: "01",
                  title: "Describe",
                  desc: "Tell the model what you need. Category and reference image optional.",
                  icon: <Wand2 className="w-4 h-4" />,
                },
                {
                  step: "02",
                  title: "Tune",
                  desc: "Live Remotion preview. Schema-driven controls for copy, colour, timing.",
                  icon: <Zap className="w-4 h-4" />,
                },
                {
                  step: "03",
                  title: "Ship",
                  desc: "Render in-browser, publish to the marketplace, or fork someone else's.",
                  icon: <GitFork className="w-4 h-4" />,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative bg-zinc-950 p-8 md:p-10 transition-colors duration-200 hover:bg-zinc-900/60"
                >
                  <div className="flex items-center justify-between mb-10">
                    <span className="text-[11px] font-mono font-medium text-zinc-600 tracking-widest">
                      {item.step}
                    </span>
                    <span className="text-zinc-700">{item.icon}</span>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features — condensed, labels not taglines. One accent per row. */}
        <section className="py-24 border-t border-zinc-900">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16 max-w-xl">
              <span className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-3 block">
                What you get
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-100">
                Opinionated where it matters. Out of your way everywhere else.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-900">
              {[
                {
                  icon: <Sparkles className="w-4 h-4" />,
                  title: "AI generation",
                  desc: "Gemini, Claude, or any OpenRouter model. Bring your own key or use the platform quota.",
                },
                {
                  icon: <GitFork className="w-4 h-4" />,
                  title: "Every preset is a fork point",
                  desc: "Clone the code, change a schema field, save a variant. No exports, no asset hunting.",
                },
                {
                  icon: <ThumbsUp className="w-4 h-4" />,
                  title: "Community signal",
                  desc: "Upvotes sort the marketplace. Forks track where the ideas actually went.",
                },
                {
                  icon: <Code2 className="w-4 h-4" />,
                  title: "Paste-in import",
                  desc: "Have your own Remotion composition? Paste the TSX, get a workstation row.",
                },
                {
                  icon: <Upload className="w-4 h-4" />,
                  title: "Reference images",
                  desc: "Drop a screenshot or mockup. The model uses it as visual direction, not lore.",
                },
                {
                  icon: <Layers className="w-4 h-4" />,
                  title: "Per-category skills",
                  desc: "Charts, maps, transitions, lower-thirds — each loads its own domain prompt.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-zinc-950 p-8 transition-colors duration-200 hover:bg-zinc-900/60"
                >
                  <span className="text-zinc-600 mb-6 block">
                    {feature.icon}
                  </span>
                  <h3 className="text-[15px] font-semibold text-zinc-100 mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — quiet close, not a second pitch */}
        <section className="py-24 border-t border-zinc-900">
          <div className="max-w-3xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <div className="max-w-md">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-100 leading-[1.15]">
                  Render one. See if it sticks.
                </h2>
                <p className="text-zinc-500 mt-3 text-[15px] leading-relaxed">
                  Free daily quota. No card. Sign-in only if you want to save.
                </p>
              </div>
              <Link href="/create" className="shrink-0">
                <Button
                  size="lg"
                  className="h-12 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold px-7 text-[15px]"
                >
                  Open the workstation
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight text-zinc-500">
            Motion<span className="text-amber-500/50">Kit</span>
          </span>
          <p className="text-zinc-600 text-sm">
            Powered by Remotion + Convex + Cloudflare
          </p>
          <div className="flex gap-4 text-sm text-zinc-500">
            <Link href="/marketplace" className="hover:text-zinc-300">
              Marketplace
            </Link>
            <Link href="/create" className="hover:text-zinc-300">
              Create
            </Link>
            <Link href="/import" className="hover:text-zinc-300">
              Import
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
