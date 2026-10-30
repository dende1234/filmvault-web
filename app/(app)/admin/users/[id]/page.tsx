import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminUserDetail } from "@/actions/admin";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { Bookmark, CheckCircle2, Clock, Film, LibraryBig, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/** One member at a glance: counts, submissions and feedback. */
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const detail = await getAdminUserDetail(id);
  if (!detail) notFound();
  const { profile, overview, submissions, feedback } = detail;
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/admin/users" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {dict.admin_users_label}
      </Link>
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.name} className="size-14" />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            {profile.name || dict.friends_unnamed_user}
            {profile.is_admin && <Badge variant="default">{dict.admin_users_admin_badge}</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.email}
            {profile.created_at && <> · {format(dict.admin_user_member_since, date.format(new Date(profile.created_at)))}</>}
          </p>
        </div>
      </div>

      {overview ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={LibraryBig} label={dict.collections_label} value={overview.collections} />
          <StatTile icon={Film} label={dict.admin_user_copies} value={overview.copies} />
          <StatTile icon={Bookmark} label={dict.nav_wishlist} value={overview.wishlist} />
          <StatTile icon={LibraryBig} label={dict.admin_user_public} value={overview.public_collections} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{dict.admin_user_overview_not_ready}</p>
      )}
      {overview?.last_added && <p className="-mt-3 text-xs text-muted-foreground">{format(dict.admin_user_last_added, date.format(new Date(overview.last_added)))}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{dict.admin_user_submissions}</CardTitle>
          <p className="flex flex-wrap gap-2 text-xs">
            <Badge variant="warning" className="gap-1"><Clock className="size-3" />{format(dict.admin_user_sub_pending, submissions.pending)}</Badge>
            <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" />{format(dict.admin_user_sub_approved, submissions.approved)}</Badge>
            <Badge variant="outline" className="gap-1"><XCircle className="size-3" />{format(dict.admin_user_sub_rejected, submissions.rejected)}</Badge>
          </p>
        </CardHeader>
        <CardContent>
          {submissions.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin_user_none}</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {submissions.recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{s.movie_title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.barcode}</span>
                  <Badge variant={s.status === "approved" ? "success" : s.status === "pending" ? "warning" : "outline"}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.admin_user_feedback}</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin_user_none}</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {feedback.map((f) => (
                <li key={f.id} className="flex flex-col gap-0.5">
                  <p className="line-clamp-3">{f.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.kind} · {f.status} · {date.format(new Date(f.created_at))}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/feedback" className="mt-3 inline-block text-xs text-primary hover:underline">
            {dict.admin_feedback_title}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
