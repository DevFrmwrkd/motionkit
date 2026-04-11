"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import type { PlayerRef } from "@remotion/player";
import { useRouter, useSearchParams } from "next/navigation";
import { PresetLibrary } from "@/components/workstation/PresetLibrary";
import { PreviewPanel } from "@/components/workstation/PreviewPanel";
import { TimelinePanel } from "@/components/workstation/TimelinePanel";
import { InputControls } from "@/components/workstation/InputControls";
import type { MockBrandKit } from "@/components/workstation/BrandKitPicker";
import { AddToProjectDialog } from "@/components/workstation/dialogs/AddToProjectDialog";
import { SavePresetDialog } from "@/components/workstation/dialogs/SavePresetDialog";
import { ForkButton } from "@/components/preset/ForkButton";
import { VersionHistory } from "@/components/preset/VersionHistory";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { presetRegistry } from "@/lib/preset-registry";
import type { SchemaField } from "@/lib/types";
// NOTE: we intentionally do NOT import codeToComponent here. All user- or
// AI-authored preset code is compiled + executed inside the sandboxed iframe
// rendered by <SandboxedPresetPlayer />. Running it on the main thread (as
// this file used to during fallback resolution) let any visible preset
// exfiltrate BYOK keys and session state.
import { isRenderableBundle } from "@/lib/renderableCompositions";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { EXPORT_FORMATS, type ExportFormatId } from "@/lib/export-formats";
import {
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkstationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100svh-3.5rem)] bg-background text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading workstation...
        </div>
      }
    >
      <WorkstationContent />
    </Suspense>
  );
}

function WorkstationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const presets = useQuery(api.presets.list, user ? { viewerId: user._id as Id<"users"> } : {});
  const urlSavedPresetId = searchParams.get("savedPresetId");
  const savedPreset = useQuery(
    api.savedPresets.get,
    urlSavedPresetId ? { id: urlSavedPresetId as Id<"savedPresets"> } : "skip"
  );
  const renderJobs = useQuery(
    api.renderJobs.listByUser,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );
  const urlPresetId = searchParams.get("presetId");
  const fallbackPresetId = useMemo(() => {
    if (!presets || presets.length === 0) {
      return null;
    }

    const previewablePreset = presets.find((preset) => canResolvePreset(preset));
    return previewablePreset?._id ?? presets[0]._id;
  }, [presets]);

  const effectivePresetId =
    urlPresetId || savedPreset?.presetId || fallbackPresetId;
  const activePreset = presets?.find((preset) => preset._id === effectivePresetId) ?? null;
  const workspaceKey = `${effectivePresetId ?? "empty"}:${urlSavedPresetId ?? "base"}`;

  // Panel collapse state — lets the user reclaim horizontal space on narrow
  // displays. Defaults to both panels open so first-time users see the full UI.
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleSelectPreset = (id: string) => {
    router.replace(`/workstation?presetId=${id}`);
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] overflow-hidden bg-background text-foreground font-sans">
      {leftPanelOpen && (
        <div className="w-[280px] shrink-0 border-r border-border bg-background flex flex-col z-10">
          {presets === undefined ? (
            <div className="p-4 text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <PresetLibrary
              presets={presets.map((preset) => ({
                _id: preset._id,
                name: preset.name,
                category: preset.category,
                description: preset.description || "",
                tags: preset.tags || [],
              }))}
              activePresetId={effectivePresetId ?? undefined}
              onSelectPreset={handleSelectPreset}
            />
          )}
        </div>
      )}

      <ActivePresetWorkspace
        key={workspaceKey}
        activePreset={activePreset}
        savedPreset={savedPreset ?? null}
        user={user}
        renderJobs={renderJobs ?? []}
        isLoadingJobs={renderJobs === undefined}
        urlSavedPresetId={urlSavedPresetId}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
        onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
      />
    </div>
  );
}

/**
 * Can this preset be previewed in the workstation?
 *
 * This MUST be a static check — it used to call codeToComponent() to test
 * compilation, which meant every preset visible in the library executed its
 * top-level code on page load. The sandboxed preview handles real errors at
 * display time instead.
 */
