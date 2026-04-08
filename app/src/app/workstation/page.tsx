"use client";

import { PresetLibrary } from "@/components/workstation/PresetLibrary";
import { PreviewPanel } from "@/components/workstation/PreviewPanel";
import { InputControls } from "@/components/workstation/InputControls";

/**
 * Three-panel workstation layout.
 *
 * Phase 1: Hardcoded preset, local preview, render button.
 * The next agent should:
 * 1. Import the text-title preset and wire it to PresetPlayer
 * 2. Wire SchemaForm to usePresetProps
 * 3. Connect render button to Convex renderJobs.create
 * 4. Subscribe to render queue via useRenderQueue
 */
export default function WorkstationPage() {
  // TODO: Phase 1 -- wire up preset loading, props, and rendering
  return (
    <div className="flex h-screen">
      {/* Left: Preset Library */}
      <div className="w-[280px] shrink-0 border-r border-zinc-800 bg-zinc-950">
        <PresetLibrary presets={[]} onSelectPreset={() => {}} />
      </div>

      {/* Center: Preview + Render Queue */}
      <div className="flex-1 min-w-0 bg-zinc-950">
        <PreviewPanel
          component={null}
          inputProps={{}}
          meta={null}
          renderJobs={[]}
          isLoadingJobs={false}
        />
      </div>

      {/* Right: Input Controls */}
      <div className="w-[360px] shrink-0 border-l border-zinc-800 bg-zinc-950">
        <InputControls
          schema={null}
          values={{}}
          onChange={() => {}}
          onReset={() => {}}
          onRender={() => {}}
          isRendering={false}
          presetName={null}
        />
      </div>
    </div>
  );
}
