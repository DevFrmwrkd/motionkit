"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PresetLibrary } from "@/components/workstation/PresetLibrary";
import { PreviewPanel } from "@/components/workstation/PreviewPanel";
import { TimelinePanel } from "@/components/workstation/TimelinePanel";
import { InputControls } from "@/components/workstation/InputControls";
import { AddToProjectDialog } from "@/components/workstation/dialogs/AddToProjectDialog";
import { SavePresetDialog } from "@/components/workstation/dialogs/SavePresetDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { presetRegistry } from "@/lib/preset-registry";
import { codeToComponent } from "@/lib/code-to-component";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { GitFork, Loader2 } from "lucide-react";
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

  const handleSelectPreset = (id: string) => {
    router.replace(`/workstation?presetId=${id}`);
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] overflow-hidden bg-background text-foreground font-sans">
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

      <ActivePresetWorkspace
        key={workspaceKey}
        activePreset={activePreset}
        savedPreset={savedPreset ?? null}
        user={user}
        renderJobs={renderJobs ?? []}
        isLoadingJobs={renderJobs === undefined}
        urlSavedPresetId={urlSavedPresetId}
      />
    </div>
  );
}

function canResolvePreset(preset: Doc<"presets">) {
  if (presetRegistry[preset.bundleUrl]) {
    return true;
  }

  if (!preset.sourceCode || !preset.inputSchema) {
    return false;
  }

  const result = codeToComponent(
    preset.sourceCode,
    preset.inputSchema,
    JSON.stringify({
      name: preset.name,
      fps: preset.fps,
      width: preset.width,
      height: preset.height,
      durationInFrames: preset.durationInFrames,
      category: preset.category,
    })
  );

  return !!result.preset;
}

interface ActivePresetWorkspaceProps {
  activePreset: Doc<"presets"> | null;
  savedPreset: Doc<"savedPresets"> | null;
  user: Doc<"users"> | null;
  renderJobs: Doc<"renderJobs">[];
  isLoadingJobs: boolean;
  urlSavedPresetId: string | null;
}

