import { redirect } from "next/navigation";

/** Moved into /scannen; kept for bookmarks and older links. */
export default async function BulkScanPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  redirect(`/scannen?modus=meerdere${collection ? `&collection=${encodeURIComponent(collection)}` : ""}`);
}
