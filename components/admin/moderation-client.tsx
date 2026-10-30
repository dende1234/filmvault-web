"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { adminDeleteContent, setBlocked, type BlockedMember, type RecentComment, type RecentPost } from "@/actions/moderation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function useAct() {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    try {
      await fn();
      router.refresh();
    } catch {
      toast.error(t("admin_reports_error_action"));
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

/** Recent posts and comments from everyone, with delete and block. */
export function RecentContent({ posts, comments, locale }: { posts: RecentPost[]; comments: RecentComment[]; locale: string }) {
  const { t } = useT();
  const { busy, run } = useAct();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "short", timeStyle: "short" });
  const block = (authorId: string, name: string | null) =>
    run(`block-${authorId}`, () => setBlocked(authorId, true, window.prompt(t("moderation_block_reason")) ?? null), t("moderation_block_confirm", name ?? "?"));

  const row = (
    key: string,
    type: "post" | "comment",
    id: string,
    authorId: string,
    author: string | null,
    body: string,
    createdAt: string | null,
    href: string,
    extra?: string | null,
  ) => (
    <Card key={key}>
      <CardContent className="flex flex-col gap-2 pt-5 text-sm">
        <p className="text-xs text-muted-foreground">
          <Link href={`/admin/users/${authorId}`} className="font-medium text-foreground hover:underline">
            {author ?? t("friends_unnamed_user")}
          </Link>
          {createdAt && <> · {date.format(new Date(createdAt))}</>}
          {extra && <> · {extra}</>}
        </p>
        <p className="line-clamp-3 whitespace-pre-line">{body}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={href}>{t("admin_reports_view_button")}</Link>
          </Button>
          <Button size="sm" variant="destructive" disabled={busy === key} onClick={() => run(key, () => adminDeleteContent(type, id, body), t("moderation_delete_confirm"))}>
            <Trash2 />
            {t("action_delete")}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === `block-${authorId}`} onClick={() => block(authorId, author)}>
            <Ban />
            {t("moderation_block")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">{t("moderation_posts")}</h2>
        {posts.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin_user_none")}</p> : posts.map((p) => row(`p-${p.id}`, "post", p.id, p.author_id, p.author, [p.title, p.body].filter(Boolean).join(" — "), p.created_at, `/feed/${p.id}`, p.movie_title))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">{t("moderation_comments")}</h2>
        {comments.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin_user_none")}</p> : comments.map((c) => row(`c-${c.id}`, "comment", c.id, c.author_id, c.author, c.body, c.created_at, `/feed/${c.post_id}`))}
      </section>
    </div>
  );
}

export function BlockedList({ members, locale }: { members: BlockedMember[]; locale: string }) {
  const { t } = useT();
  const { busy, run } = useAct();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium" });
  if (members.length === 0) return <p className="text-sm text-muted-foreground">{t("moderation_blocked_none")}</p>;
  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => (
        <Card key={m.user_id}>
          <CardContent className="flex items-center justify-between gap-3 pt-5 text-sm">
            <div className="min-w-0">
              <Link href={`/admin/users/${m.user_id}`} className="font-medium hover:underline">
                {m.name || m.email || t("friends_unnamed_user")}
              </Link>
              <p className="text-xs text-muted-foreground">
                {date.format(new Date(m.blocked_at))}
                {m.reason && <> · {m.reason}</>}
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={busy === m.user_id} onClick={() => run(m.user_id, () => setBlocked(m.user_id, false))}>
              {t("moderation_unblock")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
