"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface MockBrandKit {
  id: string;
  name: string;
  colors: string[];
  fonts: string[];
  defaultCopy: Record<string, string>;
}

interface BrandKitPickerProps {
  onApplyKit?: (kit: MockBrandKit) => void;
}

const DEFAULT_PRIMARY = "#F59E0B";
const DEFAULT_SECONDARY = "#0F172A";

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Replaces the old two-preset picker (Solar Broadcast / Ocean Editorial)
 * with a true "pick your own" UX: two color swatches the user can tune,
 * then Apply to push the resulting kit into the preset inputs.
 *
 * Kept on the MockBrandKit contract so existing callers (InputControls'
 * `onApplyBrandKit`) don't change. Fonts and default copy fall back to
 * sensible values; this editor is intentionally scoped to what the user
 * cares about most in the workstation flyout — color.
 */
export function BrandKitPicker({ onApplyKit }: BrandKitPickerProps) {
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY);

  const primaryValid = HEX_RE.test(primary);
  const secondaryValid = HEX_RE.test(secondary);
  const canApply = primaryValid && secondaryValid;

  const handleApply = () => {
    if (!canApply || !onApplyKit) return;
    onApplyKit({
      id: `mk-custom-${Date.now()}`,
      name: "Custom Brand Kit",
      colors: [primary, secondary],
      fonts: ["Inter"],
      defaultCopy: {
        title: "Your Brand",
        subtitle: "Tagline goes here",
        cta: "Learn more",
      },
    });
  };

  return (
    <div className="mt-5 space-y-3 rounded-xl border border-border bg-card/60 p-3">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">Brand Kit</h3>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          Pick two colors — applied to matching preset inputs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorSlot
          label="Primary"
          value={primary}
          onChange={setPrimary}
          valid={primaryValid}
        />
        <ColorSlot
          label="Secondary"
          value={secondary}
          onChange={setSecondary}
          valid={secondaryValid}
        />
      </div>

      {/* Mini preview so the pair reads as a kit, not two fields */}
      <div className="flex items-center gap-2 px-0.5">
        <div className="flex items-center gap-1">
          <span
            className="size-5 rounded-full border border-black/20 shadow-inner"
            style={{ backgroundColor: primaryValid ? primary : "transparent" }}
          />
          <span
            className="size-5 rounded-full border border-black/20 shadow-inner -ml-2"
            style={{
              backgroundColor: secondaryValid ? secondary : "transparent",
            }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground truncate">
          {primary.toLowerCase()} · {secondary.toLowerCase()}
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={handleApply}
        disabled={!canApply}
      >
        Apply Mock Brand Kit
      </Button>
    </div>
  );
}

function ColorSlot({
  label,
  value,
  onChange,
  valid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  valid: boolean;
}) {
  // Native <input type="color"> only accepts full #rrggbb. If the text
  // field holds something like "#abc" or invalid content, we still want
  // the swatch to render, so resolve to a safe fallback.
  const safe = valid ? value : "#000000";
  return (
    <label className="space-y-1.5 block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} color picker`}
          className="w-9 h-9 rounded-md border border-border bg-transparent cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="#000000"
          className={`h-9 min-w-0 flex-1 rounded-md border bg-zinc-950 px-2 text-xs font-mono outline-none transition-colors ${
            valid
              ? "border-border focus:border-amber-500/50"
              : "border-red-500/40 focus:border-red-500/60"
          }`}
        />
      </div>
    </label>
  );
}
