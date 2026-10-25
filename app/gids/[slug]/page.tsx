import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GUIDES, GUIDE_UI, getGuide } from "@/lib/guides";
import { GuideShell } from "@/components/guide-shell";
import { Button } from "@/components/ui/button";
import { NewsletterSignup } from "@/components/newsletter-signup";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `/gids/${guide.slug}`,
      // hreflang: the same guide in the other language.
      ...(guide.alternate
        ? { languages: { [guide.lang]: `/gids/${guide.slug}`, [guide.lang === "nl" ? "en" : "nl"]: `/gids/${guide.alternate}` } }
        : {}),
    },
    openGraph: { title: guide.title, description: guide.description, type: "article", locale: guide.lang === "en" ? "en_US" : "nl_NL" },
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const ui = GUIDE_UI[guide.lang];
  const others = GUIDES.filter((g) => g.slug !== guide.slug && g.lang === guide.lang);

  return (
    <GuideShell>
      <Link href="/gids" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {ui.all}
      </Link>
      <article className="mt-6 max-w-2xl" lang={guide.lang}>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">{guide.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{guide.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {ui.updated}{" "}
          {new Date(guide.updated).toLocaleDateString(guide.lang === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "long", year: "numeric" })}
          {guide.alternate && (
            <>
              {" · "}
              <Link href={`/gids/${guide.alternate}`} lang={guide.lang === "nl" ? "en" : "nl"} className="text-primary hover:underline">
                {ui.otherLang}
              </Link>
            </>
          )}
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {guide.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={i} className="leading-relaxed text-foreground/90">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-foreground/90 marker:text-primary">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>

      <aside className="bg-cinema mt-14 flex max-w-2xl flex-col items-start gap-3 rounded-card border border-primary/30 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{ui.ctaTitle}</h2>
        <p className="text-sm text-muted-foreground">{ui.ctaText}</p>
        <Button asChild className="mt-2">
          <Link href={`/register?ref=gids-${guide.slug}`}>{ui.ctaButton}</Link>
        </Button>
      </aside>

      {/* Guides are static pages, so no session check: members who sign up here
          just get Brevo's confirmation mail like anyone else. */}
      <NewsletterSignup signedIn={false} className="mt-8 max-w-2xl" />

      {others.length > 0 && (
        <nav className="mt-14 max-w-2xl" aria-label={ui.more}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ui.more}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/gids/${g.slug}`} className="font-medium text-primary hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </GuideShell>
  );
}
