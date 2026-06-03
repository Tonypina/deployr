import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  trend?: string;
  /** 0-100 — renders a thin progress bar below the value */
  progress?: number;
  progressColor?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  color = "text-primary",
  trend,
  progress,
  progressColor,
}: StatsCardProps) {
  return (
    <div className="glass-card inner-glow p-5 flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between">
        <span className="font-label-caps text-on-surface-variant">{title}</span>
        <Icon className={cn("h-5 w-5 shrink-0", color)} />
      </div>
      <div>
        <p className="font-stat-value text-on-surface">{value}</p>

        {progress !== undefined && (
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-3 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", progressColor ?? color.replace("text-", "bg-"))}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {trend && (
          <p className="text-tertiary text-xs flex items-center gap-1 mt-1 font-medium">
            <span>↑</span>{trend}
          </p>
        )}
        {description && (
          <p className="text-xs text-on-surface-variant mt-1.5">{description}</p>
        )}
      </div>
    </div>
  );
}
