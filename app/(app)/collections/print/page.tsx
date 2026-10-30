import { notFound, redirect } from "next/navigation";
import { getOrCreateProfile } from "@/actions/profile";
import { getOwnCopies } from "@/lib/collection-copies";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PrintCollection } from "@/components/print-collection";

export const metadata = { title: "Collectie-overzicht" };

/** A printable overview of your collection (e.g. for home insurance): the
 * browser's print dialog saves it as PDF. Only your own collections. */
export default async function PrintCollectionPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  const locale = await getLocale();
  const [result, profile] = await Promise.all([getOwnCopies(collection ?? null), getOrCreateProfile()]);
  if (result === null) redirect("/login");
  if (result === "not_found") notFound();
  return (
    <PrintCollection
      copies={result.copies}
      names={result.names}
      collection={collection ?? null}
      ownerName={profile?.name ?? profile?.email ?? null}
      dict={getDictionary(locale)}
      locale={locale}
    />
  );
}
