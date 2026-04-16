"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SchemaForm } from "@/components/preset/SchemaForm";
import { CodePreview } from "@/components/ai/CodePreview";
import {
  BrandKitPicker,
  type MockBrandKit,
} from "@/components/workstation/BrandKitPicker";
import { SavePresetDialog } from "@/components/workstation/dialogs/SavePresetDialog";
import { EXPORT_FORMATS, type ExportFormatId } from "@/lib/export-formats";
import {
  RotateCcw,
  Play,
  Code2,
  Sliders,
  Save,
  Check,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { PresetSchema } from "@/lib/types";
import type { Id, Doc } from "@convex/_generated/dataModel";
import { VariantsDropdown } from "@/components/workstation/VariantsDropdown";

interface InputControlsProps {
  schema: PresetSchema | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  onRender: () => void;
  isRendering: boolean;
  selectedFormats: ExportFormatId[];
  onToggleFormat: (formatId: ExportFormatId) => void;
  onApplyBrandKit?: (kit: MockBrandKit) => void;
  sourceCode?: string | null;
  canEditCode?: boolean;
  onSaveCode?: (code: string) => Promise<void> | void;
  /** Saved variants of the current preset */
  variants?: Doc<"savedPresets">[] | undefined;
  currentVariantId?: string;
  onSelectVariant?: (variant: Doc<"savedPresets">) => void;
  onSaveNewVariant?: (name: string) => Promise<void>;
}

/**
 * Right rail: schema controls, export formats, and optional code view/editor.
 *
 * Sections are presented in a clear hierarchy:
 *   1. Variants — switch between saved customizations (P1-7)
 *   2. Parameters — the primary task
 *   3. Brand Kit — optional polish layer
 *   4. Export Formats — picked before hitting render
 *   5. Code — view or edit the underlying preset source
 *
 * The render button is pinned to the bottom so it never scrolls away.
 */
export function InputControls({
  schema,
  values,
  onChange,
  onReset,
  onRender,
  isRendering,
  selectedFormats,
  onToggleFormat,
  onApplyBrandKit,
  sourceCode,
  canEditCode = false,
  onSaveCode,
  variants,
  currentVariantId,
  onSelectVariant,
  onSaveNewVariant,

}: InputControlsProps) {
  const [editableCode, setEditableCode] = useState(sourceCode ?? "");
  const [codeChanged, setCodeChanged] = useState(false);
  const [codeMode, setCodeMode] = useState<"view" | "edit">("view");

  // Track the last sourceCode we've seen so we can reset editor state when
  // the parent switches presets (or otherwise swaps the source). This uses
  // the "adjust state during render" pattern from React docs — it's the
  // officially recommended fix for deriving state from a changing prop
  // without an effect, and avoids the cascading-render lint.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lastSourceCode, setLastSourceCode] = useState(sourceCode);
  if (lastSourceCode !== sourceCode) {
    setLastSourceCode(sourceCode);
    setEditableCode(sourceCode ?? "");
    setCodeChanged(false);
    // Default back to view mode when switching presets — less surprising than
    // dropping the user straight into an editor for a preset they may not own.
    setCodeMode("view");
  }

  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-3">
          <Sliders className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No controls</p>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          Select a preset to see its customizable parameters.
        </p>
      </div>
    );
  }

  const handleCodeChange = (code: string) => {
    setEditableCode(code);
    setCodeChanged(true);
  };

  const handleSaveCode = async () => {
    if (!onSaveCode || !canEditCode || !codeChanged) {
      return;
    }

    try {
      await onSaveCode(editableCode);
      setCodeChanged(false);
      toast.success("Code saved — preview updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save code");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Header — variants dropdown on left, reset button on right */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 shrink-0">
            Controls
          </h2>
          {onSelectVariant && onSaveNewVariant && (
            <VariantsDropdown
              variants={variants}
              currentVariantId={currentVariantId}
              onSelectVariant={onSelectVariant}
              onSaveNewVariant={onSaveNewVariant}
            />
          )}
        </div>
        <button
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Reset to defaults"
          aria-label="Reset to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="controls"
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <TabsList className="mx-3 mt-2 shrink-0 bg-card border border-border h-max gap-0">
          <TabsTrigger value="controls" className="text-[10px] py-1 px-2 gap-1 h-7">
            <Sliders className="w-3 h-3" />
            Controls
          </TabsTrigger>
          {sourceCode && (
            <TabsTrigger value="code" className="text-[10px] py-1 px-2 gap-1 h-7">
              <Code2 className="w-3 h-3" />
              Code
            </TabsTrigger>
          )}
        </TabsList>

        {/* Controls tab */}
        <TabsContent value="controls" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 py-3 space-y-4">
              {/* Parameters */}
              <section>
                <SectionLabel
                  title="Parameters"
                  description="Tweak the preset inputs in real time."
                />
                <div className="mt-2">
                  <SchemaForm
                    schema={schema}
                    values={values}
                    onChange={onChange}
                  />
                </div>
              </section>

              {/* Brand kit */}
              <section>
                <SectionLabel
                  title="Brand Kit"
                  description="Apply a saved palette, font, and copy in one click."
                />
                <div className="mt-2">
                  <BrandKitPicker onApplyKit={onApplyBrandKit} />
                </div>
              </section>

              {/* Export formats */}
              <section className="pb-1">
                <SectionLabel
                  title="Export Formats"
                  description="Pick one or more aspect ratios to render."
                />
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {EXPORT_FORMATS.map((format) => {
                    const isSelected = selectedFormats.includes(format.id);
                    return (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => onToggleFormat(format.id)}
                        aria-pressed={isSelected}
                        className={`rounded border px-2 py-1.5 text-left transition-colors ${
                          isSelected
                            ? "border-amber-500/60 bg-amber-500/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{format.id}</div>
                        <div className="text-[9px] opacity-80">
                          {format.label} · {format.width}×{format.height}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Code tab — view/edit toggled via segmented control */}
        {sourceCode && (
          <TabsContent value="code" className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-2 shrink-0 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setCodeMode("view")}
                  className={`px-3 h-7 flex items-center gap-1.5 transition-colors ${
                    codeMode === "view"
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={codeMode === "view"}
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
                {canEditCode && (
                  <button
                    type="button"
                    onClick={() => setCodeMode("edit")}
                    className={`px-3 h-7 flex items-center gap-1.5 border-l border-border transition-colors ${
                      codeMode === "edit"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={codeMode === "edit"}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
              {!canEditCode && (
                <span className="text-[10px] text-muted-foreground">
                  Read-only
                </span>
              )}
            </div>

            {codeMode === "view" ? (
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 pb-4">
                  <CodePreview code={sourceCode} />
                </div>
              </ScrollArea>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-4 pb-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Edit the component code. Save to update the preview.
                    </p>
                    <Textarea
                      value={editableCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="font-mono text-xs bg-card border-border min-h-[400px] resize-y leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                </ScrollArea>
                {onSaveCode && (
                  <div className="p-4 border-t border-border shrink-0">
                    <Button
                      onClick={handleSaveCode}
                      disabled={!codeChanged}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      size="sm"
                    >
                      {codeChanged ? (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save &amp; Update Preview
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Up to date
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Render button — always visible at bottom */}
      <div className="relative z-10 bg-background p-3 border-t border-border shrink-0">
        <Button
          onClick={onRender}
          disabled={isRendering}
          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRendering
            ? "Rendering..."
            : selectedFormats.length > 1
              ? `Render ${selectedFormats.length} formats`
              : "Render"}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          {description}
        </p>
      )}
    </div>
  );
}
