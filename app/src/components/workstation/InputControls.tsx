"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SchemaForm } from "@/components/preset/SchemaForm";
import { CodePreview } from "@/components/ai/CodePreview";
import { RotateCcw, Play, Code2, Sliders, Pencil, Save, Check } from "lucide-react";
import { toast } from "sonner";
import type { PresetSchema } from "@/lib/types";

interface InputControlsProps {
  schema: PresetSchema | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  onRender: () => void;
  isRendering: boolean;
  presetName: string | null;
  sourceCode?: string | null;
  onSaveCode?: (code: string) => void;
}

/**
 * Right panel: tabs for Controls, Code view, and Code editor.
 */
export function InputControls({
  schema,
  values,
  onChange,
  onReset,
  onRender,
  isRendering,
  presetName,
  sourceCode,
  onSaveCode,
}: InputControlsProps) {
  const [editableCode, setEditableCode] = useState(sourceCode ?? "");
  const [codeChanged, setCodeChanged] = useState(false);

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Select a preset to customize
      </div>
    );
  }

  const handleCodeChange = (code: string) => {
    setEditableCode(code);
    setCodeChanged(true);
  };

  const handleSaveCode = () => {
    if (onSaveCode) {
      onSaveCode(editableCode);
      setCodeChanged(false);
      toast.success("Code saved — preview updated");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-200 truncate pr-2">
          {presetName}
        </h2>
        <button
          onClick={onReset}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          title="Reset to defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="controls" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 shrink-0 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="controls" className="text-xs gap-1">
            <Sliders className="w-3 h-3" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs gap-1">
            <Code2 className="w-3 h-3" />
            Code
          </TabsTrigger>
          {sourceCode && (
            <TabsTrigger value="edit" className="text-xs gap-1">
              <Pencil className="w-3 h-3" />
              Edit
            </TabsTrigger>
          )}
        </TabsList>

        {/* Controls Tab */}
        <TabsContent value="controls" className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="px-4 py-4">
              <SchemaForm schema={schema} values={values} onChange={onChange} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Code View Tab */}
        <TabsContent value="code" className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4">
              {sourceCode ? (
                <CodePreview code={sourceCode} />
              ) : (
                <div className="text-sm text-zinc-500 text-center py-8">
                  <p>No source code available for this preset.</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Only AI-generated and imported presets show source code.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Code Edit Tab */}
        {sourceCode && (
          <TabsContent value="edit" className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <p className="text-xs text-zinc-500 mb-3">
                  Edit the component code below. Changes apply when you save.
                </p>
                <Textarea
                  value={editableCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="font-mono text-xs bg-zinc-900 border-zinc-800 min-h-[400px] resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </ScrollArea>
            {onSaveCode && (
              <div className="p-4 border-t border-zinc-800 shrink-0">
                <Button
                  onClick={handleSaveCode}
                  disabled={!codeChanged}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold"
                  size="sm"
                >
                  {codeChanged ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save & Update Preview
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
          </TabsContent>
        )}
      </Tabs>

      {/* Render button — always visible at bottom */}
      <div className="p-4 border-t border-zinc-800 shrink-0">
        <Button
          onClick={onRender}
          disabled={isRendering}
          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRendering ? "Rendering..." : "Render"}
        </Button>
      </div>
    </div>
  );
}
