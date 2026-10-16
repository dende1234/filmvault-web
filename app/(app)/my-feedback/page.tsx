import { Bug, Inbox, Lightbulb, MessageCircle } from "lucide-react";
import { getMyFeedback } from "@/actions/feedback";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { FEEDBACK_STATUS_VARIANT } from "@/lib/feedback";
import type { FeedbackKind } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackButton } from "@/components/feedback-button";

export const metadata = { title: "Mijn meldingen" };

const KIND_ICON: Record<FeedbackKind, typeof Bug> = { bug: Bug, idea: Lightbulb, other: MessageCircle };
const KIND_LABEL: Record<FeedbackKind, keyof Dictionary> = {
  bug: "feedback_kind_bug",
  idea: "feedback_kind_idea",
  other: "feedback_kind_other",
};

export default async function MyFeedbackPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const items = await getMyFeedback();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium" });

  const newButton = <FeedbackButton />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={dict.feedback_my_title} description={dict.feedback_my_description} actions={items?.length ? newButton : undefined} />

      {items === null ? (
        <p className="text-sm text-muted-foreground">{dict.feedback_error_unavailable}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title={dict.feedback_my_empty_title} description={dict.feedback_my_empty_description} action={newButton} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-4 text-primary" aria-hidden />
                    <span className="font-medium text-foreground">{dict[KIND_LABEL[item.kind]]}</span>
                    <span>· {date.format(new Date(item.created_at))}</span>
                    <Badge variant={FEEDBACK_STATUS_VARIANT[item.status]} className="ml-auto">
                      {dict[`feedback_status_${item.status}`]}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
                  {item.admin_reply && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-primary">{dict.feedback_reply_label}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.admin_reply}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
