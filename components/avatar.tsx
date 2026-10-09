import { cn } from "@/lib/utils";

function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Round avatar with an initials fallback. Avatar URLs come from arbitrary
 * hosts (Supabase storage, OAuth providers), so this stays a plain <img>
 * rather than next/image with a remotePatterns allowlist. */
export function Avatar({
  src,
  name,
  className,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-xs font-semibold text-muted-foreground ring-1 ring-border",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
