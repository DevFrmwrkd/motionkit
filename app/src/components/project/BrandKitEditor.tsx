"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Palette, Loader2, Type as TypeIcon, ImageIcon } from "lucide-react";
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
 * Glass-panel editor for a project's brand kit.
 *
 * Redesigned from the old zinc-card form to match the Neuform-inspired
 * design spec: translucent surface, amber accent wash, pill inputs, and
 * a live color preview strip so the palette reads as a *kit* rather
 * than a loose grid of fields. Color values still round-trip as hex
 * strings, so the Convex brandKit contract is unchanged.
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

  const colorValues = BRAND_KIT_COLOR_TOKENS.map(
    (token) => (kit[token] as string | undefined) ?? ""
  ).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(ellipse_90%_60%_at_0%_0%,rgba(245,158,11,0.10),transparent_60%)]"
    >
      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative p-6 md:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl ring-1 ring-amber-500/20 bg-amber-500/10 flex items-center justify-center">
              <Palette className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                Brand kit
              </h2>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                Auto-applied to matching preset inputs
              </p>
            </div>
          </div>

          {/* Live palette strip — reads as a "kit" at a glance */}
          {colorValues.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 pt-1">
              {colorValues.map((hex, i) => (
                <span
                  key={`${hex}-${i}`}
                  className="size-6 rounded-full ring-1 ring-black/30 shadow-inner"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          )}
        </div>

        {/* Identity */}
        <section className="space-y-3">
          <SectionLabel icon={<ImageIcon className="w-3 h-3" />} label="Identity" />
          <div className="grid md:grid-cols-2 gap-3">
            <GlassField
              label="Brand name"
              value={kit.brandName ?? ""}
              onChange={(v) => set("brandName", v)}
              placeholder="Acme"
            />
            <GlassField
              label="Logo URL"
              value={kit.logoUrl ?? ""}
              onChange={(v) => set("logoUrl", v)}
              placeholder="https://..."
            />
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-3">
          <SectionLabel
            icon={<Palette className="w-3 h-3" />}
            label="Colors"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BRAND_KIT_COLOR_TOKENS.map((token) => (
              <GlassColorField
                key={token}
                label={BRAND_KIT_TOKEN_LABELS[token]}
                value={(kit[token] as string | undefined) ?? ""}
                onChange={(v) => set(token, v)}
              />
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-3">
          <SectionLabel
            icon={<TypeIcon className="w-3 h-3" />}
            label="Typography"
          />
          <div className="grid md:grid-cols-2 gap-3">
            <GlassField
              label="Heading font"
              value={kit.fontHeading ?? ""}
              onChange={(v) => set("fontHeading", v)}
              placeholder="Inter"
            />
            <GlassField
              label="Body font"
              value={kit.fontBody ?? ""}
              onChange={(v) => set("fontBody", v)}
              placeholder="Inter"
            />
          </div>
        </section>

        {/* Action */}
        <div className="flex items-center justify-end pt-1">
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-full px-6 h-10 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-lg shadow-amber-500/10"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save brand kit
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-500">
      <span className="text-zinc-600">{icon}</span>
      {label}
    </div>
  );
}

function GlassField({
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
    <label className="block space-y-1.5">
      <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50 focus-visible:bg-white/[0.06] transition-colors"
      />
    </label>
  );
}

function GlassColorField({
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
    <label className="block space-y-1.5">
      <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
      <div className="flex items-center gap-2 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-1.5 pr-2 hover:bg-white/[0.05] focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500/50 transition-colors">
        <div className="relative size-7 rounded-lg overflow-hidden ring-1 ring-black/40 shrink-0 cursor-pointer">
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} color picker`}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <div
            className="size-full pointer-events-none"
            style={{ backgroundColor: value || "#18181b" }}
          />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          spellCheck={false}
          className="flex-1 min-w-0 h-full bg-transparent text-xs font-mono text-zinc-100 placeholder:text-zinc-500 outline-none"
        />
      </div>
    </label>
  );
}
