import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A friendly, on-brand empty state: amber-ringed icon, title, short
 * explanation and an optional call to action (pass a <Button> / <Link>). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
        <Icon className="size-6 text-primary" aria-hidden />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-display text-lg font-semibold tracking-tight">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
