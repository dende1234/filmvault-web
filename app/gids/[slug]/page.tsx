import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GUIDES, getGuide } from "@/lib/guides";
import { GuideShell } from "@/components/guide-shell";
import { Button } from "@/components/ui/button";

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
    alternates: { canonical: `/gids/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, type: "article" },
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <GuideShell>
      <Link href="/gids" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Alle gidsen
      </Link>
      <article className="mt-6 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">{guide.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{guide.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Bijgewerkt op {new Date(guide.updated).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
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
        <h2 className="font-display text-2xl font-semibold tracking-tight">Houd je collectie bij in Filmory</h2>
        <p className="text-sm text-muted-foreground">
          Gratis. Voeg films toe op titel of barcode, leg formaat en editie vast en houd je verlanglijst bij.
        </p>
        <Button asChild className="mt-2">
          <Link href={`/register?ref=gids-${guide.slug}`}>Gratis beginnen</Link>
        </Button>
      </aside>

      {others.length > 0 && (
        <nav className="mt-14 max-w-2xl" aria-label="Meer gidsen">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meer gidsen</h2>
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
