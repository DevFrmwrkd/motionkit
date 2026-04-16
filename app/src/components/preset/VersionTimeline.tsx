"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id, Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

interface VersionTimelineProps {
  presetId: Id<"presets">;
  currentVersionId?: Id<"presetVersions">;
  userId?: Id<"users">;
  isOwner?: boolean;
}

/**
 * Timeline of preset versions with rollback capability.
 * Shows version history of a single preset (not forks).
 */
export function VersionTimeline({
  presetId,
  currentVersionId,
  userId,
  isOwner = false,
}: VersionTimelineProps) {
  const versions = useQuery(api.presets.getVersionsForPreset, {
    presetId,
    viewerId: userId,
  });

  const revertToVersion = useMutation(api.presets.revertToVersion);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<Id<"presetVersions"> | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  if (!versions) {
    return (
      <div className="text-xs text-muted-foreground py-2">Loading versions...</div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">No versions yet</div>
    );
  }

  const selectedVersion = versions.find((v) => v._id === selectedVersionId);

  const handleRevertClick = (versionId: Id<"presetVersions">) => {
    setSelectedVersionId(versionId);
    setRevertConfirmOpen(true);
  };

  const handleConfirmRevert = async () => {
    if (!selectedVersionId || !userId) return;

    setIsReverting(true);
    try {
      await revertToVersion({
        presetId,
        versionId: selectedVersionId,
        userId,
      });

      setRevertConfirmOpen(false);
      setSelectedVersionId(null);
      toast.success("Preset reverted to this version");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revert version");
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <>
      <div className="space-y-1.5">
        {versions.map((version, idx) => {
          const isActive = currentVersionId === version._id;
          const createdDate = new Date(version.createdAt);
          const relativeTime = formatRelativeTime(version.createdAt);

          return (
            <div
              key={version._id}
              className={`flex items-start gap-2 p-2 rounded border transition-colors ${
                isActive
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-transparent hover:border-border hover:bg-accent/30"
              }`}
            >
              {/* Timeline dot */}
              <div className="mt-1 shrink-0">
                {isActive ? (
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border" />
                )}
              </div>

              {/* Version info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    v{version.versionNumber}
                  </span>
                  {isActive && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                      Current
                    </Badge>
                  )}
                  {idx === 0 && (
                    <Badge variant="outline" className="text-[10px] border-border">
                      Latest
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {relativeTime}
                </p>

                {version.changelog && (
                  <p className="text-[11px] text-foreground/70 mt-1 line-clamp-2">
                    {version.changelog}
                  </p>
                )}

                {/* Revert button */}
                {isOwner && !isActive && (
                  <button
                    onClick={() => handleRevertClick(version._id)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Revert
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Revert confirmation dialog */}
      <Dialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Revert to Version?</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedVersion && (
                <span>
                  This will restore your preset to version {selectedVersion.versionNumber}
                  {selectedVersion.changelog && ` ("${selectedVersion.changelog}")`}.
                  <br />
                  This action cannot be undone directly, but you can revert to another version later.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevertConfirmOpen(false)}
              disabled={isReverting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRevert}
              disabled={isReverting}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
            >
              {isReverting ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                  Revert to v{selectedVersion?.versionNumber}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Format a timestamp as relative time (e.g. "2 days ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
