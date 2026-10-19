import Link from "next/link";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { getNotifications } from "@/actions/notifications";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { titleHref } from "@/lib/titles";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Meldingen" };

/** Your notifications, newest first. Unread ones are highlighted; showing
 * the page marks them read (client-side, so the menu badge refreshes). */
export default async function NotificationsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const items = await getNotifications();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={dict.notifications_title} description={dict.notifications_description} />
      {items.some((n) => !n.read_at) && <MarkNotificationsRead />}
      {items.length === 0 ? (
        <EmptyState icon={Bell} title={dict.notifications_empty_title} description={dict.notifications_empty_description} />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const approved = n.kind === "barcode_approved";
            const Icon = approved ? CheckCircle2 : XCircle;
            const title = n.payload.title ?? n.payload.barcode ?? "";
            const firstCollection = n.payload.collectionIds?.[0];
            const href = approved
              ? firstCollection
                ? n.payload.isBox && n.payload.boxGroupId
                  ? `/collections/${firstCollection}/boxes/${n.payload.boxGroupId}`
                  : `/collections/${firstCollection}`
                : n.payload.tmdbMovieId
                  ? titleHref(n.payload.tmdbMovieId)
                  : null
              : null;
            const body = (
              <CardContent className="flex items-start gap-3 pt-5">
                <Icon className={cn("mt-0.5 size-5 shrink-0", approved ? "text-success" : "text-muted-foreground")} aria-hidden />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm">
                    {format(approved ? dict.notifications_barcode_approved : dict.notifications_barcode_rejected, title)}
                  </p>
                  {approved && <p className="text-xs text-muted-foreground">{dict.notifications_barcode_thanks}</p>}
                  <p className="text-xs text-muted-foreground">
                    {n.payload.barcode && <span className="font-mono">{n.payload.barcode}</span>}
                    {n.payload.barcode && " · "}
                    {date.format(new Date(n.created_at))}
                  </p>
                </div>
              </CardContent>
            );
            return (
              <li key={n.id}>
                <Card className={cn(!n.read_at && "border-primary/40 bg-primary/5")}>
                  {href ? (
                    <Link href={href} className="block rounded-card hover:bg-elevated/40">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
