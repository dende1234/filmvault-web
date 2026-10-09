import { cn } from "@/lib/utils";

/** Responsive poster wall: 2 → 6 columns. Children are poster tiles. */
export function PosterGrid({ className, dense = false, children }: { className?: string; dense?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-6",
        dense ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
