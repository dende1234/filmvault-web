import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const dict = getDictionary(await getLocale());
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold">{dict.not_found_title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{dict.not_found_description}</p>
      <Button asChild className="mt-3">
        <Link href="/dashboard">{dict.not_found_back_button}</Link>
      </Button>
    </div>
  );
}
