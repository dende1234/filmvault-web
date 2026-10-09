import { cn } from "@/lib/utils";

/** Shimmer-free pulse block; shapes come from the caller's classes. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
