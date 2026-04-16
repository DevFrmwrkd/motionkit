"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/shared/SiteHeader";
import {
  ArrowRight,
  Sparkles,
  Wand2,
  Zap,
  Layers,
  GitFork,
  ThumbsUp,
  Code2,
  Upload,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative px-6 py-32 flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-zinc-950 to-zinc-950" />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-100 mb-6 leading-tight">
              AI-Powered{" "}
              <span className="bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-none">
                Motion
              </span>
              <br />
              <span className="bg-gradient-to-b from-amber-500 to-orange-600 bg-clip-text text-transparent drop-shadow-none">
                Graphics
              </span>
              <br />
              For Everyone.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
              Describe what you want, and AI creates professional Remotion
              animations with live preview. Clone, customize, and share with the
              community. No code required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/create">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold px-8 text-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create with AI
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-14 border-zinc-700 text-zinc-200 hover:bg-zinc-800 font-semibold px-8 text-lg bg-zinc-900/50 backdrop-blur"
                >
                  <Layers className="w-5 h-5 mr-2" />
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 border-t border-zinc-900">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-4">
              How it works
            </h2>
            <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
              From idea to animated video in three steps.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Describe",
                  desc: "Tell the AI what motion graphic you need. Choose a category and optionally upload a reference image.",
                  icon: <Wand2 className="w-6 h-6 text-amber-500" />,
                },
                {
                  step: "2",
                  title: "Preview & Tweak",
                  desc: "See a live Remotion preview instantly. Adjust colors, text, timing, and animations with generated controls.",
                  icon: <Zap className="w-6 h-6 text-amber-500" />,
                },
                {
                  step: "3",
                  title: "Share & Clone",
                  desc: "Publish to the marketplace, let others clone and build on your work. Vote on the best designs.",
                  icon: <GitFork className="w-6 h-6 text-amber-500" />,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 transition-all duration-300 hover:bg-zinc-900 hover:border-zinc-700 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-amber-500/5"
                >
                  <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-amber-500 text-zinc-950 font-bold text-sm flex items-center justify-center">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-zinc-900">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-14">
              Built for creators and developers
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Sparkles className="w-5 h-5 text-amber-500" />,
                  title: "AI Generation",
                  desc: "Gemini and Claude create Remotion code from your descriptions. Free daily quota included.",
                },
                {
                  icon: <GitFork className="w-5 h-5 text-amber-500" />,
                  title: "Version Control",
                  desc: "Clone any preset, create your own version. Track the full fork tree like Git.",
                },
                {
                  icon: <ThumbsUp className="w-5 h-5 text-amber-500" />,
                  title: "Community Voting",
                  desc: "Upvote the best designs. Sort by trending, popular, or highest rated.",
                },
                {
                  icon: <Code2 className="w-5 h-5 text-amber-500" />,
                  title: "IDE Import",
                  desc: "Developers can paste their own Remotion code directly. No AI needed.",
                },
                {
                  icon: <Upload className="w-5 h-5 text-amber-500" />,
                  title: "Reference Images",
                  desc: "Upload screenshots or mockups. The AI uses them for visual direction.",
                },
                {
                  icon: <Layers className="w-5 h-5 text-amber-500" />,
                  title: "Category Skills",
                  desc: "Charts, maps, intros, transitions — each category loads specialized AI knowledge.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 transition-all duration-300 hover:bg-zinc-900 hover:border-zinc-700 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-amber-500/5"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-zinc-900">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to create?
            </h2>
            <p className="text-zinc-400 mb-8">
              Start with the free AI tier. No credit card required.
            </p>
            <Link href="/create">
              <Button
                size="lg"
                className="h-12 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold px-8"
              >
                Get Started <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
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
