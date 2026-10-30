import Link from "next/link";
import { loadPendingBarcodeCards } from "@/lib/admin/pending-cards";
import { requireAdmin } from "@/lib/require-admin";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { AdminPendingBarcodesClient } from "@/components/admin/admin-pending-barcodes-client";
import { RejectedBarcodesList } from "@/components/admin/rejected-barcodes-list";

/** The approval queue, and a "Afgewezen" tab to restore a rejection made by mistake. */
export default async function AdminPendingBarcodesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const [{ tab }, locale] = await Promise.all([searchParams, getLocale()]);
  const dict = getDictionary(locale);
  const rejected = tab === "rejected";
  const cards = await loadPendingBarcodeCards(rejected ? "rejected" : "pending");
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex gap-1 border-b border-border" role="tablist">
        {[
          { key: false, href: "/admin/pending-barcodes", label: dict.pending_tab_queue },
          { key: true, href: "/admin/pending-barcodes?tab=rejected", label: dict.pending_tab_rejected },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={rejected === t.key}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              rejected === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {rejected ? (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{dict.pending_tab_rejected}</h1>
          <RejectedBarcodesList cards={cards} />
        </div>
      ) : (
        <AdminPendingBarcodesClient cards={cards} />
      )}
    </div>
  );
}
