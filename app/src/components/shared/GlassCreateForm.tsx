"use client";

/**
 * GlassCreateForm — neuroform-inspired glass panel for "create folder /
 * project / collection" inline flows.
 *
 * Shared so the project and collection pages keep the exact same rhythm:
 * fade-up on open, translucent surface, generous padding, pill inputs,
 * soft accent wash keyed to the owning noun (amber for projects, violet
 * for collections). The actual form state + submit logic stays in the
 * parent — this component is pure presentation.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GlassAccent = "amber" | "violet";

const ACCENT_STYLES: Record<
  GlassAccent,
  {
    iconWrap: string;
    iconColor: string;
    focusRing: string;
    wash: string;
    submitBtn: string;
  }
> = {
  amber: {
    iconWrap: "bg-amber-500/10 ring-amber-500/20",
    iconColor: "text-amber-400",
    focusRing:
      "focus-visible:border-amber-500/60 focus-visible:ring-amber-500/25 focus-visible:bg-white/[0.06]",
    wash:
      "before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(245,158,11,0.10),transparent_60%)]",
    submitBtn:
      "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-lg shadow-amber-500/10",
  },
  violet: {
    iconWrap: "bg-violet-500/10 ring-violet-500/20",
    iconColor: "text-violet-400",
    focusRing:
      "focus-visible:border-violet-500/60 focus-visible:ring-violet-500/25 focus-visible:bg-white/[0.06]",
    wash:
      "before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(139,92,246,0.10),transparent_60%)]",
    submitBtn:
      "bg-violet-500 hover:bg-violet-400 text-zinc-50 font-semibold shadow-lg shadow-violet-500/15",
  },
};

interface GlassCreateFormProps {
  open: boolean;
  icon: LucideIcon;
  accent: GlassAccent;
  title: string;
  nameValue: string;
  onNameChange: (value: string) => void;
  namePlaceholder: string;
  descriptionValue: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder: string;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function GlassCreateForm({
  open,
  icon: Icon,
  accent,
  title,
  nameValue,
  onNameChange,
  namePlaceholder,
  descriptionValue,
  onDescriptionChange,
  descriptionPlaceholder,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: GlassCreateFormProps) {
  const s = ACCENT_STYLES[accent];

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="glass-create-form"
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`relative mb-6 rounded-3xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden ${s.wash}`}
        >
          {/* Top hairline highlight for the glass edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative p-6 md:p-7 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-2xl ring-1 flex items-center justify-center ${s.iconWrap}`}
              >
                <Icon className={`w-4.5 h-4.5 ${s.iconColor}`} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                  {title}
                </h2>
                <p className="text-[11px] text-zinc-500 tracking-wide uppercase font-medium">
                  Name + description
                </p>
              </div>
            </div>

            {/* Inputs — glassy pill look, stacked on narrow screens */}
            <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
              <input
                value={nameValue}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={namePlaceholder}
                className={`w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all hover:bg-white/[0.05] focus-visible:ring-2 ${s.focusRing}`}
              />
              <textarea
                value={descriptionValue}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder={descriptionPlaceholder}
                rows={3}
                className={`w-full min-h-[96px] rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none resize-none transition-all hover:bg-white/[0.05] focus-visible:ring-2 ${s.focusRing}`}
              />
            </div>

            {/* Actions — pill buttons, generous right-aligned stack */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
                className="rounded-full px-5 h-10 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]"
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className={`rounded-full px-6 h-10 ${s.submitBtn}`}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
