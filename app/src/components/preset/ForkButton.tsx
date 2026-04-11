"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { GitFork, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ForkButtonProps {
  presetId: Id<"presets">;
  userId: Id<"users"> | null;
  onForked?: (newPresetId: Id<"presets">) => void;
  className?: string;
}

export function ForkButton({
  presetId,
  userId,
  onForked,
  className,
}: ForkButtonProps) {
  const clonePreset = useMutation(api.presets.clonePreset);
  const [isForking, setIsForking] = useState(false);

  const handleFork = async () => {
    if (!userId) {
      toast.error("Sign in to fork presets");
      return;
    }

    try {
      setIsForking(true);
      const newPresetId = await clonePreset({
        sourcePresetId: presetId,
        userId,
      });
      toast.success("Forked to your library");
      onForked?.(newPresetId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fork preset");
    } finally {
      setIsForking(false);
    }
  };

  return (
    <Button
      onClick={() => void handleFork()}
      variant="outline"
      size="sm"
      className={className}
      disabled={isForking}
    >
      {isForking ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <GitFork className="w-3.5 h-3.5" />
      )}
      Fork
    </Button>
  );
}
