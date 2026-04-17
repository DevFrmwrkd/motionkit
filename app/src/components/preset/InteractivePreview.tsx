"use client";

import { useMemo } from "react";
import { PresetPlayer } from "./PresetPlayer";
import { SandboxedPresetPlayer } from "./SandboxedPresetPlayer";
import { SchemaForm } from "./SchemaForm";
import { presetRegistry } from "@/lib/preset-registry";
import { usePresetProps } from "@/hooks/usePresetProps";
import type { PresetSchema } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";

interface InteractivePreviewProps {
  preset: {
    _id: string;
    name: string;
    bundleUrl?: string;
    sourceCode?: string | null;
    inputSchema?: string | null;
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
    category?: string;
    thumbnailUrl?: string;
  };
}

/**
 * Preset detail-page preview: live player on top, schema-driven
 * playground form below. Users can tweak inputs and see the render
 * update in real time before deciding to Remix.
 *
 * Player selection mirrors PresetCard:
 *   - Built-in (`local://presets/X`) → PresetPlayer via registry.
 *   - AI / user-authored with sourceCode → SandboxedPresetPlayer (iframe).
 *   - Otherwise → static fallback (thumbnail or gradient).
 */
export function InteractivePreview({ preset }: InteractivePreviewProps) {
  const builtIn = preset.bundleUrl ? presetRegistry[preset.bundleUrl] : undefined;

  // Parse schema JSON once. If malformed, degrade to an empty schema so
  // the player still mounts with defaults and the form just hides.
  const schema = useMemo<PresetSchema>(() => {
    if (!preset.inputSchema) return {} as PresetSchema;
    try {
      return JSON.parse(preset.inputSchema) as PresetSchema;
    } catch {
      return {} as PresetSchema;
    }
  }, [preset.inputSchema]);

  const hasSchemaFields = Object.keys(schema).length > 0;
  const { props, updateProp, resetProps } = usePresetProps(schema);

  // For built-in presets we prefer the registry's authoritative schema
  // (inline component defaults) over whatever was stored in Convex so the
  // form reflects the actual runtime contract.
  const effectiveSchema = builtIn ? (builtIn.schema as PresetSchema) : schema;
  const {
    props: builtInProps,
    updateProp: updateBuiltInProp,
    resetProps: resetBuiltInProps,
  } = usePresetProps(effectiveSchema);

  const canSandbox =
    !builtIn &&
    Boolean(
      preset.sourceCode &&
        preset.inputSchema &&
        preset.fps &&
        preset.width &&
        preset.height &&
        preset.durationInFrames,
    );

  const metaJson = useMemo(
    () =>
      JSON.stringify({
        name: preset.name,
        category: preset.category ?? "full",
        fps: preset.fps,
        width: preset.width,
        height: preset.height,
        durationInFrames: preset.durationInFrames,
      }),
    [
      preset.name,
      preset.category,
      preset.fps,
      preset.width,
      preset.height,
      preset.durationInFrames,
    ],
  );

  const aspect = (preset.width || 1920) / (preset.height || 1080);

  return (
    <div className="flex flex-col">
      {/* Player stage */}
      <div
        className="relative w-full bg-zinc-950 border-b border-zinc-800"
        style={{ aspectRatio: aspect }}
      >
        {builtIn ? (
          <PresetPlayer
            component={builtIn.component}
            inputProps={builtInProps}
            meta={builtIn.meta}
            className="w-full h-full"
          />
        ) : canSandbox ? (
          <SandboxedPresetPlayer
            code={preset.sourceCode as string}
            schemaJson={preset.inputSchema as string}
            metaJson={metaJson}
            inputProps={props}
            aspectRatio={aspect}
            className="w-full h-full"
          />
        ) : preset.thumbnailUrl ? (
          // No source code in DB and no built-in → fall back to thumbnail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preset.thumbnailUrl}
            alt={preset.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/30 text-zinc-600 text-sm">
            Preview unavailable
          </div>
        )}
      </div>

      {/* Playground form */}
      {hasSchemaFields || builtIn ? (
        <div className="flex flex-col bg-zinc-950/40">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Playground</span>
              <span className="text-zinc-500">— tweak inputs to preview live</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={builtIn ? resetBuiltInProps : resetProps}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
          <ScrollArea className="max-h-[360px]">
            <div className="p-4">
              <SchemaForm
                schema={effectiveSchema}
                values={builtIn ? builtInProps : props}
                onChange={builtIn ? updateBuiltInProp : updateProp}
              />
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
