"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export interface MockBrandKit {
  id: string;
  name: string;
  colors: string[];
  fonts: string[];
  defaultCopy: Record<string, string>;
}

const DEFAULT_BRAND_KITS: MockBrandKit[] = [
  {
    id: "mk-solar",
    name: "Solar Broadcast",
    colors: ["#111827", "#F59E0B", "#F8FAFC"],
    fonts: ["Geist", "Inter"],
    defaultCopy: {
      title: "Solar Broadcast",
      subtitle: "Weekly creator update",
      cta: "Watch now",
    },
  },
  {
    id: "mk-ocean",
    name: "Ocean Editorial",
    colors: ["#0F172A", "#22C55E", "#E2E8F0"],
    fonts: ["Georgia", "Inter"],
    defaultCopy: {
      title: "Ocean Editorial",
      subtitle: "Insights for motion teams",
      cta: "Explore the report",
    },
  },
];

interface BrandKitPickerProps {
  kits?: MockBrandKit[];
  onApplyKit?: (kit: MockBrandKit) => void;
}

export function BrandKitPicker({
  kits = DEFAULT_BRAND_KITS,
  onApplyKit,
}: BrandKitPickerProps) {
  const [selectedKitId, setSelectedKitId] = useState(kits[0]?.id ?? "");
  const selectedKit = useMemo(
    () => kits.find((kit) => kit.id === selectedKitId) ?? kits[0] ?? null,
    [kits, selectedKitId]
  );

  if (!selectedKit) {
    return null;
  }

  return (
    <div className="mt-5 space-y-2 rounded-xl border border-border bg-card/60 p-3">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">Brand Kit</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Mock UI shell until `brandKits` lands from schema-sync.
        </p>
      </div>

      <div className="grid gap-2">
        {kits.map((kit) => {
          const isSelected = kit.id === selectedKitId;
          return (
            <button
              key={kit.id}
              type="button"
              onClick={() => setSelectedKitId(kit.id)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "border-amber-500/60 bg-amber-500/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium">{kit.name}</span>
                <div className="flex items-center gap-1">
                  {kit.colors.map((color) => (
                    <span
                      key={color}
                      className="h-3 w-3 rounded-full border border-black/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1 text-[10px] opacity-80">
                {kit.fonts.join(" / ")}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => onApplyKit?.(selectedKit)}
      >
        Apply Mock Brand Kit
      </Button>
    </div>
  );
}
