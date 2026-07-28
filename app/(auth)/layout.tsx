import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary(await getLocale());
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">{dict.app_name}</h1>
        </div>
        {children}
      </div>
      <Link href="/privacy" className="mt-8 text-xs text-muted-foreground hover:underline">
        {dict.privacy_policy_link}
      </Link>
    </div>
  );
}
