import Link from "next/link";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import packageJson from "@/package.json";
import { LogoMark } from "@/components/brand/logo";

export default async function AboutPage() {
  const dict = getDictionary(await getLocale());
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-8 text-center">
      <LogoMark className="mb-2 size-16" />
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Film<span className="text-primary">ory</span>
      </h1>
      <p className="text-sm text-muted-foreground">{format(dict.about_version, packageJson.version)}</p>
      <p className="mt-4 text-sm font-medium">{dict.about_powered_by_tmdb}</p>
      <p className="text-sm text-muted-foreground">{dict.about_tmdb_usage_note}</p>
      {/* Legally required exact wording (TMDB terms of use, section 3) — must NOT be translated, ever. */}
      <p className="mt-4 text-xs text-muted-foreground">{dict.about_tmdb_attribution}</p>
      <Link href="/privacy" className="mt-6 text-sm text-primary hover:underline">
        {dict.privacy_policy_link}
      </Link>
    </div>
  );
}
