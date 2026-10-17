import Link from "next/link";
import { MailCheck } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Aangemeld voor de nieuwsbrief", robots: { index: false } };

/** Where Brevo's double opt-in link lands after confirming. Public
 * (middleware ALWAYS_ACCESSIBLE_PATHS). */
export default async function NewsletterConfirmedPage() {
  const dict = getDictionary(await getLocale());
  return (
    <div className="bg-cinema flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <Link href="/">
          <Logo markClassName="size-8" />
        </Link>
        <div className="flex size-16 items-center justify-center rounded-full bg-success/15 ring-1 ring-success/30">
          <MailCheck className="size-7 text-success" aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">{dict.newsletter_confirmed_title}</h1>
          <p className="text-muted-foreground">{dict.newsletter_confirmed_description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/register?ref=nieuwsbrief">{dict.newsletter_confirmed_cta}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{dict.newsletter_confirmed_home}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
