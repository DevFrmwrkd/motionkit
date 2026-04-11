"use client";

import type { ComponentType, ReactNode } from "react";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Smaller variant for list-embedded empty states. */
  compact?: boolean;
}

/**
 * Shared empty state for dashboard, projects, collections, and other
 * list-style surfaces. Keeps the hierarchy consistent: icon → title →
 * description → action.
 *
 * Previously every page rolled its own ad-hoc "py-20 text-center" block with
 * drifting copy size and no CTA. This component is the canonical version.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 ${
        compact ? "py-10" : "py-20"
      }`}
    >
      <div
        className={`rounded-xl bg-muted flex items-center justify-center mb-4 ${
          compact ? "w-11 h-11" : "w-14 h-14"
        }`}
      >
        <Icon
          className={`text-muted-foreground ${compact ? "w-5 h-5" : "w-6 h-6"}`}
        />
      </div>
      <h2
        className={`font-semibold text-foreground mb-1 ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-muted-foreground max-w-md ${
            compact ? "text-xs mb-3" : "text-sm mb-5"
          }`}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
