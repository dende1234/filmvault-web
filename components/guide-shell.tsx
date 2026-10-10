import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Public page frame for the /gids SEO pages: logo header with one CTA,
 * content, and the TMDB/privacy footer. */
export async function GuideShell({ children }: { children: React.ReactNode }) {
  const dict = getDictionary(await getLocale());
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" aria-label="Filmory">
            <Logo markClassName="size-7" />
          </Link>
          <Button asChild size="sm">
            <Link href="/register">{dict.landing_cta_register}</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-8 md:py-14">{children}</main>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground md:flex-row md:justify-between md:px-8">
          <p className="max-w-xl">{dict.landing_tmdb_attribution}</p>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            {dict.privacy_policy_link}
          </Link>
        </div>
      </footer>
    </div>
  );
}
