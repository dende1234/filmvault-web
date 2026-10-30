import { formatParts } from "@/lib/formats";
import { cn } from "@/lib/utils";

type Band = { label: string; className: string };

/** The strip at the top of a disc case for this format: blue for Blu-ray,
 * black for 4K UHD (and 4K combos), dark grey for DVD and VHS. Generic
 * lettering, not the format owners' logos. null = no strip (unknown type). */
function bandFor(type: string | null | undefined): Band | null {
  const parts = formatParts(type).map((p) => p.toLowerCase());
  if (parts.length === 0) return null;
  const has4k = parts.some((p) => /4k|uhd|ultra ?hd/.test(p));
  const hasBluray = parts.some((p) => /blu.?ray/.test(p));
  const hasDvd = parts.some((p) => /dvd/.test(p));
  if (has4k) {
    const extra = [hasBluray ? "BLU-RAY" : null, hasDvd ? "DVD" : null].filter(Boolean).join(" + ");
    // Combos say "4K UHD" so the second format still fits on a narrow card.
    return { label: extra ? `4K UHD + ${extra}` : "4K ULTRA HD", className: "bg-gradient-to-b from-neutral-800 to-black text-white" };
  }
  if (hasBluray) return { label: hasDvd ? "Blu-ray + DVD" : "Blu-ray", className: "bg-gradient-to-b from-[#2f7ee0] to-[#0b4ea8] text-white" };
  if (hasDvd) return { label: "DVD", className: "bg-gradient-to-b from-neutral-600 to-neutral-800 text-white" };
  if (parts.some((p) => /vhs/.test(p))) return { label: "VHS", className: "bg-gradient-to-b from-neutral-700 to-neutral-900 text-white" };
  return null;
}

/** Put inside <Poster className="@container">: makes the poster read as the
 * physical case on the shelf. Sizes with the card (container query units).
 * Corner buttons on top of the poster should sit below it (top ≈ 13.5cqw). */
export function CaseBand({ type, className }: { type: string | null | undefined; className?: string }) {
  const band = bandFor(type);
  if (!band) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-[1] flex h-[9%] min-h-4 items-center justify-center gap-[3%] px-[4%] font-semibold tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        band.className,
        className,
      )}
      style={{ fontSize: "max(7px, 6cqw)" }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" className="h-[60%] w-auto shrink-0 opacity-90" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6.5" />
        <circle cx="8" cy="8" r="1.6" />
      </svg>
      <span className="truncate leading-none">{band.label}</span>
    </div>
  );
}

/** Whether a case strip exists for this type (callers hide the format badge then). */
export function hasCaseBand(type: string | null | undefined): boolean {
  return bandFor(type) !== null;
}