function canResolvePreset(preset: Doc<"presets">) {
  if (presetRegistry[preset.bundleUrl]) return true;
  return Boolean(preset.sourceCode && preset.inputSchema);
}

interface ActivePresetWorkspaceProps {
  activePreset: Doc<"presets"> | null;
  savedPreset: Doc<"savedPresets"> | null;
  user: Doc<"users"> | null;
  renderJobs: Doc<"renderJobs">[];
  isLoadingJobs: boolean;
  urlSavedPresetId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

function ActivePresetWorkspace({
  activePreset,
  savedPreset,
  user,
  renderJobs,
  isLoadingJobs,
  urlSavedPresetId,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
}: ActivePresetWorkspaceProps) {
  const router = useRouter();
  const createRenderJob = useMutation(api.renderJobs.create);
  const updatePreset = useMutation(api.presets.update);
  const dispatchRender = useAction(api.actions.renderWithLambda.dispatchRender);
  const [userProps, setUserProps] = useState<Record<string, unknown>>({});
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [ignoreSavedVariantProps, setIgnoreSavedVariantProps] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<ExportFormatId[]>([
    "16:9",
  ]);
  const [playerInstance, setPlayerInstance] = useState<PlayerRef | null>(null);
  const [timelineFrame, setTimelineFrame] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);

