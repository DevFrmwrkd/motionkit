"use client";

/**
 * Anonymous Create experience powered by the Straico free-tier flow
 * (convex/aiGenerationStraico.ts). Mirrors the useful parts of the
 * authenticated `CreateWorkstation`:
 *
 *   - prompt → generate (Gemini 3 Flash via Straico)
 *   - 5/day per guestId quota (localStorage)
 *   - live sandboxed preview
 *   - schema-driven form that edits props and updates the preview in real time
 *   - iteration ("change bar color to red") regenerates on top of the
 *     previous code, same UX as the authed page
 *
 * Save/publish still require sign-in and show a login CTA instead of the
 * real buttons. This file intentionally stays separate from CreateWorkstation
 * because that component is ~1500 lines tied to Convex-resident
 * `aiGenerations` rows and BYOK keys; merging them is a planned follow-up.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useGuestId } from "@/hooks/useGuestId";
import { SandboxedPresetPlayer } from "@/components/preset/SandboxedPresetPlayer";
import { SchemaForm } from "@/components/preset/SchemaForm";
import type { PresetSchema, PresetMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Lock,
  Film,
  Info,
  Wand2,
  Save,
  Globe,
  RotateCcw,
} from "lucide-react";

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
  schemaJson: string;
  metaJson: string;
  schema: PresetSchema;
  meta: PresetMeta;
  summary: string;
  tokensUsed: number;
};

type Quota = { used: number; limit: number; remaining: number };

function parseSchemaAndMeta(
  schemaJson: string,
  metaJson: string
): { schema: PresetSchema; meta: PresetMeta } | null {
  try {
    const schema = JSON.parse(schemaJson) as PresetSchema;
    const meta = JSON.parse(metaJson) as PresetMeta;
    if (
      !meta?.name ||
      !meta?.fps ||
      !meta?.width ||
      !meta?.height ||
      !meta?.durationInFrames
    ) {
      return null;
    }
    return { schema, meta };
  } catch {
    return null;
  }
}

function schemaDefaults(schema: PresetSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    if (field && "default" in field) defaults[key] = field.default;
  }
  return defaults;
}

export function GuestCreateWorkstation() {
  const guestId = useGuestId();
  const generate = useAction(api.aiGenerationStraico.generate);

  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<string>("auto");
  const [style, setStyle] = useState<string>("auto");
  const [iterationPrompt, setIterationPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<GeneratedPreset | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  // Live edits on top of schema defaults. Reset whenever a fresh generation
  // lands so new defaults take effect.
  const [userProps, setUserProps] = useState<Record<string, unknown>>({});

  const defaults = useMemo(
    () => (preset ? schemaDefaults(preset.schema) : {}),
    [preset]
  );
  const inputProps = useMemo(
    () => ({ ...defaults, ...userProps }),
    [defaults, userProps]
  );

  useEffect(() => {
    if (error && prompt) setError(null);
  }, [prompt, error]);

  const runGenerate = useCallback(
    async (opts: {
      promptText: string;
      previousCode?: string;
      isIteration: boolean;
    }) => {
      if (!guestId) {
        toast.error("Still initializing — try again in a second.");
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const res = await generate({
          prompt: opts.promptText.trim(),
          category,
          style,
          guestId,
          previousCode: opts.previousCode,
        });

        if (!res.ok) {
          setError(res.error);
          if (res.quota) setQuota(res.quota);
          toast.error(res.error);
          return;
        }

        const parsed = parseSchemaAndMeta(res.schema, res.meta);
        if (!parsed) {
          setError("Model returned invalid schema or meta — try regenerating.");
          toast.error("Invalid schema/meta — try again.");
          return;
        }

        setPreset({
          componentCode: res.componentCode,
          schemaJson: res.schema,
          metaJson: res.meta,
          schema: parsed.schema,
          meta: parsed.meta,
          summary: res.summary,
          tokensUsed: res.tokensUsed,
        });
        setQuota(res.quota);
        // Fresh generation → discard previous user prop edits so new defaults
        // from the new schema apply cleanly. Iterations keep prop overrides
        // when the key still exists in the new schema.
        if (!opts.isIteration) {
          setUserProps({});
        } else {
          setUserProps((prev) => {
            const filtered: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(prev)) {
              if (k in parsed.schema) filtered[k] = v;
            }
            return filtered;
          });
        }
        setIterationPrompt("");
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
    },
    [guestId, category, style, generate]
  );

  const handleGenerate = useCallback(() => {
    if (prompt.trim().length < 4) {
      setError("Describe the animation in a bit more detail.");
      return;
    }
    void runGenerate({
      promptText: prompt,
      isIteration: false,
    });
  }, [prompt, runGenerate]);

  const handleIterate = useCallback(() => {
    if (!preset || iterationPrompt.trim().length < 2) return;
    void runGenerate({
      promptText: iterationPrompt,
      previousCode: preset.componentCode,
      isIteration: true,
    });
  }, [preset, iterationPrompt, runGenerate]);

  const handlePropChange = (key: string, value: unknown) => {
    setUserProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetProps = () => setUserProps({});

  const signInToast = () =>
    toast("Sign in required", {
      description: "Saving and publishing require an account.",
      action: { label: "Sign in", onClick: () => (window.location.href = "/login") },
    });

  const atCap = quota?.remaining === 0;
  const aspect = preset ? preset.meta.width / preset.meta.height : 16 / 9;

  return (
    // Full-bleed layout: the authenticated shell already provides the sidebar
    // and header chrome, so we fill the remaining viewport width/height
    // rather than centering inside a max-w container (which left ~500px of
    // empty space on either side at >1920px).
    <div className="bg-zinc-950 text-zinc-100 h-[calc(100svh-3.5rem)] overflow-hidden">
      <div className="h-full w-full px-4 py-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Create a preset
            </h1>
            <p className="text-zinc-400 mt-1 text-xs">
              Free tier — Gemini 3 Flash via Straico, 5 per day. Sign in to
              save, publish, or use your own API keys.
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

        {/* 3-column layout matching authed workstation: prompt | preview | controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_360px] gap-4 h-[calc(100%-4rem)]">
          {/* LEFT — prompt + iteration */}
          <aside className="space-y-4 overflow-y-auto pr-1">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <label className="text-xs font-medium text-zinc-300 block">
                What do you want to create?
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A modern title card that fades in 'WELCOME' in gold on deep blue."
                rows={5}
                className="bg-zinc-950 border-zinc-800 text-sm resize-none"
                disabled={isGenerating}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v ?? "auto")}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-8 text-xs">
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
                <Select
                  value={style}
                  onValueChange={(v) => setStyle(v ?? "auto")}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-8 text-xs">
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
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || atCap || !guestId}
                className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : atCap ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Limit reached
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {preset ? "Regenerate" : "Generate"}
                  </>
                )}
              </Button>
              {error && (
                <div className="rounded-md border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
                  {error}
                </div>
              )}
            </section>

            {/* Iteration — only visible after first successful generation */}
            {preset && (
              <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  Tweak with AI
                </label>
                <Textarea
                  value={iterationPrompt}
                  onChange={(e) => setIterationPrompt(e.target.value)}
                  placeholder="Make bars red. Add a title at the top."
                  rows={3}
                  className="bg-zinc-950 border-zinc-800 text-sm resize-none"
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleIterate}
                  disabled={
                    isGenerating ||
                    atCap ||
                    iterationPrompt.trim().length < 2
                  }
                  size="sm"
                  variant="secondary"
                  className="w-full"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 mr-2" />
                  )}
                  Apply change
                </Button>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Each AI tweak spends one daily generation.
                </p>
              </section>
            )}

            <div className="rounded-md border border-zinc-800 bg-zinc-900/30 p-3 text-[11px] text-zinc-400 flex gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 text-zinc-500 shrink-0" />
              <span>
                Guest previews don&apos;t save.{" "}
                <Link
                  href="/login"
                  className="text-amber-500 hover:underline"
                >
                  Sign in
                </Link>{" "}
                to save, publish, and use your own API keys.
              </span>
            </div>
          </aside>

          {/* CENTER — preview */}
          <section className="space-y-3 flex flex-col min-h-0">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex-1 min-h-0 flex items-center justify-center">
              <div
                className="relative w-full max-h-full"
                style={{ aspectRatio: String(aspect), maxWidth: "100%" }}
              >
                {preset ? (
                  <SandboxedPresetPlayer
                    code={preset.componentCode}
                    schemaJson={preset.schemaJson}
                    metaJson={preset.metaJson}
                    inputProps={inputProps}
                    aspectRatio={aspect}
                    className="absolute inset-0"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p className="text-sm">
                          Generating preset via Gemini 3 Flash...
                        </p>
                      </>
                    ) : (
                      <>
                        <Film className="w-12 h-12" />
                        <p className="text-sm">
                          Your generated preset will play here
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {preset && (
              <>
                <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{preset.summary}</span>
                  <span className="text-zinc-600">•</span>
                  <span>
                    {preset.meta.width}×{preset.meta.height} @ {preset.meta.fps}
                    fps
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span>
                    {(preset.meta.durationInFrames / preset.meta.fps).toFixed(1)}s
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span>{preset.tokensUsed.toLocaleString()} tokens</span>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Save / publish — both require auth */}
                <div className="flex gap-2">
                  <Button
                    onClick={signInToast}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Save to library
                    <Lock className="w-3 h-3 ml-2 text-zinc-500" />
                  </Button>
                  <Button
                    onClick={signInToast}
                    size="sm"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950"
                  >
                    <Globe className="w-3.5 h-3.5 mr-2" />
                    Publish to marketplace
                    <Lock className="w-3 h-3 ml-2 text-zinc-700" />
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* RIGHT — live schema form */}
          <aside className="space-y-3 overflow-y-auto pr-1">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-zinc-300">
                  Live controls
                </h2>
                {preset && Object.keys(userProps).length > 0 && (
                  <Button
                    onClick={handleResetProps}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-zinc-400"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              {preset ? (
                <SchemaForm
                  schema={preset.schema}
                  values={inputProps}
                  onChange={handlePropChange}
                />
              ) : (
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  After you generate, knobs for every prop in the preset schema
                  show up here. Edit them to update the preview live.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
