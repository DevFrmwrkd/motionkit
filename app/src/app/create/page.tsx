"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { PresetPlayer } from "@/components/preset/PresetPlayer";
import { SchemaForm } from "@/components/preset/SchemaForm";
import { ReferenceImageUpload } from "@/components/ai/ReferenceImageUpload";
import { CodePreview } from "@/components/ai/CodePreview";
import { codeToComponent } from "@/lib/code-to-component";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Save,
  Globe,
  RefreshCw,
  AlertCircle,
  Wand2,
  History,
  ChevronRight,
  Film,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "intro", label: "Intro" },
  { value: "title", label: "Title Card" },
  { value: "lower-third", label: "Lower Third" },
  { value: "cta", label: "Call to Action" },
  { value: "transition", label: "Transition" },
  { value: "outro", label: "Outro" },
  { value: "full", label: "Full Composition" },
  { value: "chart", label: "Chart / Data" },
  { value: "map", label: "Map" },
  { value: "social", label: "Social Media" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type Provider = "gemini" | "claude";
type GenerationStatus = "idle" | "generating" | "complete" | "failed";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreatePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useCurrentUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return <CreateWorkstation userId={user._id as Id<"users">} userName={user.name ?? "Creator"} />;
}

// ---------------------------------------------------------------------------
// Main Workstation Component
// ---------------------------------------------------------------------------

