import Image from "next/image";
import { posterUrl } from "@/types/tmdb";
import { cn } from "@/lib/utils";

/** Decorative, slightly tilted wall of posters that fades into the page —
 * the backdrop for the landing hero and the auth screens. Purely visual:
 * hidden from assistive tech, no links. */
export function PosterWall({ posters, className }: { posters: (string | null)[]; className?: string }) {
  const paths = posters.filter((p): p is string => !!p).slice(0, 24);
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -inset-x-1/4 -top-1/4 grid rotate-[-8deg] grid-cols-4 gap-3 opacity-45 sm:grid-cols-6">
        {paths.map((path, i) => (
          <div
            key={`${path}-${i}`}
            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-elevated"
            style={{ transform: `translateY(${(i % 2) * 2.5}rem)` }}
          >
            <Image src={posterUrl(path, "w342")!} alt="" fill sizes="160px" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_85%)]" />
    </div>
  );
}
