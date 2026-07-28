import { isCurrentUserAdmin } from "@/lib/require-admin";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";

/** Centralizes the "reachable via deep link, re-check every time" admin
 * gate for every /admin/* page — same reasoning as each Android admin
 * ViewModel's own load()-time check, just done once here instead of
 * repeating it in every page component. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    const dict = getDictionary(await getLocale());
    return <p className="mx-auto max-w-2xl text-sm text-destructive">{dict.pending_barcodes_error_not_admin}</p>;
  }
  return children;
}
