"use client";

import { cn } from "@/lib/utils";

interface PlanLimitBadgeProps {
  used: number;
  max: number | null | undefined;
  label?: string;
}

export function PlanLimitBadge({ used, max, label }: PlanLimitBadgeProps) {
  if (max === null || max === undefined) return null;

  const atLimit = used >= max;
  const nearLimit = !atLimit && used >= max * 0.8;

  return (
    <span className={cn(
      "text-xs px-2 py-0.5 rounded-full font-medium",
      atLimit  ? "bg-destructive/15 text-destructive"  :
      nearLimit ? "bg-amber-accent/15 text-amber-accent" :
                  "bg-surface-container-high text-on-surface-variant"
    )}>
      {label ? `${label}: ` : ""}{used} / {max}
    </span>
  );
}
