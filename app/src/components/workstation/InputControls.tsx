"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchemaForm } from "@/components/preset/SchemaForm";
import { RotateCcw, Play } from "lucide-react";
import type { PresetSchema } from "@/lib/types";

interface InputControlsProps {
  schema: PresetSchema | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  onRender: () => void;
  isRendering: boolean;
  presetName: string | null;
}

/**
 * Right panel: schema-driven input controls + render button.
 */
export function InputControls({
  schema,
  values,
  onChange,
  onReset,
  onRender,
  isRendering,
  presetName,
}: InputControlsProps) {
  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Select a preset to customize
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">{presetName}</h2>
        <button
          onClick={onReset}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1 px-4 py-4">
        <SchemaForm schema={schema} values={values} onChange={onChange} />
      </ScrollArea>

      {/* Render button */}
      <div className="p-4 border-t border-zinc-800">
        <Button
          onClick={onRender}
          disabled={isRendering}
          className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRendering ? "Rendering..." : "Render"}
        </Button>
      </div>
    </div>
  );
}
