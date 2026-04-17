"use client";

/**
 * MarketplaceSearchOverlay — Neuform/Raycast-style command-palette search.
 *
 * Instead of a small inline <Input/> in the toolbar, the trigger is a
 * pill button that opens a centered, full-viewport overlay. The input
 * grows in from the trigger (scale + fade), and the result list lives
 * directly under the query field so users never lose focus on what
 * they're searching for. Palette sticks to the DESIGN-REMIX-SPEC:
 * zinc-950 base, zinc-100 text, amber-500 ring/focus, no new colors.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

interface MarketplaceSearchOverlayProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export function MarketplaceSearchOverlay({
  value,
  onChange,
  resultCount,
}: MarketplaceSearchOverlayProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K opens the overlay, Escape closes it. Standard command-
  // palette ergonomics — lets power users keep their hands on the
  // keyboard without hunting for the search button.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus the input after the enter animation finishes.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  return (
    <>
      {/* Trigger — looks like an inline search bar so the toolbar
          rhythm is preserved, but acts as a button. Mirrors the current
          value so users can see their active query from the grid. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex-1 flex items-center gap-2.5 h-10 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-left hover:border-zinc-700 hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:border-amber-500/40 transition-colors"
      >
        <Search className="h-4 w-4 text-zinc-500 shrink-0" />
        <span
          className={`flex-1 truncate text-sm ${
            value ? "text-zinc-100" : "text-zinc-500"
          }`}
        >
          {value || "Search presets..."}
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
          <span className="text-[11px] leading-none">⌘</span>K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Scrim */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-zinc-950/80 backdrop-blur-sm"
            />

            {/* Centered overlay */}
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-24 -translate-x-1/2 z-[70] w-[min(92vw,720px)]"
            >
              <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-amber-500/10">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

                <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800/70">
                  <Search className="w-5 h-5 text-amber-400/80 shrink-0" />
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search the marketplace..."
                    className="flex-1 bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {value && (
                    <button
                      type="button"
                      onClick={() => onChange("")}
                      className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
                  >
                    Esc
                  </button>
                </div>

                <div className="px-5 py-3 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    {value.trim().length === 0
                      ? "Type to filter by name, description, or tag."
                      : typeof resultCount === "number"
                        ? `${resultCount} result${resultCount === 1 ? "" : "s"}`
                        : "Searching..."}
                  </span>
                  <span className="hidden sm:inline">
                    <kbd className="font-mono text-zinc-400">⌘K</kbd> to toggle
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
