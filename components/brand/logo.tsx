import { cn } from "@/lib/utils";

/** The FilmVault mark: a film reel that doubles as a vault door — outer
 * ring, six reel windows, a hub, and a handle bar across the hub. Drawn in
 * the amber primary so it reads on both themes. */
export function LogoMark({ className }: { className?: string }) {
  const windows = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    return { cx: 16 + Math.cos(angle) * 7.5, cy: 16 + Math.sin(angle) * 7.5 };
  });
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 text-primary", className)}>
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {windows.map((w, i) => (
        <circle key={i} cx={w.cx} cy={w.cy} r="2.6" fill="currentColor" />
      ))}
      <circle cx="16" cy="16" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Mark + "FilmVault" wordmark (display serif, "Vault" in amber). */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-xl font-semibold tracking-tight">
        Film<span className="text-primary">Vault</span>
      </span>
    </span>
  );
}