function CreateWorkstation({ userId, userName }: { userId: Id<"users">; userName: string }) {
  // --- AI Generation State ---
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<Category>("title");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [referenceImageId, setReferenceImageId] = useState<string>("");
  const [iterationPrompt, setIterationPrompt] = useState("");

  // --- Generation tracking ---
  const [activeGenerationId, setActiveGenerationId] =
    useState<Id<"aiGenerations"> | null>(null);
  const [localStatus, setLocalStatus] = useState<GenerationStatus>("idle");
  const [localError, setLocalError] = useState<string | null>(null);

  // --- User-adjusted props (after generation) ---
  const [userProps, setUserProps] = useState<Record<string, unknown>>({});

  // --- Convex queries & mutations ---
  const activeGeneration = useQuery(
    api.aiGeneration.get,
    activeGenerationId ? { id: activeGenerationId } : "skip"
  );
  const generationHistory = useQuery(api.aiGeneration.listByUser, { userId });
  const createGeneration = useMutation(api.aiGeneration.create);
  const createPreset = useMutation(api.presets.create);
  const dispatchGeneration = useAction(
    api.actions.generatePreset.dispatchGeneration
  );

  // --- Parse generated output ---
  const compiledPreset = useMemo(() => {
    if (
      !activeGeneration ||
      activeGeneration.status !== "complete" ||
      !activeGeneration.generatedCode ||
      !activeGeneration.generatedSchema ||
      !activeGeneration.generatedMeta
    ) {
      return null;
    }
    return codeToComponent(
      activeGeneration.generatedCode,
      activeGeneration.generatedSchema,
      activeGeneration.generatedMeta
    );
  }, [activeGeneration]);

  // --- Merge defaults with user overrides ---
  const defaultProps = useMemo(() => {
    if (!compiledPreset?.preset?.schema) return {};
    const props: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(compiledPreset.preset.schema)) {
      props[key] = field.default;
    }
    return props;
  }, [compiledPreset]);

  const inputProps = { ...defaultProps, ...userProps };
  const effectiveStatus: GenerationStatus =
    localStatus === "generating" && activeGeneration?.status === "complete"
      ? "complete"
      : localStatus === "generating" && activeGeneration?.status === "failed"
        ? "failed"
        : localStatus;
  const effectiveError =
    localStatus === "generating" && activeGeneration?.status === "failed"
      ? activeGeneration.error ?? "Generation failed"
      : localError;

  // --- Handlers ---

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your motion graphic");
      return;
    }

    setLocalStatus("generating");
    setLocalError(null);
    setUserProps({});

    try {
      const genId = await createGeneration({
        userId,
        prompt: prompt.trim(),
        category,
        provider,
        referenceImageId: referenceImageId
          ? (referenceImageId as Id<"_storage">)
          : undefined,
      });

      setActiveGenerationId(genId);

      // Fire the action (non-blocking -- the reactive query will pick up completion)
      void dispatchGeneration({
        generationId: genId,
        prompt: prompt.trim(),
        category,
        provider,
      });
    } catch (err) {
      setLocalStatus("failed");
      setLocalError(
        err instanceof Error ? err.message : "Failed to start generation"
      );
    }
  }, [
    prompt,
    category,
    provider,
    referenceImageId,
    userId,
    createGeneration,
    dispatchGeneration,
  ]);

  const handleIterate = useCallback(async () => {
    if (!iterationPrompt.trim() || !activeGenerationId) return;

    setLocalStatus("generating");
    setLocalError(null);
    setUserProps({});

    try {
      const genId = await createGeneration({
        userId,
        prompt: iterationPrompt.trim(),
        category,
        provider,
        parentGenerationId: activeGenerationId,
      });

      setActiveGenerationId(genId);

      void dispatchGeneration({
        generationId: genId,
        prompt: iterationPrompt.trim(),
        category,
        provider,
        parentGenerationId: activeGenerationId,
      });

      setIterationPrompt("");
    } catch (err) {
      setLocalStatus("failed");
      setLocalError(
        err instanceof Error ? err.message : "Failed to start iteration"
      );
    }
  }, [
    iterationPrompt,
    activeGenerationId,
    category,
    provider,
    userId,
    createGeneration,
    dispatchGeneration,
  ]);

  const handlePropChange = (key: string, value: unknown) => {
    setUserProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetProps = () => {
    setUserProps({});
  };

  const handleSave = async (publish: boolean) => {
    if (
      !activeGeneration ||
      !compiledPreset?.preset ||
      !activeGeneration.generatedCode
    ) {
      return;
    }

    const { meta } = compiledPreset.preset;

    try {
      await createPreset({
        name: meta.name,
        description: meta.description,
        category: (meta.category ?? category) as
          | "intro"
          | "title"
          | "lower-third"
          | "cta"
          | "transition"
          | "outro"
          | "full"
          | "chart"
          | "map"
          | "social",
        tags: meta.tags ?? [],
        author: userName,
        authorId: userId,
        bundleUrl: `ai://generated/${activeGenerationId}`,
        fps: meta.fps,
        width: meta.width,
        height: meta.height,
        durationInFrames: meta.durationInFrames,
        inputSchema: activeGeneration.generatedSchema!,
        sourceCode: activeGeneration.generatedCode,
        generationId: activeGenerationId!,
        isPublic: publish,
        status: publish ? "published" : "draft",
      });

      toast.success(
        publish ? "Published to marketplace!" : "Saved to your library!"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save preset"
      );
    }
  };

  const handleLoadGeneration = (genId: Id<"aiGenerations">) => {
    setActiveGenerationId(genId);
    setLocalStatus("idle");
    setLocalError(null);
    setUserProps({});
  };

  // --- Derived state ---
  const isGenerating = effectiveStatus === "generating";
  const isComplete =
    effectiveStatus === "complete" ||
    (activeGeneration?.status === "complete" && localStatus !== "generating");
  const isFailed = effectiveStatus === "failed";
  const hasPreview = isComplete && compiledPreset?.preset != null;
  const compileError = isComplete && compiledPreset?.error;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />

      <div className="flex flex-1 min-h-0 overflow-auto">
        {/* ================================================================ */}
        {/* LEFT COLUMN - AI Generator Panel                                 */}
        {/* ================================================================ */}
        <div className="w-[300px] shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-zinc-200">
                  AI Generator
                </h2>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Describe your motion graphic
                </label>
                <Textarea
                  placeholder="A sleek title card with the company name animating in letter by letter, with a gradient background that shifts from purple to blue..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] bg-zinc-900/50 border-zinc-800 text-sm resize-none placeholder:text-zinc-600"
                  disabled={isGenerating}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Category
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as Category)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  AI Provider
                </label>
                <Select
                  value={provider}
                  onValueChange={(v) => setProvider(v as Provider)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">
                      <span className="flex items-center gap-2">
                        Gemini
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-green-500/30 text-green-400"
                        >
                          Free
                        </Badge>
                      </span>
                    </SelectItem>
                    <SelectItem value="claude">
                      <span className="flex items-center gap-2">
                        Claude
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-violet-500/30 text-violet-400"
                        >
                          Premium
                        </Badge>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Image */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Reference Image (optional)
                </label>
                <ReferenceImageUpload
                  onUpload={setReferenceImageId}
                  storageId={referenceImageId || undefined}
                />
              </div>

              {/* Generate Button */}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>

              {/* Iteration Section -- shown after first generation */}
              {(isComplete || isFailed) && (
                <>
                  <Separator className="bg-zinc-800" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-400">
                        Refine
                      </span>
                    </div>
                    <Textarea
                      placeholder="Make the text bigger, change animation to slide in from the left..."
                      value={iterationPrompt}
                      onChange={(e) => setIterationPrompt(e.target.value)}
                      className="min-h-[60px] bg-zinc-900/50 border-zinc-800 text-sm resize-none placeholder:text-zinc-600"
                      disabled={isGenerating}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      onClick={handleIterate}
                      disabled={isGenerating || !iterationPrompt.trim()}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Update
                    </Button>
                  </div>
                </>
              )}

              {/* Generation History */}
              {generationHistory && generationHistory.length > 0 && (
                <>
                  <Separator className="bg-zinc-800" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-400">
                        History
                      </span>
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {generationHistory.map((gen) => (
                        <button
                          key={gen._id}
                          onClick={() => handleLoadGeneration(gen._id)}
                          className={`
                            w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors
                            flex items-center gap-2 group
                            ${
                              gen._id === activeGenerationId
                                ? "bg-amber-500/10 text-amber-400"
                                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            }
                          `}
                        >
                          <StatusDot status={gen.status} />
                          <span className="truncate flex-1">{gen.prompt}</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ================================================================ */}
        {/* CENTER COLUMN - Live Preview                                     */}
        {/* ================================================================ */}
        <div className="flex-1 min-w-0 bg-zinc-950/50 flex flex-col relative">
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* IDLE state */}
            {localStatus === "idle" && !activeGeneration && (
              <EmptyState />
            )}

            {/* GENERATING state */}
            {isGenerating && <GeneratingState />}

            {/* FAILED state */}
            {isFailed && (
              <ErrorState
                error={effectiveError}
                onRetry={handleGenerate}
              />
            )}

            {/* COMPILE ERROR state */}
            {compileError && (
              <ErrorState
                error={compiledPreset?.error ?? "Failed to compile generated code"}
                onRetry={handleGenerate}
              />
            )}

            {/* SUCCESS - live preview */}
            {hasPreview && compiledPreset.preset && (
              <div className="w-full max-w-3xl">
                <PresetPlayer
                  component={compiledPreset.preset.component}
                  inputProps={inputProps}
                  meta={compiledPreset.preset.meta}
                  className="rounded-lg overflow-hidden border border-zinc-800 shadow-2xl"
                />

                {/* Frame info below preview */}
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    {compiledPreset.preset.meta.durationInFrames} frames
                  </span>
                  <span>{compiledPreset.preset.meta.fps} fps</span>
                  <span>
                    {compiledPreset.preset.meta.width} x{" "}
                    {compiledPreset.preset.meta.height}
                  </span>
                </div>
              </div>
            )}

            {/* Loaded from history but status = idle (not generating) */}
            {localStatus === "idle" &&
              activeGeneration?.status === "complete" &&
              !hasPreview &&
              compileError && (
                <ErrorState
                  error={
                    compiledPreset?.error ??
                    "Failed to compile generated code"
                  }
                  onRetry={handleGenerate}
                />
              )}

            {localStatus === "idle" &&
              activeGeneration?.status === "complete" &&
              hasPreview &&
              compiledPreset?.preset && (
                <div className="w-full max-w-3xl">
                  <PresetPlayer
                    component={compiledPreset.preset.component}
                    inputProps={inputProps}
                    meta={compiledPreset.preset.meta}
                    className="rounded-lg overflow-hidden border border-zinc-800 shadow-2xl"
                  />
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      {compiledPreset.preset.meta.durationInFrames} frames
                    </span>
                    <span>{compiledPreset.preset.meta.fps} fps</span>
                    <span>
                      {compiledPreset.preset.meta.width} x{" "}
                      {compiledPreset.preset.meta.height}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN - Controls + Code                                   */}
        {/* ================================================================ */}
        <div className="w-[320px] shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.5)]">
          {(hasPreview || (localStatus === "idle" && activeGeneration?.status === "complete" && compiledPreset?.preset)) ? (
            <RightPanel
              schema={compiledPreset!.preset!.schema}
              values={inputProps}
              code={activeGeneration!.generatedCode!}
              meta={compiledPreset!.preset!.meta}
              onChange={handlePropChange}
              onReset={handleResetProps}
              onSave={() => void handleSave(false)}
              onPublish={() => void handleSave(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-zinc-600 text-center">
                Generate a preset to see controls and code here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Panel (Controls + Code tabs)
// ---------------------------------------------------------------------------

function RightPanel({
  schema,
  values,
  code,
  meta,
  onChange,
  onReset,
  onSave,
  onPublish,
}: {
  schema: Record<string, import("@/lib/types").SchemaField>;
  values: Record<string, unknown>;
  code: string;
  meta: import("@/lib/types").PresetMeta;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Preset title */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 truncate">
          {meta.name}
        </h3>
        {meta.description && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
            {meta.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="controls" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="controls" className="text-xs">
            Controls
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs">
            Code
          </TabsTrigger>
        </TabsList>

        {/* Controls Tab */}
        <TabsContent value="controls" className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1 px-4 py-3">
            {Object.keys(schema).length > 0 ? (
              <SchemaForm
                schema={schema}
                values={values}
                onChange={onChange}
              />
            ) : (
              <p className="text-xs text-zinc-500 text-center py-4">
                No customizable properties
              </p>
            )}
          </ScrollArea>

          <div className="px-4 py-2 border-t border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-zinc-400 hover:text-zinc-200 text-xs"
              onClick={onReset}
            >
              Reset to defaults
            </Button>
          </div>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 min-h-0">
          <ScrollArea className="flex-1 p-4">
            <CodePreview code={code} />
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="p-4 border-t border-zinc-800 space-y-2">
        <Button
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          onClick={onSave}
        >
          <Save className="w-4 h-4 mr-2" />
          Save to Library
        </Button>
        <Button
          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          onClick={onPublish}
        >
          <Globe className="w-4 h-4 mr-2" />
          Publish to Marketplace
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State Components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="text-center space-y-4 max-w-md">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
        <Sparkles className="w-7 h-7 text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-200">
          Create with AI
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Describe your motion graphic on the left panel to generate a live
          preview. No code needed.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          "Animated title card",
          "YouTube intro",
          "Lower third",
          "Social media post",
        ].map((example) => (
          <Badge
            key={example}
            variant="outline"
            className="text-xs border-zinc-700 text-zinc-400 cursor-default"
          >
            {example}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto relative">
        <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-200">
          Generating your motion graphic...
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          The AI is writing Remotion code for your preset. This usually takes
          15-30 seconds.
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="text-center space-y-4 max-w-md">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-200">
          Generation Failed
        </h3>
        <p className="text-sm text-red-400/80 mt-1">{error}</p>
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        className="border-zinc-700 text-zinc-300"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    generating: "bg-amber-500 animate-pulse",
    complete: "bg-green-500",
    failed: "bg-red-500",
  };
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] ?? "bg-zinc-600"}`}
    />
  );
}
