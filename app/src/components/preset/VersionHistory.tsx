"use client";

import { useState, useEffect } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { History, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VersionTree } from "@/components/preset/VersionTree";
import { VersionTimeline } from "@/components/preset/VersionTimeline";

interface VersionHistoryProps {
  presetId: Id<"presets">;
  currentVersionId?: Id<"presetVersions">;
  userId?: Id<"users">;
  isOwner?: boolean;
  defaultOpen?: boolean;
}

/**
 * Collapsible version history section with two tabs:
 * - Tree: Shows fork/branch graph (branches of the preset)
 * - Timeline: Shows version history of this specific preset with rollback
 */
export function VersionHistory({
  presetId,
  currentVersionId,
  userId,
  isOwner = false,
  defaultOpen = false,
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
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="mb-2 gap-0 h-max bg-transparent border border-border rounded p-0">
              <TabsTrigger
                value="timeline"
                className="text-[10px] py-1 px-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="tree"
                className="text-[10px] py-1 px-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
              >
                Tree
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="m-0">
              <VersionTimeline
                presetId={presetId}
                currentVersionId={currentVersionId}
                userId={userId}
                isOwner={isOwner}
              />
            </TabsContent>

            <TabsContent value="tree" className="m-0">
              <VersionTree presetId={presetId} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
