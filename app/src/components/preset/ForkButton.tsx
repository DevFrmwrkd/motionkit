"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  label?: ReactNode;
  stopPropagation?: boolean;
}

export function ForkButton({
  presetId,
  userId,
  onForked,
  className,
  variant = "outline",
  size = "sm",
  label = "Remix",
  stopPropagation = false,
}: ForkButtonProps) {
  const router = useRouter();
  const clonePreset = useMutation(api.presets.clonePreset);
  const [isForking, setIsForking] = useState(false);

  const handleFork = async (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!userId) {
      toast.error("Sign in to remix presets");
      return;
    }

    try {
      setIsForking(true);
      const newPresetId = await clonePreset({
        sourcePresetId: presetId,
        userId,
      });
      toast.success("Remixed to your library", {
        description: "Your fork is ready to edit.",
        action: {
          label: "Open Fork →",
          onClick: () => {
            router.push(`/workstation?presetId=${newPresetId}`);
          },
        },
      });
      onForked?.(newPresetId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remix preset"
      );
    } finally {
      setIsForking(false);
    }
  };

  return (
    <Button
      onClick={(event) => void handleFork(event)}
      variant={variant}
      size={size}
      className={className}
      disabled={isForking}
    >
      {isForking ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <GitFork className="w-3.5 h-3.5" />
      )}
      {label}
    </Button>
  );
}
