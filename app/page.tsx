import Link from "next/link";
import { Barcode, Bookmark, LibraryBig, Users } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { getTrendingMovies } from "@/lib/tmdb/server";
import { Logo } from "@/components/brand/logo";
import { PosterWall } from "@/components/movie/poster-wall";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";

// Public landing page. Logged-in visitors never see it: the auth middleware
// (lib/supabase/middleware.ts) sends them from "/" straight to /dashboard.
export default async function LandingPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const trending = await getTrendingMovies(locale).catch(() => null);
  const movies = (trending?.results ?? []).filter((m) => m.poster_path);

  const features = [
    { icon: Barcode, title: dict.landing_feature_scan_title, description: dict.landing_feature_scan_description },
    { icon: LibraryBig, title: dict.landing_feature_collections_title, description: dict.landing_feature_collections_description },
    { icon: Bookmark, title: dict.landing_feature_wishlist_title, description: dict.landing_feature_wishlist_description },
    { icon: Users, title: dict.landing_feature_social_title, description: dict.landing_feature_social_description },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
          <Logo markClassName="size-8" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">{dict.landing_cta_login}</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/register">{dict.landing_cta_register}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-cinema relative flex min-h-[92vh] items-center overflow-hidden">
        <PosterWall posters={movies.map((m) => m.poster_path)} />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-32 text-center md:px-8">
          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-7xl">
            {dict.landing_hero_title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">{dict.landing_hero_subtitle}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">{dict.landing_cta_register}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">{dict.landing_cta_login}</Link>
            </Button>
          </div>
        </div>
      </section>

      {movies.length > 0 && (
        <section aria-hidden className="relative -mt-24 overflow-hidden pb-16">
          {/* A "shelf" of this week's trending posters. */}
          <div className="mx-auto flex max-w-6xl justify-center gap-3 px-4 md:gap-4 md:px-8">
            {movies.slice(0, 7).map((movie, i) => (
              <Poster
                key={movie.id}
                path={movie.poster_path}
                title={movie.title}
                size="sm"
                className="w-24 shrink-0 shadow-2xl shadow-black/60 sm:w-32 md:w-36"
                style={{ transform: `translateY(${Math.abs(3 - i) * 0.75}rem)` }}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 py-24 md:px-8">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight md:text-4xl">{dict.landing_features_title}</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3 rounded-card border border-border/70 bg-card p-6">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                <feature.icon className="size-5 text-primary" aria-hidden />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex justify-center">
          <Button asChild size="lg">
            <Link href="/register">{dict.landing_cta_register}</Link>
          </Button>
        </div>
      </section>

      <footer className="mt-auto border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <Logo markClassName="size-5" className="[&>span:last-child]:text-base" />
          <p className="max-w-xl">{dict.landing_tmdb_attribution}</p>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            {dict.privacy_policy_link}
          </Link>
        </div>
      </footer>
    </div>
  );
}
