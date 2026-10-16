import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { getTrendingMovies } from "@/lib/tmdb/server";
import { Logo } from "@/components/brand/logo";
import { PosterWall } from "@/components/movie/poster-wall";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const trending = await getTrendingMovies(locale).catch(() => null);
  const posters = trending?.results.map((m) => m.poster_path) ?? [];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left: the cinema — poster wall + tagline (desktop only). */}
      <div className="bg-cinema relative hidden overflow-hidden border-r border-border/60 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <PosterWall posters={posters} />
        <Link href="/" className="relative">
          <Logo markClassName="size-8" />
        </Link>
        <div className="relative max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance">{dict.landing_hero_title}</p>
          <p className="mt-3 text-muted-foreground">{dict.landing_hero_subtitle}</p>
        </div>
      </div>

      {/* Right: the form. */}
      <div className="bg-cinema flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex justify-center lg:hidden">
            <Logo markClassName="size-8" />
          </Link>
          <div className="rounded-card border border-border/70 bg-card/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            {children}
          </div>
        </div>
        <Link href="/feedback?from=/auth" className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground hover:underline">
          {dict.feedback_visitor_link}
        </Link>
        <div className="mt-6 flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            {dict.privacy_policy_link}
          </Link>
        </div>
      </div>
    </div>
  );
}
