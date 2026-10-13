import Link from "next/link";
import { Compass, Eye, Film, LibraryBig, Star, UserPlus } from "lucide-react";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { getTrendingMovies } from "@/lib/tmdb/server";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PosterWall } from "@/components/movie/poster-wall";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Formats + editions shown in the demo — all exist in the live media_types /
// edities lists (FilmVault/supabase/sql/media_types_and_edities.sql), so the
// demo only shows what the product can actually record.
const DEMO_RELEASES = [
  { type: "4K Ultra HD", editie: "Steelbook", watched: true },
  { type: "Blu-ray", editie: null, watched: true },
  { type: "DVD", editie: null, watched: false },
  { type: "Blu-ray", editie: "Collector's Edition", watched: true },
  { type: "4K Ultra HD", editie: null, watched: false },
  { type: "Blu-ray", editie: "Steelbook", watched: true },
];

// Public landing page. Logged-in visitors never see it: the auth middleware
// (lib/supabase/middleware.ts) sends them from "/" straight to /dashboard.
export default async function LandingPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const trending = await getTrendingMovies(locale).catch(() => null);
  const movies = (trending?.results ?? []).filter((m) => m.poster_path);

  const formats = ["Dvd", "Blu-ray", "4K UHD", "Steelbook", dict.landing_format_box];
  const steps = [
    { icon: UserPlus, title: dict.landing_step_register_title, description: dict.landing_step_register_description },
    { icon: LibraryBig, title: dict.landing_step_organize_title, description: dict.landing_step_organize_description },
    { icon: Compass, title: dict.landing_step_discover_title, description: dict.landing_step_discover_description },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
          <Logo markClassName="size-8" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost">
              <Link href="/login">{dict.landing_cta_login}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-cinema relative flex min-h-[88vh] items-center overflow-hidden">
        <PosterWall posters={movies.map((m) => m.poster_path)} />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-32 text-center md:px-8">
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {formats.map((f) => (
              <Badge key={f} variant="secondary" className="bg-elevated/80 backdrop-blur">
                {f}
              </Badge>
            ))}
          </div>
          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-7xl">
            {dict.landing_hero_title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">{dict.landing_hero_subtitle}</p>
          {/* One primary call to action; login is a quiet secondary link. */}
          <Button asChild size="lg" className="mt-10">
            <Link href="/register">{dict.landing_cta_register}</Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            {dict.landing_have_account}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {dict.landing_cta_login}
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight md:text-4xl">{dict.landing_steps_title}</h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex flex-col gap-3 rounded-card border border-border/70 bg-card p-6">
              <span className="absolute right-5 top-4 font-display text-5xl font-semibold text-primary/15">{i + 1}</span>
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                <step.icon className="size-5 text-primary" aria-hidden />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {movies.length >= DEMO_RELEASES.length && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{dict.landing_demo_title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{dict.landing_demo_subtitle}</p>
          </div>

          {/* Product demo built from the real UI components (illustrative data). */}
          <div aria-hidden className="relative mt-10 overflow-hidden rounded-card border border-border bg-background shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-card px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-muted-foreground/30" />
                <span className="size-2.5 rounded-full bg-muted-foreground/30" />
                <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              </div>
              <Badge variant="outline">{dict.landing_demo_example}</Badge>
            </div>
            <div className="flex flex-col gap-6 p-5 md:p-8">
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">{dict.landing_demo_collection_name}</p>
                <p className="text-sm text-muted-foreground">{format(dict.collections_film_count, 128)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile icon={Film} label={dict.films_label} value={128} />
                <StatTile
                  icon={Eye}
                  label={dict.watched_label}
                  value="71%"
                  hint={<Progress value={71} />}
                />
                <StatTile icon={Star} label="4K UHD" value={23} />
                <StatTile icon={LibraryBig} label="Steelbook" value={14} />
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 md:gap-4">
                {DEMO_RELEASES.map((release, i) => {
                  const movie = movies[i];
                  return (
                    <div key={movie.id} className="flex flex-col gap-2">
                      <Poster path={movie.poster_path} title={movie.title} size="sm">
                        <PosterCorner position="bl">
                          <Badge variant="overlay">{release.type === "4K Ultra HD" ? "4K UHD" : release.type}</Badge>
                        </PosterCorner>
                        {release.watched && (
                          <PosterCorner position="tr">
                            <Badge variant="overlay" className="px-1.5">
                              <Eye className="text-success" />
                            </Badge>
                          </PosterCorner>
                        )}
                      </Poster>
                      <p className="line-clamp-1 text-xs font-medium">{movie.title}</p>
                      {release.editie && <p className="-mt-1.5 text-[11px] text-primary">{release.editie}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Button asChild size="lg">
              <Link href="/register">{dict.landing_cta_register}</Link>
            </Button>
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <Logo markClassName="size-5" className="[&>span:last-child]:text-base" />
          <p className="max-w-xl">{dict.landing_tmdb_attribution}</p>
          <nav className="flex gap-4">
            <Link href="/gids" className="hover:text-foreground hover:underline">
              {dict.landing_guides_link}
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              {dict.privacy_policy_link}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
