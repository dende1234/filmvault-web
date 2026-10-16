"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bug, ImageIcon, Lightbulb, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, FEEDBACK_STATUS_VARIANT } from "@/lib/feedback";
import { getFeedbackScreenshotUrl, updateFeedback, type AdminFeedbackItem } from "@/actions/feedback";
import type { FeedbackKind, FeedbackStatus } from "@/types/database";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KIND_ICON: Record<FeedbackKind, typeof Bug> = { bug: Bug, idea: Lightbulb, other: MessageCircle };
const KIND_LABEL: Record<FeedbackKind, keyof Dictionary> = {
  bug: "feedback_kind_bug",
  idea: "feedback_kind_idea",
  other: "feedback_kind_other",
};
const statusLabel = (s: FeedbackStatus) => `feedback_status_${s}` as const;

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function FeedbackCard({ item }: { item: AdminFeedbackItem }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [reply, setReply] = useState(item.admin_reply ?? "");
  const [saving, setSaving] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const Icon = KIND_ICON[item.kind];
  const dirty = status !== item.status || reply.trim() !== (item.admin_reply ?? "");
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium", timeStyle: "short" });

  async function save() {
    setSaving(true);
    const result = await updateFeedback(item.id, { status, adminReply: reply });
    setSaving(false);
    if (result.error) toast.error(t("admin_feedback_error"));
    else {
      toast.success(t("admin_feedback_saved"));
      router.refresh();
    }
  }

  async function openScreenshot() {
    if (!item.screenshot_path) return;
    const url = await getFeedbackScreenshotUrl(item.screenshot_path);
    if (url) setShot(url);
    else toast.error(t("admin_feedback_error"));
  }

  const context: [keyof Dictionary, string | null][] = [
    ["admin_feedback_page", item.page],
    ["admin_feedback_device", item.user_agent],
    ["admin_feedback_viewport", item.viewport],
    ["admin_feedback_locale", item.locale],
    ["admin_feedback_version", item.app_version],
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-4 text-primary" aria-hidden />
          <span className="font-medium text-foreground">{t(KIND_LABEL[item.kind])}</span>
          <span>· {date.format(new Date(item.created_at))}</span>
          <span>·</span>
          {item.reporter ? (
            <Link href={`/u/${item.reporter.id}`} className="font-medium text-foreground hover:underline">
              {item.reporter.name || item.reporter.email || item.reporter.id.slice(0, 8)}
            </Link>
          ) : (
            <span>
              {t("admin_feedback_visitor")} ({item.contact_email ?? t("admin_feedback_no_email")})
            </span>
          )}
          <Badge variant={FEEDBACK_STATUS_VARIANT[item.status]} className="ml-auto">
            {t(statusLabel(item.status))}
          </Badge>
        </div>

        <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>

        <div className="flex flex-col gap-2">
          {item.screenshot_path && (
            <Button variant="secondary" size="sm" className="w-fit" onClick={openScreenshot}>
              <ImageIcon />
              {t("admin_feedback_open_screenshot")}
            </Button>
          )}
          <details className="rounded-lg border border-border bg-elevated/30 px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground">{t("admin_feedback_context")}</summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {context.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{t(label)}</dt>
                  <dd className="min-w-0 break-words font-mono">{value || "–"}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[180px_1fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`status-${item.id}`}>{t("admin_feedback_status_label")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
              <SelectTrigger id={`status-${item.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(statusLabel(s))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`reply-${item.id}`}>{t("admin_feedback_reply_label")}</Label>
            <Textarea id={`reply-${item.id}`} rows={2} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {t(item.user_id ? "admin_feedback_reply_hint" : "admin_feedback_reply_visitor_hint")}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {t("admin_feedback_save")}
          </Button>
        </div>
      </CardContent>

      <Dialog open={!!shot} onOpenChange={(open) => !open && setShot(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("admin_feedback_open_screenshot")}</DialogTitle>
          </DialogHeader>
          {shot && (
            // Signed URL to a private bucket: not an optimisable next/image source.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} alt="" className="max-h-[75vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function AdminFeedbackClient({
  items,
  status,
  kind,
}: {
  items: AdminFeedbackItem[];
  status: "open" | "all" | FeedbackStatus;
  kind: "all" | FeedbackKind;
}) {
  const { t } = useT();
  const href = (next: { status?: string; kind?: string }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const k = next.kind ?? kind;
    if (s !== "open") params.set("status", s);
    if (k !== "all") params.set("kind", k);
    const q = params.toString();
    return `/admin/feedback${q ? `?${q}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterChip href={href({ status: "open" })} active={status === "open"}>
            {t("admin_feedback_filter_open")}
          </FilterChip>
          {FEEDBACK_STATUSES.map((s) => (
            <FilterChip key={s} href={href({ status: s })} active={status === s}>
              {t(statusLabel(s))}
            </FilterChip>
          ))}
          <FilterChip href={href({ status: "all" })} active={status === "all"}>
            {t("admin_feedback_filter_all")}
          </FilterChip>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip href={href({ kind: "all" })} active={kind === "all"}>
            {t("admin_feedback_filter_all_kinds")}
          </FilterChip>
          {FEEDBACK_KINDS.map((k) => (
            <FilterChip key={k} href={href({ kind: k })} active={kind === k}>
              {t(KIND_LABEL[k])}
            </FilterChip>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin_feedback_empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            // Key on updated_at so the editor resets to saved values after a refresh.
            <FeedbackCard key={`${item.id}-${item.updated_at}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
