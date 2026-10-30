import Image from "next/image";
import { Film } from "lucide-react";
import { posterUrl } from "@/types/tmdb";
import { coverUrl } from "@/lib/covers";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: { tmdb: "w200", sizes: "48px" },
  sm: { tmdb: "w200", sizes: "(max-width: 640px) 30vw, 140px" },
  md: { tmdb: "w342", sizes: "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px" },
  lg: { tmdb: "w500", sizes: "(max-width: 640px) 60vw, 320px" },
} as const;

/** The one way a film poster is drawn: 2:3, rounded, subtle ring + shadow,
 * a titled fallback when TMDB has no poster, and an optional overlay slot
 * (format / watched / rating badges) in the corners. */
export function Poster({
  path,
  customCover,
  title,
  size = "md",
  className,
  priority,
  hover = false,
  style,
  children,
}: {
  path: string | null;
  /** Storage path of the user's own cover for this copy; wins over TMDB. */
  customCover?: string | null;
  title: string;
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
  /** Lift + amber ring on hover of the nearest `group` ancestor. */
  hover?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const config = SIZES[size];
  const src = coverUrl(customCover) ?? posterUrl(path, config.tmdb);
  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-lg bg-elevated shadow-md shadow-black/30 ring-1 ring-white/5",
        hover &&
          "transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/50 group-hover:ring-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-primary",
        className,
      )}
      style={style}
    >
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes={config.sizes}
          priority={priority}
          className={cn("object-cover", hover && "transition-transform duration-500 group-hover:scale-105")}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-elevated to-muted p-3 text-center">
          <Film className="size-6 text-muted-foreground/60" aria-hidden />
          {size !== "xs" && <span className="line-clamp-3 text-xs font-medium text-muted-foreground">{title}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Corner positions for badges inside <Poster>. */
export function PosterCorner({
  position,
  className,
  children,
}: {
  position: "tl" | "tr" | "bl" | "br";
  /** E.g. move a top badge below a CaseBand strip. */
  className?: string;
  children: React.ReactNode;
}) {
  const pos = { tl: "left-1.5 top-1.5", tr: "right-1.5 top-1.5", bl: "bottom-1.5 left-1.5", br: "bottom-1.5 right-1.5" }[position];
  return <div className={cn("absolute z-10 flex gap-1", pos, className)}>{children}</div>;
}
