import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default async function NotFound() {
  const dict = getDictionary(await getLocale());
  return (
    <div className="bg-cinema flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="mb-6" />
      <p className="font-display text-7xl font-semibold tracking-tight text-primary md:text-8xl">404</p>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{dict.not_found_title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{dict.not_found_description}</p>
      <Button asChild className="mt-3">
        <Link href="/dashboard">{dict.not_found_back_button}</Link>
      </Button>
    </div>
  );
}