function ActivePresetWorkspace({
  activePreset,
  savedPreset,
  user,
  renderJobs,
  isLoadingJobs,
  urlSavedPresetId,
}: ActivePresetWorkspaceProps) {
  const router = useRouter();
  const clonePreset = useMutation(api.presets.clonePreset);
  const createRenderJob = useMutation(api.renderJobs.create);
  const updatePreset = useMutation(api.presets.update);
  const dispatchRender = useAction(api.actions.renderWithLambda.dispatchRender);
  const [userProps, setUserProps] = useState<Record<string, unknown>>({});
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [ignoreSavedVariantProps, setIgnoreSavedVariantProps] = useState(false);

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

  const activePresetMetaJson = useMemo(() => {
    if (!activePreset) {
      return null;
    }

    return JSON.stringify({
      name: activePreset.name,
      fps: activePreset.fps,
      width: activePreset.width,
      height: activePreset.height,
      durationInFrames: activePreset.durationInFrames,
      category: activePreset.category,
    });
  }, [activePreset]);

  const displayCode = editedCode ?? activePreset?.sourceCode ?? null;

  const resolvedPreset = useMemo(() => {
    if (!activePreset) {
      return null;
    }

    if (editedCode && activePreset.inputSchema && activePresetMetaJson) {
      const result = codeToComponent(
        editedCode,
        activePreset.inputSchema,
        activePresetMetaJson
      );
      return result.preset;
    }

    const staticPreset = presetRegistry[activePreset.bundleUrl];
    if (staticPreset) {
      return staticPreset;
    }

    if (activePreset.sourceCode && activePreset.inputSchema && activePresetMetaJson) {
      const result = codeToComponent(
        activePreset.sourceCode,
        activePreset.inputSchema,
        activePresetMetaJson
      );
      return result.preset;
    }

    return null;
  }, [activePreset, activePresetMetaJson, editedCode]);

  const currentSchema = useMemo(() => {
    if (!activePreset?.inputSchema) {
      return null;
    }

    try {
      return JSON.parse(activePreset.inputSchema);
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

  const handlePropChange = (key: string, value: unknown) => {
    setUserProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setUserProps({});
    setIgnoreSavedVariantProps(true);
    toast("Properties reset to defaults");
  };

  const handleClone = async () => {
    if (!activePreset || !user) {
      toast.error("Sign in to clone presets");
      return;
    }

    try {
      const newId = await clonePreset({
        sourcePresetId: activePreset._id as Id<"presets">,
        userId: user._id as Id<"users">,
      });
      toast.success("Preset cloned to your library!");
      router.replace(`/workstation?presetId=${newId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone");
    }
  };

  const handleSaveCode = async (code: string) => {
    if (activePreset?.inputSchema && activePresetMetaJson) {
      const result = codeToComponent(code, activePreset.inputSchema, activePresetMetaJson);

      if (result.error) {
        throw new Error(result.error);
      }
    }

    setEditedCode(code);

    if (activePreset && user && activePreset.authorId === user._id) {
      try {
        await updatePreset({
          id: activePreset._id as Id<"presets">,
          userId: user._id as Id<"users">,
          sourceCode: code,
        });
      } catch {
        // Keep the optimistic local preview even if persistence fails.
      }
    }
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

    if (!resolvedPreset || !currentMeta) {
      toast.error("This preset cannot be rendered right now");
      return;
    }

    try {
      const inputPropsJson = JSON.stringify(inputProps);
      const jobId = await createRenderJob({
        userId: user._id as Id<"users">,
        presetId: activePreset._id as Id<"presets">,
        bundleUrl: activePreset.bundleUrl,
        inputProps: inputPropsJson,
        renderEngine: "modal",
      });

      toast.success("Render queued");

      void dispatchRender({
        jobId,
        bundleUrl: activePreset.bundleUrl,
        inputProps: inputPropsJson,
        userId: user._id as Id<"users">,
      }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Render failed to start");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue render");
    }
  };

  const handleSavedVariant = (savedPresetId: Id<"savedPresets">) => {
    router.replace(`/workstation?savedPresetId=${savedPresetId}`);
  };

  return (
    <>
      <div className="flex-1 min-w-0 bg-background/50 flex flex-col relative">
        <div className="flex-1 flex flex-col min-h-0">
          <PreviewPanel
            component={resolvedPreset ? resolvedPreset.component : null}
            inputProps={inputProps}
            meta={currentMeta}
            renderJobs={renderJobs}
            isLoadingJobs={isLoadingJobs}
          />
        </div>

        {activePreset && user && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <AddToProjectDialog
              userId={user._id as Id<"users">}
              presetId={activePreset._id as Id<"presets">}
              savedPresetId={savedPreset?._id as Id<"savedPresets"> | undefined}
              triggerClassName="border-border text-muted-foreground hover:bg-accent gap-1.5 bg-background/90"
            />
            <SavePresetDialog
              key={urlSavedPresetId ?? activePreset._id}
              userId={user._id as Id<"users">}
              presetId={activePreset._id as Id<"presets">}
              presetName={activePreset.name}
              customProps={inputProps}
              triggerClassName="border-border text-muted-foreground hover:bg-accent gap-1.5 bg-background/90"
              onSaved={handleSavedVariant}
            />
            <Button
              onClick={handleClone}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-accent gap-1.5 bg-background/90"
            >
              <GitFork className="w-3.5 h-3.5" />
              Clone
            </Button>
          </div>
        )}

        <TimelinePanel
          presetName={currentMeta?.name || null}
          fps={currentMeta?.fps || 30}
          durationInFrames={currentMeta?.durationInFrames || 150}
        />
      </div>

      <div className="w-[360px] shrink-0 border-l border-border bg-background flex flex-col z-10">
        <InputControls
          key={urlSavedPresetId ?? activePreset?._id ?? "empty"}
          schema={currentSchema}
          values={inputProps}
          onChange={handlePropChange}
          onReset={handleReset}
          onRender={handleRender}
          isRendering={isRendering}
          presetName={currentMeta?.name || null}
          sourceCode={displayCode}
          onSaveCode={handleSaveCode}
        />
      </div>
    </>
  );
}
