"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SandboxedPresetPlayer } from "@/components/preset/SandboxedPresetPlayer";
import { SchemaForm } from "@/components/preset/SchemaForm";
import { ReferenceImageUpload } from "@/components/ai/ReferenceImageUpload";
import {
  CustomFieldsBuilder,
  serializeCustomFields,
  type CustomField,
} from "@/components/create/CustomFieldsBuilder";
import { CodePreview } from "@/components/ai/CodePreview";
import type {
  AssistantMetadata,
  ConversationContentPart,
  EditOperation,
  ErrorCorrectionContext,
  GenerationErrorType,
  PresetMeta,
  PresetSchema,
} from "@/lib/types";
import { detectPromptSkills } from "@/lib/ai-skill-detector";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { GuestCreateWorkstation } from "./GuestCreateWorkstation";
import { useAutoCorrection } from "@/hooks/useAutoCorrection";
import { useConversationState } from "@/hooks/useConversationState";
import { generatePresetThumbnail } from "@/lib/thumbnail";
import {
  resolveOpenRouterModel,
  type AiProvider,
} from "../../../../shared/aiProviderConfig";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Info,
  Key,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "auto", label: "Auto-detect", hint: "Let AI pick the best type" },
  { value: "title", label: "Title Card" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "lower-third", label: "Lower Third" },
  { value: "cta", label: "Call to Action" },
  { value: "transition", label: "Transition" },
  { value: "full", label: "Full Composition" },
  { value: "chart", label: "Chart / Data" },
  { value: "map", label: "Map" },
  { value: "social", label: "Social Media" },
] as const;

