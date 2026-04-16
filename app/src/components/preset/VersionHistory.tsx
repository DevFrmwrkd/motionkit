"use client";

import { useState, useEffect } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { History, ChevronDown } from "lucide-react";
import { VersionTree } from "@/components/preset/VersionTree";

interface VersionHistoryProps {
  presetId: Id<"presets">;
  defaultOpen?: boolean;
}

/**
 * Collapsible version history section.
 *
 * Previously stacked above InputControls without height management, which
 * pushed the tabs out of the viewport. Now ships as a compact collapsible
 * that the user opts into.
 */
export function VersionHistory({
  presetId,
  defaultOpen = true,
}: VersionHistoryProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Close version history when switching to a different preset
  useEffect(() => {
    setOpen(false);
  }, [presetId]);

  return (
    <div className="border-b border-border bg-card/30 shrink-0 min-h-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full h-9 px-4 flex items-center justify-between hover:bg-accent/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Version History
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          className="px-3 pr-3 pb-2 pt-1 min-h-[96px] max-h-[clamp(96px,18vh,160px)] overflow-y-scroll overscroll-contain custom-scrollbar"
          style={{ scrollbarGutter: "stable" }}
        >
          <VersionTree presetId={presetId} />
        </div>
      )}
    </div>
  );
}
