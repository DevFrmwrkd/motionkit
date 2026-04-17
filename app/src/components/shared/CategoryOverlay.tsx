/**
 * CategoryOverlay — the gradient + geometric-SVG fallback used as a preset
 * "thumbnail when we have nothing else to show." Kept identical to the
 * PresetCard marketplace look so thumbnails feel consistent across
 * marketplace, creator profile, render history, and anywhere else a preset
 * needs a static tile.
 */

import React from "react";

const CATEGORY_GRADIENTS: Record<string, string> = {
  intro: "from-zinc-900/40 via-zinc-950 to-zinc-950",
  title: "from-zinc-900/40 via-zinc-950 to-zinc-950",
  "lower-third": "from-teal-900/70 via-emerald-950 to-zinc-950",
  cta: "from-orange-900/70 via-amber-950 to-zinc-950",
  transition: "from-pink-900/70 via-rose-950 to-zinc-950",
  outro: "from-indigo-900/70 via-blue-950 to-zinc-950",
  full: "from-amber-900/70 via-yellow-950 to-zinc-950",
  chart: "from-emerald-900/70 via-green-950 to-zinc-950",
  map: "from-cyan-900/70 via-sky-950 to-zinc-950",
  social: "from-rose-900/70 via-pink-950 to-zinc-950",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  intro: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <polygon points="35,20 75,50 35,80" fill="currentColor" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  title: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <text x="50" y="58" textAnchor="middle" fontSize="40" fontWeight="bold" fill="currentColor">Aa</text>
      <line x1="20" y1="75" x2="80" y2="75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  "lower-third": (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="10" y="60" width="80" height="20" rx="4" fill="currentColor" />
      <line x1="15" y1="67" x2="55" y2="67" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <line x1="15" y1="73" x2="40" y2="73" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </svg>
  ),
  cta: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="20" y="35" width="60" height="30" rx="15" fill="currentColor" />
      <line x1="40" y1="50" x2="55" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <polygon points="55,44 65,50 55,56" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  transition: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="10" y="25" width="35" height="50" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="55" y="25" width="35" height="50" rx="3" fill="currentColor" opacity="0.3" />
      <path d="M45,50 L55,44 L55,56 Z" fill="currentColor" />
    </svg>
  ),
  outro: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="42" y="40" width="16" height="20" rx="2" fill="currentColor" />
    </svg>
  ),
  full: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="15" y="20" width="70" height="60" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="15" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="1" />
      <rect x="20" y="40" width="25" height="15" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="50" y="40" width="30" height="15" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="20" y="55" width="12" height="25" rx="2" fill="currentColor" />
      <rect x="37" y="35" width="12" height="45" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="54" y="45" width="12" height="35" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="71" y="25" width="12" height="55" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <path d="M50,20 C50,20 75,45 75,58 C75,72 63,80 50,80 C37,80 25,72 25,58 C25,45 50,20 50,20Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="55" r="8" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  social: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <circle cx="35" cy="40" r="12" fill="currentColor" opacity="0.5" />
      <circle cx="65" cy="40" r="12" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="65" r="12" fill="currentColor" opacity="0.4" />
      <line x1="35" y1="40" x2="65" y2="40" stroke="currentColor" strokeWidth="1" />
      <line x1="35" y1="40" x2="50" y2="65" stroke="currentColor" strokeWidth="1" />
      <line x1="65" y1="40" x2="50" y2="65" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

export function CategoryOverlay({
  category,
  compact = false,
}: {
  category: string;
  compact?: boolean;
}) {
  const gradient =
    CATEGORY_GRADIENTS[category] ?? "from-zinc-900 via-zinc-950 to-zinc-950";
  const geoIcon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS["full"];
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <div className={compact ? "w-[60%] h-[60%]" : "w-[70%] h-[70%] max-w-[200px] max-h-[200px]"}>
          {geoIcon}
        </div>
      </div>
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: compact ? "10px 10px" : "20px 20px",
        }}
      />
    </div>
  );
}
