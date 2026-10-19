"use client";

import { Eye } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

/** Round "Bekeken" switch on a poster: one tap = watched, again = not
 * watched (no date; viewings with a date live in the copy or "Bekeken").
 * Watched stays visible; "not watched" only shows on hover on desktop. */
export function WatchedToggle({
  watched,
  onToggle,
  disabled,
  size = "md",
}: {
  watched: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useT();
  const label = t(watched ? "watched_toggle_off" : "watched_toggle_on");
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={watched}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center justify-center rounded-full backdrop-blur-sm transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        size === "sm" ? "size-6" : "size-8",
        watched
          ? "bg-success text-black shadow-md shadow-black/40"
          : "bg-black/65 text-white/90 hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100",
      )}
    >
      <Eye className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={watched ? 2.5 : 2} />
    </button>
  );
}

/** Places a control on the bottom-right of a poster that sits at the top of
 * a `relative` tile, without nesting it inside the poster's link: an overlay
 * with the poster's 2:3 shape, clickable only where the control is. */
export function PosterControl({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[2/3]">
      <div className="pointer-events-auto absolute bottom-1.5 right-1.5 z-10">{children}</div>
    </div>
  );
}
