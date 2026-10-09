import Image from "next/image";
import { backdropUrl } from "@/types/tmdb";
import { cn } from "@/lib/utils";

/** Full-bleed cinematic header: TMDB backdrop fading into the page
 * background (bottom + left gradients), with content laid over the lower
 * part. Breaks out of <main>'s padding (p-4 / md:p-8) on purpose. Without
 * a backdrop it degrades to the amber "auditorium" glow. */
export function BackdropHero({
  path,
  className,
  contentClassName,
  priority = true,
  children,
}: {
  path: string | null;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
  children: React.ReactNode;
}) {
  const src = backdropUrl(path, "w1280");
  return (
    <section className={cn("relative -mx-4 -mt-4 overflow-hidden md:-mx-8 md:-mt-8", className)}>
      <div className="absolute inset-0">
        {src ? (
          <Image src={src} alt="" fill priority={priority} sizes="100vw" className="object-cover object-top opacity-70" />
        ) : (
          <div className="bg-cinema size-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />
      </div>
      <div className={cn("relative mx-auto flex min-h-[22rem] max-w-6xl flex-col justify-end px-4 pb-8 pt-24 md:min-h-[30rem] md:px-8 md:pb-10", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
