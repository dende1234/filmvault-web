import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GUIDES } from "@/lib/guides";
import { GuideShell } from "@/components/guide-shell";

export const metadata: Metadata = {
  title: "Gidsen voor filmverzamelaars",
  description: "Praktische gidsen over het bijhouden en organiseren van je dvd-, Blu-ray-, 4K UHD- en steelbook-collectie.",
  alternates: { canonical: "/gids" },
};

export default function GuidesIndexPage() {
  return (
    <GuideShell>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Gidsen</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Voor filmverzamelaars</h1>
        <p className="max-w-2xl text-muted-foreground">
          Praktische uitleg over het bijhouden, ordenen en bewaren van je fysieke filmcollectie.
        </p>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/gids/${guide.slug}`}
              className="group flex h-full flex-col gap-2 rounded-card border border-border/70 bg-card p-6 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h2 className="font-display text-xl font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary">
                {guide.title}
              </h2>
              <p className="text-sm text-muted-foreground">{guide.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
                Lees de gids <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </GuideShell>
  );
}
