"use client";

/**
 * Anonymous Create experience powered by the Straico free-tier flow
 * (convex/aiGenerationStraico.ts). Intentionally a stripped-down version of
 * the authenticated `CreateWorkstation` — guests can:
 *
 *   - type a prompt, pick a category/style
 *   - generate via Gemini 3 Flash (Straico, capped at 5/day per guestId)
 *   - preview the result inside the sandboxed player
 *
 * They cannot save, publish, iterate with edits, or use BYOK providers —
 * those all live behind the login CTA. When a guest hits the cap or wants
 * to persist work, we route them to /login.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useGuestId } from "@/hooks/useGuestId";
import { SandboxedPresetPlayer } from "@/components/preset/SandboxedPresetPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Lock, Film, Info } from "lucide-react";

const CATEGORIES = [
  { value: "auto", label: "Auto-detect" },
  { value: "title", label: "Title Card" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "lower-third", label: "Lower Third" },
  { value: "cta", label: "Call to Action" },
  { value: "transition", label: "Transition" },
  { value: "chart", label: "Chart / Data" },
  { value: "map", label: "Map" },
  { value: "social", label: "Social" },
] as const;

const STYLES = [
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Dark" },
  { value: "minimal", label: "Minimal" },
  { value: "corporate", label: "Corporate" },
  { value: "vibrant", label: "Vibrant" },
  { value: "retro", label: "Retro" },
  { value: "futuristic", label: "Futuristic" },
  { value: "warm", label: "Warm" },
  { value: "editorial", label: "Editorial" },
] as const;

type GeneratedPreset = {
  componentCode: string;
  schema: string;
  meta: string;
  summary: string;
  tokensUsed: number;
};

type Quota = { used: number; limit: number; remaining: number };

export function GuestCreateWorkstation() {
  const guestId = useGuestId();
  const generate = useAction(api.aiGenerationStraico.generate);

  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<string>("auto");
  const [style, setStyle] = useState<string>("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedPreset | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);

  const inputProps = useMemo<Record<string, unknown>>(() => {
    if (!result) return {};
    try {
      const schema = JSON.parse(result.schema) as Record<
        string,
        { default?: unknown }
      >;
      const defaults: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(schema)) {
        if (field && "default" in field) defaults[key] = field.default;
      }
      return defaults;
    } catch {
      return {};
    }
  }, [result]);

  // Clear stale errors when the user starts editing again.
  useEffect(() => {
    if (error && prompt) setError(null);
  }, [prompt, error]);

  const handleGenerate = useCallback(async () => {
    if (!guestId) {
      toast.error("Still initializing — try again in a second.");
      return;
    }
    if (prompt.trim().length < 4) {
      setError("Describe the animation in a bit more detail.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await generate({
        prompt: prompt.trim(),
        category,
        style,
        guestId,
      });

      if (!res.ok) {
        setError(res.error);
        if (res.quota) setQuota(res.quota);
        toast.error(res.error);
        return;
      }

      setResult({
        componentCode: res.componentCode,
        schema: res.schema,
        meta: res.meta,
        summary: res.summary,
        tokensUsed: res.tokensUsed,
      });
      setQuota(res.quota);
      toast.success(
        `Generated! ${res.quota.remaining}/${res.quota.limit} left today.`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [guestId, prompt, category, style, generate]);

  const atCap = quota?.remaining === 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-amber-500" />
              Create a preset
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">
              Free tier — Gemini 3 Flash via Straico, 5 generations per day.
              Sign in to save, publish, or use your own API keys.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {quota && (
              <Badge
                variant={atCap ? "destructive" : "secondary"}
                className="gap-1"
              >
                {quota.remaining}/{quota.limit} left today
              </Badge>
            )}
            <Link href="/login">
              <Button variant="outline" size="sm">
                <Lock className="w-4 h-4 mr-2" />
                Sign in
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <section className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                What do you want to create?
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A modern title card that fades in the words 'WELCOME' in gold on a deep blue background, 3 seconds, 1920x1080."
                rows={6}
                className="bg-zinc-900 border-zinc-800 resize-none"
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Category
                </label>
                <Select value={category} onValueChange={(v) => setCategory(v ?? "auto")}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Style
                </label>
                <Select value={style} onValueChange={(v) => setStyle(v ?? "auto")}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || atCap || !guestId}
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating with Gemini 3 Flash...
                </>
              ) : atCap ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Daily limit reached — sign in for more
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>

            {error && (
              <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400 flex gap-2">
              <Info className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
              <span>
                Guest generations don&apos;t save.{" "}
                <Link href="/login" className="text-amber-500 hover:underline">
                  Sign in
                </Link>{" "}
                to save, publish to the marketplace, iterate with edits, or
                bring your own Gemini/Claude key.
              </span>
            </div>
          </section>

          {/* Preview panel */}
          <section>
            <div className="aspect-video rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative">
              {result ? (
                <SandboxedPresetPlayer
                  code={result.componentCode}
                  schemaJson={result.schema}
                  metaJson={result.meta}
                  inputProps={inputProps}
                  className="w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3">
                  <Film className="w-12 h-12" />
                  <p className="text-sm">Your generated preset will play here</p>
                </div>
              )}
            </div>
            {result && (
              <div className="mt-3 text-xs text-zinc-500 space-y-1">
                <p>{result.summary}</p>
                <p>Tokens used: {result.tokensUsed.toLocaleString()}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
