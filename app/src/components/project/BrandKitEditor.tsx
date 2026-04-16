"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BRAND_KIT_COLOR_TOKENS,
  BRAND_KIT_TOKEN_LABELS,
  type BrandKit,
} from "../../../../shared/brandKit";

interface BrandKitEditorProps {
  projectId: Id<"projects">;
  initial?: BrandKit;
}

/**
 * Inline editor for a project's brand kit. Shown on the project detail
 * view so the user can set project-scoped tokens once and have them
 * auto-applied to every preset opened inside the project.
 *
 * Kept as a simple form — a proper color-picker/font-picker flow can
 * replace the text inputs later without changing the Convex contract.
 */
export function BrandKitEditor({ projectId, initial }: BrandKitEditorProps) {
  const [kit, setKit] = useState<BrandKit>(initial ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const updateBrandKit = useMutation(api.projects.updateBrandKit);

  const set = <K extends keyof BrandKit>(key: K, value: string) => {
    setKit((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBrandKit({ projectId, brandKit: kit });
      toast.success("Brand kit saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Brand kit</h2>
          <span className="text-[11px] text-muted-foreground">
            Auto-applied to matching preset inputs inside this project.
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Brand name"
            value={kit.brandName ?? ""}
            onChange={(v) => set("brandName", v)}
            placeholder="Acme"
          />
          <Field
            label="Logo URL"
            value={kit.logoUrl ?? ""}
            onChange={(v) => set("logoUrl", v)}
            placeholder="https://..."
          />
        </div>

        <div>
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Colors
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {BRAND_KIT_COLOR_TOKENS.map((token) => (
              <ColorField
                key={token}
                label={BRAND_KIT_TOKEN_LABELS[token]}
                value={(kit[token] as string | undefined) ?? ""}
                onChange={(v) => set(token, v)}
              />
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Heading font"
            value={kit.fontHeading ?? ""}
            onChange={(v) => set("fontHeading", v)}
            placeholder="Inter"
          />
          <Field
            label="Body font"
            value={kit.fontBody ?? ""}
            onChange={(v) => set("fontBody", v)}
            placeholder="Inter"
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save brand kit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm h-9 bg-zinc-950 border-border"
        placeholder={placeholder}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000";
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8 font-mono bg-zinc-950 border-border"
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
}