  const savedVariantProps = useMemo(() => {
    if (!savedPreset?.customProps) {
      return {};
    }

    try {
      return JSON.parse(savedPreset.customProps) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [savedPreset]);

  const isOwner = Boolean(
    activePreset && user && activePreset.authorId === user._id
  );

  const displayCode = editedCode ?? activePreset?.sourceCode ?? null;

  /**
   * Preset resolution is split by trust:
   *   - trustedPreset: shipped in the app bundle (presets/_template etc.).
   *     Safe to render directly — we authored it.
   *   - sandboxSource: raw sourceCode string that must be compiled + executed
   *     inside the null-origin iframe. Set for user/AI-generated presets
   *     and for any in-editor code edits.
   *
   * The workstation never runs codeToComponent() on the main thread anymore.
   */
  const trustedPreset = useMemo(() => {
    if (!activePreset) return null;
    // The editor overrides the static registry: if the user is editing code
    // live, always run it through the sandbox (see sandboxSource below).
    if (editedCode) return null;
    return presetRegistry[activePreset.bundleUrl] ?? null;
  }, [activePreset, editedCode]);

  const sandboxSource = useMemo(() => {
    if (!activePreset || !activePreset.inputSchema) return null;
    // Trusted registry presets render directly; no sandbox needed.
    if (trustedPreset) return null;
    const code = editedCode ?? activePreset.sourceCode;
    if (!code) return null;
    return code;
  }, [activePreset, editedCode, trustedPreset]);

  const isPreviewable = Boolean(trustedPreset || sandboxSource);

  const currentSchema = useMemo((): Record<string, SchemaField> | null => {
    if (!activePreset?.inputSchema) {
      return null;
    }

    try {
      return JSON.parse(activePreset.inputSchema) as Record<string, SchemaField>;
    } catch {
      return null;
    }
  }, [activePreset]);

  const defaultProps = useMemo(() => {
    const props: Record<string, unknown> = {};

    if (currentSchema) {
      for (const [key, field] of Object.entries(currentSchema)) {
        props[key] = (field as { default: unknown }).default;
      }
    }

    return props;
  }, [currentSchema]);

  const baseProps = useMemo(
    () => ({
      ...defaultProps,
      ...(ignoreSavedVariantProps ? {} : savedVariantProps),
    }),
    [defaultProps, ignoreSavedVariantProps, savedVariantProps]
  );

  const inputProps = useMemo(
    () => ({ ...baseProps, ...userProps }),
    [baseProps, userProps]
  );

  const currentMeta = activePreset
    ? {
        name: activePreset.name,
        fps: activePreset.fps,
        width: activePreset.width,
        height: activePreset.height,
        durationInFrames: activePreset.durationInFrames,
      }
    : null;

  const isRendering = useMemo(() => {
    if (!activePreset) {
      return false;
    }

    return renderJobs.some(
      (job) =>
        job.presetId === activePreset._id &&
        (job.status === "queued" || job.status === "rendering")
    );
  }, [activePreset, renderJobs]);

  useEffect(() => {
    if (!playerInstance) {
      return;
    }

    const syncFrame = () => {
      setTimelineFrame(playerInstance.getCurrentFrame());
      setTimelinePlaying(playerInstance.isPlaying());
    };

    const handleFrameUpdate = ({ detail }: { detail: { frame: number } }) => {
      setTimelineFrame(detail.frame);
    };
    const handleSeeked = ({ detail }: { detail: { frame: number } }) => {
      setTimelineFrame(detail.frame);
    };
    const handlePlay = () => setTimelinePlaying(true);
    const handlePause = () => setTimelinePlaying(false);
    const handleEnded = () => setTimelinePlaying(false);

    syncFrame();
    playerInstance.addEventListener("frameupdate", handleFrameUpdate);
    playerInstance.addEventListener("seeked", handleSeeked);
    playerInstance.addEventListener("play", handlePlay);
    playerInstance.addEventListener("pause", handlePause);
    playerInstance.addEventListener("ended", handleEnded);

    return () => {
      playerInstance.removeEventListener("frameupdate", handleFrameUpdate);
      playerInstance.removeEventListener("seeked", handleSeeked);
      playerInstance.removeEventListener("play", handlePlay);
      playerInstance.removeEventListener("pause", handlePause);
      playerInstance.removeEventListener("ended", handleEnded);
    };
  }, [playerInstance]);

  const handlePropChange = (key: string, value: unknown) => {
    setUserProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setUserProps({});
    setIgnoreSavedVariantProps(true);
    toast("Properties reset to defaults");
  };

  const handleApplyBrandKit = useCallback(
    (kit: MockBrandKit) => {
      if (!currentSchema) {
        return;
      }

      const nextProps: Record<string, unknown> = {};
      const fallbackTextColor = kit.colors[2] ?? kit.colors[1] ?? "#ffffff";

      for (const [key, field] of Object.entries(currentSchema)) {
        const normalizedKey = key.toLowerCase();

        if (field.type === "color") {
          if (normalizedKey.includes("background") || normalizedKey === "bgcolor") {
            nextProps[key] = kit.colors[0] ?? field.default;
            continue;
          }

          if (
            normalizedKey.includes("accent") ||
            normalizedKey.includes("primary") ||
            normalizedKey.includes("highlight")
          ) {
            nextProps[key] = kit.colors[1] ?? field.default;
            continue;
          }

          if (normalizedKey.includes("text")) {
            nextProps[key] = fallbackTextColor;
          }
        }

        if (field.type === "font") {
          nextProps[key] = kit.fonts[0] ?? field.default;
        }

        if (field.type === "text" && kit.defaultCopy[normalizedKey]) {
          nextProps[key] = kit.defaultCopy[normalizedKey];
        }
      }

      setUserProps((current) => ({ ...current, ...nextProps }));
      toast.success(`Applied ${kit.name}`, {
        description:
          "Mock brand kit merged into matching text, color, and font controls.",
      });
    },
    [currentSchema]
  );

  const handlePlayerRef = useCallback((instance: PlayerRef | null) => {
    setPlayerInstance(instance);
    if (!instance) {
      setTimelineFrame(0);
      setTimelinePlaying(false);
    }
  }, []);

  const handleToggleFormat = useCallback((formatId: ExportFormatId) => {
    setSelectedFormats((current) => {
      if (current.includes(formatId)) {
        return current.length === 1
          ? current
          : current.filter((candidate) => candidate !== formatId);
      }

      return [...current, formatId];
    });
  }, []);

  const handleForked = useCallback(
    (newPresetId: Id<"presets">) => {
      router.replace(`/workstation?presetId=${newPresetId}`);
    },
    [router]
  );

  const handleTimelineSeek = useCallback(
    (frame: number) => {
      if (playerInstance) {
        playerInstance.seekTo(frame);
      }
      setTimelineFrame(frame);
    },
    [playerInstance]
  );

  const handleTimelinePlayPause = useCallback(() => {
    if (!playerInstance) {
      return;
    }

    if (playerInstance.isPlaying()) {
      playerInstance.pause();
      return;
    }

    playerInstance.play();
  }, [playerInstance]);

  const handleTimelineJumpToStart = useCallback(() => {
    handleTimelineSeek(0);
  }, [handleTimelineSeek]);

  const handleTimelineJumpToEnd = useCallback(() => {
    handleTimelineSeek(Math.max((currentMeta?.durationInFrames ?? 1) - 1, 0));
  }, [currentMeta?.durationInFrames, handleTimelineSeek]);

  const handleSaveCode = async (code: string) => {
    // We no longer compile on the main thread to validate edits — the
    // sandboxed preview will surface any compile errors inline. The editor's
    // job is just to persist the new code and let the sandbox react.
    //
    // IMPORTANT: if the user owns this preset we MUST let any updatePreset
    // error propagate. Previously this handler caught and swallowed every
    // failure, which meant InputControls would treat the resolve as success,
    // flip the "Code saved" toast, and the edit would disappear on reload —
    // classic silent data loss. Now the sandbox preview still updates
    // optimistically, but a failed persist surfaces as a toast in
    // InputControls and the "Save" button stays dirty.
    if (!isOwner || !activePreset) {
      throw new Error("Only the preset owner can edit source code");
    }

    setEditedCode(code);

    // Server derives caller identity from the session — no userId arg.
    await updatePreset({
      id: activePreset._id as Id<"presets">,
      sourceCode: code,
    });
  };

  const handleRender = async () => {
    if (!user) {
      toast.error("Sign in to render presets");
      return;
    }

    if (!activePreset) {
      toast.error("Select a preset to render");
      return;
    }

    if (!isPreviewable || !currentMeta) {
      toast.error("This preset cannot be rendered right now");
      return;
    }

    // The Lambda serve URL only contains the statically-registered presets
    // from app/src/remotion/Root.tsx. User-imported and AI-generated presets
    // can be previewed (they run in the sandbox) but cannot yet be rendered
    // remotely. Tell the user honestly instead of queueing a job that will
    // fail with "composition not found".
    if (!isRenderableBundle(activePreset.bundleUrl)) {
      toast.error(
        "This preset can't be rendered yet — only the built-in presets are wired into the Lambda bundle. AI-generated and imported presets will be supported when dynamic bundle compilation ships."
      );
      return;
    }

    try {
      const formatsToRender = selectedFormats.length > 0 ? selectedFormats : ["16:9"];
      const jobIds = await Promise.all(
        formatsToRender.map(async (formatId) => {
          const format = EXPORT_FORMATS.find((candidate) => candidate.id === formatId);
          const jobId = await createRenderJob({
            userId: user._id as Id<"users">,
            presetId: activePreset._id as Id<"presets">,
            bundleUrl: activePreset.bundleUrl,
            inputProps: JSON.stringify({
              ...inputProps,
              __exportFormat: formatId,
              __exportDimensions: format
                ? {
                    width: format.width,
                    height: format.height,
                  }
                : undefined,
            }),
            renderEngine: "lambda",
          });

          return jobId;
        })
      );

      toast.success(
        jobIds.length === 1
          ? "Render queued"
          : `${jobIds.length} format renders queued`
      );

      void Promise.all(
        jobIds.map((jobId) =>
          dispatchRender({ jobId }).catch((err) => {
            toast.error(
              err instanceof Error ? err.message : "Render failed to start"
            );
          })
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue render");
    }
  };

  const handleSavedVariant = (savedPresetId: Id<"savedPresets">) => {
    router.replace(`/workstation?savedPresetId=${savedPresetId}`);
  };

  return (
    <>
      <div className="flex-1 min-w-0 bg-background/40 flex flex-col">
        {/* Workspace header — panel toggles on the edges, preset actions in
            the middle. Replaces the absolute-overlay action cluster that used
            to float over the video. */}
        <div className="h-11 shrink-0 border-b border-border bg-background flex items-center justify-between px-3 gap-3">
          <div className="flex items-center gap-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggleLeftPanel}
              aria-label={leftPanelOpen ? "Hide library" : "Show library"}
              aria-pressed={!leftPanelOpen}
            >
              {leftPanelOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </Button>
            {currentMeta?.name && (
              <span className="ml-1 text-sm font-medium text-foreground truncate">
                {currentMeta.name}
              </span>
            )}
          </div>

          {activePreset && user && (
            <div className="flex items-center gap-2 shrink-0">
              <AddToProjectDialog
                userId={user._id as Id<"users">}
                presetId={activePreset._id as Id<"presets">}
                savedPresetId={savedPreset?._id as Id<"savedPresets"> | undefined}
                triggerClassName="border-border text-muted-foreground hover:bg-accent gap-1.5"
              />
              <SavePresetDialog
                key={urlSavedPresetId ?? activePreset._id}
                userId={user._id as Id<"users">}
                presetId={activePreset._id as Id<"presets">}
                presetName={activePreset.name}
                customProps={inputProps}
                triggerClassName="border-border text-muted-foreground hover:bg-accent gap-1.5"
                onSaved={handleSavedVariant}
              />
              <ForkButton
                presetId={activePreset._id as Id<"presets">}
                userId={(user._id as Id<"users">) ?? null}
                onForked={handleForked}
                className="border-border text-muted-foreground hover:bg-accent gap-1.5"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onToggleRightPanel}
                aria-label={
                  rightPanelOpen ? "Hide controls" : "Show controls"
                }
                aria-pressed={!rightPanelOpen}
              >
                {rightPanelOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {(!activePreset || !user) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggleRightPanel}
              aria-label={
                rightPanelOpen ? "Hide controls" : "Show controls"
              }
              aria-pressed={!rightPanelOpen}
            >
              {rightPanelOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Pinned video stage — fills the available space aspect-aware. */}
        <div className="flex-1 flex flex-col min-h-0">
          <PreviewPanel
            trustedComponent={trustedPreset ? trustedPreset.component : null}
            sourceCode={sandboxSource}
            schemaJson={activePreset?.inputSchema ?? null}
            inputProps={inputProps}
            meta={currentMeta}
            renderJobs={renderJobs}
            isLoadingJobs={isLoadingJobs}
            playerRef={handlePlayerRef}
          />
        </div>

        <TimelinePanel
          presetName={currentMeta?.name || null}
          fps={currentMeta?.fps || 30}
          durationInFrames={currentMeta?.durationInFrames || 150}
          currentFrame={timelineFrame}
          isPlaying={timelinePlaying}
          isInteractive={Boolean(playerInstance)}
          onPlayPause={handleTimelinePlayPause}
          onSeek={handleTimelineSeek}
          onJumpToStart={handleTimelineJumpToStart}
          onJumpToEnd={handleTimelineJumpToEnd}
        />
      </div>

      {rightPanelOpen && (
        <div className="w-[360px] shrink-0 border-l border-border bg-background flex flex-col z-10 min-h-0">
          {activePreset ? (
            <VersionHistory presetId={activePreset._id as Id<"presets">} />
          ) : null}
          <InputControls
            key={`${urlSavedPresetId ?? activePreset?._id ?? "empty"}:${
              displayCode ?? "no-code"
            }`}
            schema={currentSchema}
            values={inputProps}
            onChange={handlePropChange}
            onReset={handleReset}
            onRender={handleRender}
            isRendering={isRendering}
            selectedFormats={selectedFormats}
            onToggleFormat={handleToggleFormat}
            onApplyBrandKit={handleApplyBrandKit}
            sourceCode={displayCode}
            canEditCode={isOwner}
            onSaveCode={isOwner ? handleSaveCode : undefined}
          />
        </div>
      )}
    </>
  );
}
