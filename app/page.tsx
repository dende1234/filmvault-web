import Link from "next/link";
import { Compass, LibraryBig, UserPlus, ScanBarcode, Store, FileUp } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { getTrendingMovies } from "@/lib/tmdb/server";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PosterWall } from "@/components/movie/poster-wall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewsletterSignup } from "@/components/newsletter-signup";

// Public landing page. Logged-in visitors never see it: the auth proxy
// (lib/supabase/proxy.ts) sends them from "/" straight to /dashboard.
export default async function LandingPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const trending = await getTrendingMovies(locale).catch(() => null);
  const movies = (trending?.results ?? []).filter((m) => m.poster_path);

  const formats = ["Dvd", "Blu-ray", "4K UHD", "Steelbook", dict.landing_format_box, dict.landing_format_series];
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
          <Button asChild variant="secondary" className="mt-3"><Link href="/voorbeeld">{dict.demo_try}</Link></Button>
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
        <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">{dict.landing_demo_title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">{dict.landing_demo_subtitle}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: ScanBarcode, title: dict.onboarding_scan, text: dict.landing_scan_benefit },
            { icon: Store, title: dict.shop_nav, text: dict.landing_shop_benefit },
            { icon: FileUp, title: dict.onboarding_import, text: dict.landing_import_benefit },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-card border border-border bg-card p-5">
              <Icon className="mb-3 size-6 text-primary" aria-hidden />
              <h3 className="font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center"><Button asChild size="lg" variant="secondary"><Link href="/voorbeeld">{dict.demo_try}</Link></Button></div>
      </section>

      {/* Signed-in users never see "/" (the proxy redirects them), so this is always the visitor form. */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-8">
        <NewsletterSignup signedIn={false} />
      </div>

      <footer className="mt-auto border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <Logo markClassName="size-5" className="[&>span:last-child]:text-base" />
          <p className="max-w-xl">{dict.landing_tmdb_attribution}</p>
          <nav className="flex gap-4">
            <Link href="/gids" className="hover:text-foreground hover:underline">
              {dict.landing_guides_link}
            </Link>
            <Link href="/feedback?from=/" className="hover:text-foreground hover:underline">
              {dict.feedback_footer_link}
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
