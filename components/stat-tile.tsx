import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Big-number tile for dashboard / recap stats. */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border border-border/70 bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 text-primary" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint}
    </div>
  );
}