// Matches the keys in app/src/lib/preset-runtime/styleHelpers.ts.
// "auto" tells the backend to skip the style contract and let the AI pick.
const STYLES = [
  { value: "auto", label: "Auto", hint: "Match the prompt" },
  { value: "dark", label: "Dark" },
  { value: "minimal", label: "Minimal" },
  { value: "corporate", label: "Corporate" },
  { value: "vibrant", label: "Vibrant" },
  { value: "retro", label: "Retro" },
  { value: "futuristic", label: "Futuristic" },
  { value: "warm", label: "Warm" },
  { value: "editorial", label: "Editorial" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type Style = (typeof STYLES)[number]["value"];
type Provider = AiProvider;
type GenerationStatus = "idle" | "generating" | "complete" | "failed";
type GenerationDispatchResult =
  | {
      ok: true;
      componentCode: string;
      summary: string;
      metadata: AssistantMetadata;
    }
  | {
      ok: false;
      error: string;
      errorType: GenerationErrorType;
      failedEdit?: EditOperation;
    };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreatePage() {
  const { user, isLoading } = useCurrentUser();

  // Wait out the initial auth resolve so we don't flash the guest UI for a
  // logged-in user (or vice versa).
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  // Anonymous visitors get the Straico free-tier flow. Save/publish require
  // sign-in and are gated in the guest component itself.
  if (!user) {
    return <GuestCreateWorkstation />;
  }

  return (
    <CreateWorkstation
      userId={user._id as Id<"users">}
      hasOwnGeminiKey={Boolean(user.hasGeminiApiKey)}
      hasAnthropicKey={Boolean(user.hasAnthropicApiKey)}
      hasOpenRouterKey={Boolean(user.hasOpenRouterApiKey)}
      savedOpenRouterModel={user.openRouterModel ?? ""}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Workstation Component
// ---------------------------------------------------------------------------

function CreateWorkstation({
  userId,
  hasOwnGeminiKey,
  hasAnthropicKey,
  hasOpenRouterKey,
  savedOpenRouterModel,
}: {
  userId: Id<"users">;
  hasOwnGeminiKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenRouterKey: boolean;
  savedOpenRouterModel: string;
}) {
  const conversation = useConversationState();

  // --- AI Generation State ---
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<Category>("auto");
  const [style, setStyle] = useState<Style>("auto");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [referenceImageId, setReferenceImageId] = useState<string>("");
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(
    null
  );
  const [iterationPrompt, setIterationPrompt] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Free-text system-prompt override under Advanced. Appended to the skill
  // system prompt server-side so the user can nudge tone/constraints without
  // editing the generator itself.
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  // Structured schema the user wants the generated preset to expose.
  // Separate from the prose prompt so visual intent and required knobs
  // don't get tangled in a single free-text message.
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  // OpenRouter supports any model id the user pastes in. This overrides the
  // model saved in Settings for a single generation — leave empty to use the
  // default from Settings.
  const [openRouterModelOverride, setOpenRouterModelOverride] = useState("");

  // --- Generation tracking ---
  const [activeGenerationId, setActiveGenerationId] =
    useState<Id<"aiGenerations"> | null>(null);
  const [localStatus, setLocalStatus] = useState<GenerationStatus>("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<{
    message: string;
    type: GenerationErrorType;
    failedEdit?: EditOperation;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorCorrection, setErrorCorrection] =
    useState<ErrorCorrectionContext | null>(null);
  const [lastAssistantSummary, setLastAssistantSummary] = useState<string | null>(
    null
  );
  const [lastAssistantMetadata, setLastAssistantMetadata] =
    useState<AssistantMetadata | null>(null);
  const markAsAiGeneratedRef = useRef<() => void>(() => {});

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
  const generateThumbnailUploadUrl = useMutation(
    api.presets.generateThumbnailUploadUrl
  );
  const getStorageUrl = useMutation(api.presets.getStorageUrl);
  const dispatchGeneration = useAction(api.aiGeneration.dispatch);

  // --- Parse generated schema + meta (pure JSON — no code execution) ---
  // The actual component code is executed ONLY inside the sandboxed iframe
  // via <SandboxedPresetPlayer />. Parsing JSON on the main thread is safe.
  const parsedPreset = useMemo((): {
    schema: PresetSchema;
    meta: PresetMeta;
    error: string | null;
  } | null => {
    if (
      !activeGeneration ||
      activeGeneration.status !== "complete" ||
      !activeGeneration.generatedCode ||
      !activeGeneration.generatedSchema ||
      !activeGeneration.generatedMeta
    ) {
      return null;
    }
    try {
      const schema = JSON.parse(activeGeneration.generatedSchema) as PresetSchema;
      const meta = JSON.parse(activeGeneration.generatedMeta) as PresetMeta;
      if (!meta.name || !meta.fps || !meta.width || !meta.height || !meta.durationInFrames) {
        return { schema, meta, error: "Meta is missing required fields" };
      }
      return { schema, meta, error: null };
    } catch (err) {
      return {
        schema: {},
        meta: {} as PresetMeta,
        error:
          "Could not parse generated schema/meta: " +
          (err instanceof Error ? err.message : String(err)),
      };
    }
  }, [activeGeneration]);

  // --- Merge defaults with user overrides ---
  const defaultProps = useMemo(() => {
    if (!parsedPreset?.schema) return {};
    const props: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(parsedPreset.schema)) {
      props[key] = field.default;
    }
    return props;
  }, [parsedPreset]);

  const inputProps = { ...defaultProps, ...userProps };
  const configuredOpenRouterModel = useMemo(
    () =>
      resolveOpenRouterModel(openRouterModelOverride, savedOpenRouterModel),
    [openRouterModelOverride, savedOpenRouterModel]
  );
  const missingProviderReason =
    provider === "claude"
      ? !hasAnthropicKey
        ? "Claude requires your Anthropic API key. Add it in Settings → API Keys."
        : null
      : provider === "openrouter"
        ? !hasOpenRouterKey
          ? "OpenRouter requires your API key. Add it in Settings → API Keys."
          : !configuredOpenRouterModel
            ? "OpenRouter requires a model id. Save one in Settings or set an override below."
            : null
        : null;
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
  const isGenerating = effectiveStatus === "generating";
  const canGenerate = !isGenerating && Boolean(prompt.trim()) && !missingProviderReason;

  const runGenerationRequest = useCallback(
    async ({
      promptText,
      parentGenerationId,
      currentCode,
      errorContext,
      silent = false,
    }: {
      promptText: string;
      parentGenerationId?: Id<"aiGenerations">;
      currentCode?: string;
      errorContext?: ErrorCorrectionContext;
      silent?: boolean;
    }) => {
      const trimmedPrompt = promptText.trim();
      if (!trimmedPrompt) {
        return false;
      }

      const buildUserContentParts = (): ConversationContentPart[] => {
        const parts: ConversationContentPart[] = [
          { type: "text", text: trimmedPrompt },
        ];

        if (referenceImageId || referenceImagePreview) {
          parts.push({
            type: "image",
            storageId: referenceImageId || undefined,
            imageUrl: referenceImagePreview ?? undefined,
            alt: "Reference image",
          });
        }

        return parts;
      };

      const userContentParts = buildUserContentParts();
      const pendingSkills = detectPromptSkills({
        prompt: trimmedPrompt,
        category: category === "auto" ? undefined : category,
      });

      setLocalStatus("generating");
      setLocalError(null);
      setGenerationError(null);
      setPreviewError(null);
      conversation.setPendingMessage(pendingSkills);

      if (!parentGenerationId) {
        setUserProps({});
      }

      const persistedCategory = category === "auto" ? undefined : category;
      const baseConversationHistory = conversation.getFullContext();
      const conversationHistory = parentGenerationId
        ? silent
          ? baseConversationHistory
          : [
              ...baseConversationHistory,
              {
                role: "user" as const,
                content: trimmedPrompt,
                contentParts: userContentParts,
              },
            ]
        : [];

      if (!silent) {
        conversation.addUserMessage(trimmedPrompt, userContentParts);
      }

      try {
        const genId = await createGeneration({
          userId,
          prompt: trimmedPrompt,
          category: persistedCategory,
          style: style === "auto" ? undefined : style,
          provider,
          referenceImageId: referenceImageId
            ? (referenceImageId as Id<"_storage">)
            : undefined,
          parentGenerationId,
        });

        setActiveGenerationId(genId);

        const result = (await dispatchGeneration({
          generationId: genId,
          prompt: trimmedPrompt,
          category,
          style,
          provider,
          parentGenerationId,
          currentCode,
          conversationHistory,
          hasManualEdits: conversation.hasManualEdits,
          errorCorrection: errorContext,
          previouslyUsedSkills: parentGenerationId
            ? conversation.getPreviouslyUsedSkills()
            : [],
          customSystemPrompt: customSystemPrompt.trim() || undefined,
          openRouterModelOverride:
            provider === "openrouter" && openRouterModelOverride.trim()
              ? openRouterModelOverride.trim()
              : undefined,
        })) as GenerationDispatchResult;

        if (!result.ok) {
          conversation.clearPendingMessage();
          setLocalStatus("failed");
          setLocalError(result.error);
          setGenerationError(
            result.errorType === "validation"
              ? null
              : {
                  message: result.error,
                  type: result.errorType,
                  failedEdit: result.failedEdit,
                }
          );
          conversation.addErrorMessage(
            result.error,
            result.errorType,
            result.failedEdit
          );
          return false;
        }

        conversation.clearPendingMessage();
        setLocalStatus("complete");
        setLocalError(null);
        setGenerationError(null);
        setErrorCorrection(null);
        setLastAssistantSummary(result.summary);
        setLastAssistantMetadata(result.metadata);
        conversation.addAssistantMessage(
          result.summary,
          result.componentCode,
          result.metadata
        );

        return true;
      } catch (err) {
        conversation.clearPendingMessage();
        const message =
          err instanceof Error ? err.message : "Failed to start generation";
        setLocalStatus("failed");
        setLocalError(message);
        setGenerationError({
          message,
          type: "api",
        });
        conversation.addErrorMessage(message, "api");
        return false;
      }
    },
    [
      category,
      conversation,
      createGeneration,
      customSystemPrompt,
      dispatchGeneration,
      openRouterModelOverride,
      provider,
      referenceImagePreview,
      referenceImageId,
      style,
      userId,
    ]
  );

  const { markAsAiGenerated } = useAutoCorrection({
    maxAttempts: 2,
    compilationError: parsedPreset?.error ?? previewError,
    generationError,
    isStreaming: isGenerating,
    isCompiling: false,
    hasGeneratedOnce:
      conversation.messages.some((message) => message.role === "assistant") ||
      Boolean(activeGeneration?.generatedCode),
    code: activeGeneration?.generatedCode ?? "",
    errorCorrection,
    onTriggerCorrection: (retryPrompt, nextErrorContext) => {
      if (!activeGenerationId) {
        return;
      }

      // Auto-correction is an AI-owned turn. Mark it before we enqueue the
      // retry so a user edit during the async gap does not steal authorship.
      markAsAiGeneratedRef.current();
      setErrorCorrection(nextErrorContext);
      void runGenerationRequest({
        promptText: retryPrompt,
        parentGenerationId: activeGenerationId,
        currentCode: activeGeneration?.generatedCode,
        errorContext: nextErrorContext,
        silent: true,
      });
    },
    onAddErrorMessage: (message, type, failedEdit) => {
      conversation.addErrorMessage(message, type, failedEdit);
    },
    onClearGenerationError: () => {
      setGenerationError(null);
      setLocalError(null);
    },
    onClearErrorCorrection: () => {
      setErrorCorrection(null);
    },
  });
  useEffect(() => {
    markAsAiGeneratedRef.current = markAsAiGenerated;
  }, [markAsAiGenerated]);

  // --- Handlers ---

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your motion graphic");
      return;
    }

    if (missingProviderReason) {
      toast.error(missingProviderReason);
      return;
    }

    const fieldsBlock = serializeCustomFields(customFields);
    const promptWithSchema = fieldsBlock
      ? `${prompt.trim()}\n${fieldsBlock}`
      : prompt;

    const success = await runGenerationRequest({
      promptText: promptWithSchema,
    });

    if (success) {
      markAsAiGenerated();
    }
  }, [
    missingProviderReason,
    markAsAiGenerated,
    prompt,
    customFields,
    runGenerationRequest,
  ]);

  const handleIterate = useCallback(async () => {
    if (!iterationPrompt.trim() || !activeGenerationId) return;

    const success = await runGenerationRequest({
      promptText: iterationPrompt,
      parentGenerationId: activeGenerationId,
      currentCode: activeGeneration?.generatedCode,
    });

    if (success) {
      markAsAiGenerated();
      setIterationPrompt("");
    }
  }, [
    activeGeneration?.generatedCode,
    activeGenerationId,
    iterationPrompt,
    markAsAiGenerated,
    runGenerationRequest,
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
      !parsedPreset ||
      parsedPreset.error ||
      !activeGeneration.generatedCode
    ) {
      return;
    }

    const { meta } = parsedPreset;
    const presetCategory = (meta.category ?? category) as
      | "intro"
      | "title"
      | "lower-third"
      | "cta"
      | "transition"
      | "outro"
      | "full"
      | "chart"
      | "map"
      | "social";

    const savingToast = toast.loading(
      publish ? "Rendering preview & publishing..." : "Saving to your library..."
    );

    try {
      // Generate a branded thumbnail so marketplace cards have a visible preview.
      let thumbnailUrl: string | undefined;
      try {
        const blob = await generatePresetThumbnail({
          name: meta.name,
          description: meta.description,
          category: presetCategory,
        });
        const uploadUrl = await generateThumbnailUploadUrl();
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (uploadRes.ok) {
          const { storageId } = (await uploadRes.json()) as {
            storageId: Id<"_storage">;
          };
          thumbnailUrl = await getStorageUrl({ storageId });
        }
      } catch (thumbErr) {
        // Non-fatal: still save the preset without a custom thumbnail.
        console.warn("Thumbnail generation failed:", thumbErr);
      }

      // authorId is derived server-side from the authenticated session.
      await createPreset({
        name: meta.name,
        description: meta.description,
        category: presetCategory,
        tags: meta.tags ?? [],
        bundleUrl: `ai://generated/${activeGenerationId}`,
        fps: meta.fps,
        width: meta.width,
        height: meta.height,
        durationInFrames: meta.durationInFrames,
        inputSchema: activeGeneration.generatedSchema!,
        sourceCode: activeGeneration.generatedCode,
        generationId: activeGenerationId!,
        thumbnailUrl,
        isPublic: publish,
        status: publish ? "published" : "draft",
      });

      // Honest note about the current render pipeline state. AI-generated
      // presets get a synthetic `ai://generated/...` bundle URL which the
      // Lambda serve URL doesn't know about yet — they preview correctly
      // (sandbox runtime) but can't be rendered remotely until the dynamic
      // bundle pipeline ships.
      toast.success(
        publish
          ? "Published to marketplace! Note: AI-generated presets preview live but remote rendering is not yet wired up for them."
          : "Saved to your library!",
        { id: savingToast }
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save preset",
        { id: savingToast }
      );
    }
  };

  const handleLoadGeneration = (genId: Id<"aiGenerations">) => {
    setActiveGenerationId(genId);
    setLocalStatus("idle");
    setLocalError(null);
    setGenerationError(null);
    setPreviewError(null);
    setErrorCorrection(null);
    setLastAssistantSummary(null);
    setLastAssistantMetadata(null);
    conversation.clearPendingMessage();
    setUserProps({});
  };

  // --- Derived state ---
  const isComplete =
    effectiveStatus === "complete" ||
    (activeGeneration?.status === "complete" && localStatus !== "generating");
  const isFailed = effectiveStatus === "failed";
  const hasPreview = isComplete && parsedPreset != null && !parsedPreset.error;
  const compileError = isComplete && (parsedPreset?.error ?? previewError);

  return (
    // Explicit viewport-minus-header height so the 3-column flex children
    // resolve h-full properly. The app shell's <main> uses
    // overflow-y-auto, which makes h-full collapse to content under the
    // hood — exactly what burned the preview stage before. Matches
    // workstation/page.tsx's pattern.
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 overflow-hidden">
        {/* ================================================================ */}
        {/* LEFT COLUMN - AI Generator Panel                                 */}
        {/* ================================================================ */}
        <div className="w-[300px] shrink-0 border-r border-border bg-background flex flex-col z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] h-full overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Header — provider status inline, no giant banner card */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    AI Generator
                  </h2>
                </div>
                <ProviderStatusChip
                  provider={provider}
                  hasGeminiKey={hasOwnGeminiKey}
                  hasAnthropicKey={hasAnthropicKey}
                  hasOpenRouterKey={hasOpenRouterKey}
                  openRouterModel={configuredOpenRouterModel}
                />
              </div>

              {/* Only surface a banner when the active provider is blocked.
                  BYOK-only: no "free tier" language, no competing marketing
                  variants. Missing key = one amber row with a Settings link. */}
              {missingProviderReason && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed flex items-start gap-1.5">
                  <Info className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                  <div className="flex-1 text-muted-foreground">
                    <span>{missingProviderReason}</span>{" "}
                    <Link
                      href="/settings"
                      className="text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap"
                    >
                      Settings →
                    </Link>
                  </div>
                </div>
              )}

              {/* Prompt — prose description of the visual intent */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Describe it
                </label>
                <Textarea
                  placeholder="A sleek title card with the company name animating in letter by letter..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[90px] bg-accent border-border text-sm resize-none placeholder:text-muted-foreground"
                  disabled={isGenerating}
                />
              </div>

              {/* Custom input fields — structured schema contract */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Custom input fields</span>
                  {customFields.filter((f) => f.name.trim()).length > 0 && (
                    <span className="text-[10px] text-amber-400/80">
                      {customFields.filter((f) => f.name.trim()).length} declared
                    </span>
                  )}
                </label>
                <CustomFieldsBuilder
                  fields={customFields}
                  onChange={setCustomFields}
                  disabled={isGenerating}
                />
              </div>

              {/* Type + Style on one row — the dropdowns already display
                  "Auto" as their value, so no need for duplicate "auto"
                  chips beside the labels. */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground">
                    Type
                  </label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as Category)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="bg-accent border-border text-sm">
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

                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground">
                    Style
                  </label>
                  <Select
                    value={style}
                    onValueChange={(v) => setStyle(v as Style)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="bg-accent border-border text-sm">
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

              {/* Advanced (collapsed by default — keeps the form clean) */}
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="w-full text-left text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center justify-between py-1"
              >
                <span>Advanced</span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${advancedOpen ? "rotate-90" : ""}`}
                />
              </button>

              {advancedOpen && (
                <div className="space-y-3 border-l-2 border-border/50 pl-3">
                  {/* Provider */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      AI Provider
                    </label>
                    <Select
                      value={provider}
                      onValueChange={(v) => setProvider(v as Provider)}
                      disabled={isGenerating}
                    >
                      <SelectTrigger className="bg-accent border-border text-sm">
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
                        <SelectItem value="openrouter">
                          <span className="flex items-center gap-2">
                            OpenRouter
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-sky-500/30 text-sky-400"
                            >
                              BYOK
                            </Badge>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* OpenRouter model override — only visible when OpenRouter is selected */}
                  {provider === "openrouter" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>OpenRouter model</span>
                        {openRouterModelOverride.trim() ? (
                          <span className="text-[10px] text-sky-400">override</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            from settings
                          </span>
                        )}
                      </label>
                      <Input
                        value={openRouterModelOverride}
                        onChange={(e) =>
                          setOpenRouterModelOverride(e.target.value)
                        }
                        placeholder="z-ai/glm-5.1"
                        className="bg-accent border-border font-mono text-xs"
                        disabled={isGenerating}
                        spellCheck={false}
                        autoComplete="off"
                      />
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Any model id from{" "}
                        <a
                          href="https://openrouter.ai/models"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300"
                        >
                          openrouter.ai/models
                        </a>
                        . Leave empty to use the default you saved in Settings.
                        Requires an OpenRouter key.
                      </p>
                    </div>
                  )}

                  {/* Reference Image */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Reference image
                    </label>
                    <ReferenceImageUpload
                      onUpload={setReferenceImageId}
                      onPreviewChange={setReferenceImagePreview}
                      storageId={referenceImageId || undefined}
                    />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Specific prop values aren&apos;t recommended — the style config
                      already matches our reference defaults.
                    </p>
                  </div>

                  {/* Custom system prompt — appended to the skill system prompt */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="custom-system-prompt"
                      className="text-xs font-medium text-muted-foreground flex items-center justify-between"
                    >
                      <span>Custom system prompt</span>
                      {customSystemPrompt.trim() && (
                        <span className="text-[10px] text-amber-400/80">active</span>
                      )}
                    </label>
                    <Textarea
                      id="custom-system-prompt"
                      placeholder="Extra instructions for the model. E.g. 'Always use pastel colors and avoid particle effects.'"
                      value={customSystemPrompt}
                      onChange={(e) => setCustomSystemPrompt(e.target.value)}
                      className="min-h-[80px] bg-accent border-border text-xs resize-y placeholder:text-muted-foreground"
                      disabled={isGenerating}
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Appended after the built-in skill prompts. Use it to nudge
                      tone, constraints, or house style.
                    </p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                onClick={handleGenerate}
                disabled={!canGenerate}
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

              {(lastAssistantSummary ||
                (lastAssistantMetadata?.skills &&
                  lastAssistantMetadata.skills.length > 0)) && (
                <div className="rounded-md border border-border bg-card/60 p-3 space-y-2">
                  {lastAssistantSummary && (
                    <p className="text-xs leading-relaxed text-foreground">
                      {lastAssistantSummary}
                    </p>
                  )}
                  {lastAssistantMetadata?.skills &&
                    lastAssistantMetadata.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lastAssistantMetadata.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[10px] border-amber-500/30 text-amber-300"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  {lastAssistantMetadata?.editType && (
                    <p className="text-[10px] text-muted-foreground">
                      {lastAssistantMetadata.editType === "tool_edit"
                        ? "Applied targeted follow-up edits."
                        : "Generated a full replacement preset variant."}
                    </p>
                  )}
                </div>
              )}

              {/* Iteration Section -- shown after first generation */}
              {(isComplete || isFailed) && (
                <>
                  <Separator className="bg-border" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Refine
                      </span>
                    </div>
                    <Textarea
                      placeholder="Make the text bigger, change animation to slide in from the left..."
                      value={iterationPrompt}
                      onChange={(e) => setIterationPrompt(e.target.value)}
                      className="min-h-[60px] bg-accent border-border text-sm resize-none placeholder:text-muted-foreground"
                      disabled={isGenerating}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-border text-muted-foreground hover:bg-accent"
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
                  <Separator className="bg-border" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
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
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
        <div className="flex-1 min-w-0 bg-background/50 flex flex-col relative h-full overflow-hidden">
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-hidden">
            {/* IDLE state */}
            {localStatus === "idle" && !activeGeneration && (
              <EmptyState />
            )}

            {/* GENERATING state */}
            {isGenerating && (
              <GeneratingState pendingMessage={conversation.pendingMessage} />
            )}

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
                error={parsedPreset?.error ?? "Failed to compile generated code"}
                onRetry={handleGenerate}
              />
            )}

            {/* SUCCESS — sandboxed live preview. Uses the exact
                workstation PlayerStage sizing pattern: aspect-ratio
                box + w-full h-auto + max-width/max-height 100% + flex
                shrink + margin auto. Grows to hit the first bound
                (width or height), preserves aspect, letterboxes when
                the stage is taller or wider than the composition. */}
            {hasPreview && parsedPreset && activeGeneration?.generatedCode && (
              <div
                style={{
                  aspectRatio: String(
                    parsedPreset.meta.width / parsedPreset.meta.height
                  ),
                  maxHeight: "100%",
                  maxWidth: "100%",
                  margin: "auto",
                }}
                className="relative rounded-lg overflow-hidden border border-border shadow-2xl bg-black w-full h-auto object-contain flex shrink"
              >
                <SandboxedPresetPlayer
                  code={activeGeneration.generatedCode}
                  schemaJson={activeGeneration.generatedSchema!}
                  metaJson={activeGeneration.generatedMeta!}
                  inputProps={inputProps}
                  aspectRatio={parsedPreset.meta.width / parsedPreset.meta.height}
                  className="w-full h-full"
                  onErrorChange={setPreviewError}
                />
              </div>
            )}
          </div>

          {/* Frame info strip — lives outside the stage row so the
              aspect-box can claim the full flex-1 hero without fighting
              with a second flex child for vertical space. */}
          {hasPreview && parsedPreset && (
            <div className="shrink-0 flex items-center justify-center gap-4 text-xs text-muted-foreground pb-3">
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3" />
                {parsedPreset.meta.durationInFrames} frames
              </span>
              <span>{parsedPreset.meta.fps} fps</span>
              <span>
                {parsedPreset.meta.width} x {parsedPreset.meta.height}
              </span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN - Controls + Code                                   */}
        {/* ================================================================ */}
        <div className="w-[320px] shrink-0 border-l border-border bg-background flex flex-col z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.5)] h-full overflow-hidden">
          {hasPreview && parsedPreset && activeGeneration?.generatedCode ? (
            <RightPanel
              schema={parsedPreset.schema}
              values={inputProps}
              code={activeGeneration.generatedCode}
              meta={parsedPreset.meta}
              onChange={handlePropChange}
              onReset={handleResetProps}
              onSave={() => void handleSave(false)}
              onPublish={() => void handleSave(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-muted-foreground text-center">
                Generate a preset to see controls and code here
              </p>
            </div>
          )}
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
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground truncate">
          {meta.name}
        </h3>
        {meta.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {meta.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="controls" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 bg-card border border-border">
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
              <p className="text-xs text-muted-foreground text-center py-4">
                No customizable properties
              </p>
            )}
          </ScrollArea>

          <div className="px-4 py-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground text-xs"
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
      <div className="p-4 border-t border-border space-y-2">
        <Button
          className="w-full bg-muted hover:bg-accent text-foreground"
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
      <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto">
        <Sparkles className="w-7 h-7 text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Create with AI
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
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
            className="text-xs border-border text-muted-foreground cursor-default"
          >
            {example}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function GeneratingState({
  pendingMessage,
}: {
  pendingMessage?: {
    skills?: string[];
    startedAt: number;
    statusText?: string;
  };
}) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto relative">
        <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Generating your motion graphic...
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          The AI is writing Remotion code for your preset. This usually takes
          15-30 seconds.
        </p>
      </div>
      {pendingMessage?.statusText && (
        <div className="space-y-2">
          <p className="text-xs text-amber-300">{pendingMessage.statusText}</p>
          {pendingMessage.skills && pendingMessage.skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {pendingMessage.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-[10px] border-amber-500/30 text-amber-300"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
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
        <h3 className="text-lg font-semibold text-foreground">
          Generation Failed
        </h3>
        <p className="text-sm text-red-400/80 mt-1">{error}</p>
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        className="border-border text-muted-foreground"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

/**
 * Small inline chip that replaces the old full-width BYOK banner. Shows
 * the active provider + key state in one line so the form doesn't lead
 * with a giant info card the user has to scroll past on every visit.
 */
function ProviderStatusChip({
  provider,
  hasGeminiKey,
  hasAnthropicKey,
  hasOpenRouterKey,
  openRouterModel,
}: {
  provider: Provider;
  hasGeminiKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenRouterKey: boolean;
  openRouterModel: string | undefined;
}) {
  const hasKey =
    provider === "gemini"
      ? hasGeminiKey
      : provider === "claude"
        ? hasAnthropicKey
        : hasOpenRouterKey && Boolean(openRouterModel);

  const label =
    provider === "gemini" ? "Gemini" : provider === "claude" ? "Claude" : "OpenRouter";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 h-5 text-[10px] font-medium ${
        hasKey
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
          : "border-amber-500/30 bg-amber-500/5 text-amber-400"
      }`}
      title={hasKey ? "Provider key set" : "Add key in Settings"}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          hasKey ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      {label}
    </span>
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
