"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";

/** Horizontal, snap-scrolling row (dashboard shelves, cast, recommendations).
 * Swipe on touch; arrow buttons on hover-capable screens. Items size
 * themselves — wrap each in a fixed-width element (e.g. w-32 sm:w-36). */
export function PosterRail({
  title,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const scroller = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <section className={cn("group/rail flex flex-col gap-3", className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          {title && <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>}
          <div className="flex items-center gap-1">
            {action}
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground md:inline-flex"
              aria-label={t("action_previous")}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground md:inline-flex"
              aria-label={t("action_next")}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
      <div
        ref={scroller}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 pt-1 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {children}
      </div>
    </section>
  );
}

/** One fixed-width, snap-aligned slot in a PosterRail. */
export function RailItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("w-32 shrink-0 snap-start sm:w-36", className)}>{children}</div>;
}
