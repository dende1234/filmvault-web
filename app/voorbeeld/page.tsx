import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { CollectionDemo } from "@/components/collection-demo";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  const dict = getDictionary(await getLocale());
  return { title: dict.demo_page_title, description: dict.demo_page_description, alternates: { canonical: "/voorbeeld" } };
}

export default async function ExamplePage() {
  const dict = getDictionary(await getLocale());
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-6 md:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="Filmory"><Logo markClassName="size-7" /></Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 flex-col gap-7 py-6">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-5xl">{dict.demo_page_title}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{dict.demo_page_description}</p>
        </div>
        <CollectionDemo />
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href="/register?ref=voorbeeld">{dict.landing_cta_register}</Link></Button>
          <Button asChild variant="ghost"><Link href="/">{dict.demo_back}</Link></Button>
        </div>
      </main>
      <footer className="text-xs text-muted-foreground">{dict.landing_tmdb_attribution}</footer>
    </div>
  );
}
